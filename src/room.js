// Raum-Logik für eine Klasse: Qualifying (Zeitfahren) und Live-Duell.
// Diese Datei kennt weder Cloudflare noch Node. Der Server-Adapter
// (src/worker.js für Cloudflare, server/local.mjs für den Laptop)
// reicht Verbindungen und Speicher herein.

export const MAX_PLAYERS = 60;
export const TRACK_COUNT = 5;
export const CHAR_COUNT = 8;
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' -]{0,15}$/;

export function cleanName(first, initial) {
  first = String(first || '').trim().replace(/\s+/g, ' ');
  initial = String(initial || '').trim();
  if (!NAME_RE.test(first)) return null;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ]$/.test(initial)) return null;
  const cap = s => s.charAt(0).toLocaleUpperCase('de-DE') + s.slice(1);
  return cap(first) + ' ' + initial.toLocaleUpperCase('de-DE') + '.';
}
const int = (v, lo, hi, def) => {
  v = Number(v);
  return Number.isInteger(v) && v >= lo && v <= hi ? v : def;
};

// Rangfolge im Finale prüfen; wer zuerst im Ziel war (first), steht immer vorn
export function cleanOrder(order, n, first) {
  let o = Array.isArray(order) ? order.map(Number) : [];
  const ok = o.length === n && new Set(o).size === n && o.every(x => Number.isInteger(x) && x >= 0 && x < n);
  if (!ok) o = Array.from({ length: n }, (_, i) => i);
  if (first >= 0) o = [first].concat(o.filter(x => x !== first));
  return o;
}

export function freshState(code) {
  return {
    v: 1, code, teacherKey: null, created: 0, updated: 0,
    phase: 'setup', // setup | quali | duel-setup | duel | podium
    quali: { track: 0, laps: 2, char: -1 },
    players: {},
    order: [], // pids in Anmelde-Reihenfolge
    duel: null,
  };
}

export class RoomLogic {
  /**
   * @param {object} io  Adapter:
   *   io.load() -> Promise<state|null>
   *   io.save(state) -> Promise
   *   io.wipe() -> Promise
   *   io.conns() -> Array<{meta, send(obj), sendRaw(str), close(code, reason)}>
   *   io.setMeta(conn, meta)
   *   io.now() -> ms
   */
  constructor(io) { this.io = io; this.s = null; }

  async state(code) {
    if (!this.s) this.s = (await this.io.load()) || freshState(code);
    return this.s;
  }
  async persist() { this.s.updated = this.io.now(); await this.io.save(this.s); }

  // ---------- Verbindungen
  async open(conn, q) {
    const s = await this.state(q.code);
    const role = q.role === 'teacher' ? 'teacher' : 'player';
    if (role === 'teacher') {
      const key = String(q.key || '');
      if (key.length < 12 || key.length > 64) return this.reject(conn, 'bad-key');
      if (!s.teacherKey) { s.teacherKey = key; s.created = this.io.now(); await this.persist(); }
      else if (s.teacherKey !== key) return this.reject(conn, 'code-taken');
      this.io.setMeta(conn, { role: 'teacher' });
      this.sendTeacher(conn);
    } else {
      const pid = String(q.pid || '');
      if (!/^[a-z0-9]{8,24}$/.test(pid)) return this.reject(conn, 'bad-pid');
      if (!s.teacherKey) return this.reject(conn, 'no-room');
      this.io.setMeta(conn, { role: 'player', pid });
      conn.send(this.youMsg(pid));
      this.pushTeachers();
    }
  }
  reject(conn, why) {
    try { conn.send({ t: 'error', why }); conn.close(4001, why); } catch (e) {}
  }
  async close(conn) {
    const m = conn.meta || {};
    if (m.role !== 'player') return;
    await this.state();
    this.closing = conn.ws;
    try { this.pushTeachers(); } finally { this.closing = null; }
  }

  // ---------- Nachrichten
  async message(conn, raw) {
    if (typeof raw !== 'string' || raw.length > 4096) return;
    let msg; try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || typeof msg.t !== 'string') return;
    const m = conn.meta || {};
    const s = await this.state();
    if (msg.t === 'sync') { conn.send({ t: 'sync', c: msg.c, s: this.io.now() }); return; }

    // Live-Duell: Zustand und Ereignisse nur weiterreichen, nichts speichern
    if (msg.t === 'st' || msg.t === 'ev') {
      const d = s.duel; if (!d || s.phase !== 'duel' || m.role !== 'player') return;
      const slot = d.p.indexOf(m.pid); if (slot < 0) return;
      const out = JSON.stringify({ t: msg.t, slot, s: msg.s, e: msg.e });
      for (const c of this.io.conns()) {
        const cm = c.meta || {};
        if (c.ws === conn.ws) continue;
        if (cm.role === 'teacher' || (cm.role === 'player' && d.p.includes(cm.pid))) c.sendRaw(out);
      }
      return;
    }
    if (m.role === 'teacher') return this.teacherMsg(conn, msg, s);
    if (m.role === 'player') return this.playerMsg(conn, msg, s, m.pid);
  }

  async teacherMsg(conn, msg, s) {
    switch (msg.t) {
      case 'quali-open': {
        s.quali = { track: int(msg.track, 0, TRACK_COUNT - 1, 0), laps: int(msg.laps, 1, 5, 2), char: int(msg.char, -1, CHAR_COUNT - 1, -1) };
        if (msg.reset) { s.players = {}; s.order = []; }
        s.phase = 'quali'; s.duel = null;
        await this.persist(); this.pushAll(); return;
      }
      case 'phase': {
        if (msg.phase === 'setup' || msg.phase === 'quali') { s.phase = msg.phase; s.duel = null; await this.persist(); this.pushAll(); }
        return;
      }
      case 'kick': {
        const pid = String(msg.pid || ''); if (!s.players[pid]) return;
        delete s.players[pid]; s.order = s.order.filter(p => p !== pid);
        for (const c of this.io.conns()) if ((c.meta || {}).pid === pid) { c.send({ t: 'kicked' }); }
        await this.persist(); this.pushTeachers(); return;
      }
      case 'duel-setup': {
        if (!this.applyDuel(s, msg)) return conn.send({ t: 'error', why: 'duel-players' });
        s.phase = 'duel-setup';
        await this.persist(); this.pushAll(); return;
      }
      case 'duel-start': {
        if (s.phase !== 'duel-setup') return;
        // Die Lehrkraft schickt ihre aktuelle Auswahl mit: genau diese wird gefahren
        if (Array.isArray(msg.p) && !this.applyDuel(s, msg)) return conn.send({ t: 'error', why: 'duel-players' });
        const d = s.duel; if (!d) return;
        const on = this.online();
        if (!d.p.every(pid => on.has(pid))) return conn.send({ t: 'error', why: 'duel-offline' });
        d.state = 'running'; d.startAt = this.io.now() + 5500; d.fin = d.p.map(() => null); d.winner = -1; d.order = null;
        s.phase = 'duel';
        await this.persist(); this.pushAll(); return;
      }
      case 'duel-end': {
        const d = s.duel; if (!d || s.phase !== 'duel') return;
        // Die Lehrkraft schickt die Reihenfolge aus ihrer Ansicht mit
        const done = d.fin.findIndex(x => x != null);
        d.order = cleanOrder(msg.order, d.p.length, done >= 0 ? done : -1);
        d.winner = d.order[0]; d.state = 'done'; s.phase = 'podium';
        await this.persist(); this.pushAll(); return;
      }
      case 'wipe': {
        for (const c of this.io.conns()) { try { c.send({ t: 'ended' }); c.close(4000, 'ended'); } catch (e) {} }
        this.s = null; await this.io.wipe(); return;
      }
    }
  }

  // Finale für 2 bis 4 Fahrer. msg.p: Spieler in Startreihenfolge, msg.c: Figuren
  applyDuel(s, msg) {
    const p = Array.isArray(msg.p) ? msg.p.map(String) : [];
    if (p.length < 2 || p.length > 4 || new Set(p).size !== p.length || !p.every(pid => s.players[pid])) return false;
    const c = Array.isArray(msg.c) ? msg.c : [];
    s.duel = {
      p, n: p.length, names: p.map(pid => s.players[pid].name),
      chars: p.map((pid, i) => int(c[i], 0, CHAR_COUNT - 1, s.players[pid].char)),
      track: int(msg.track, 0, TRACK_COUNT - 1, 0), laps: int(msg.laps, 1, 5, 3),
      state: 'ready', startAt: 0, fin: p.map(() => null), winner: -1, order: null, round: (s.duel && s.duel.round || 0) + 1,
    };
    return true;
  }

  async playerMsg(conn, msg, s, pid) {
    switch (msg.t) {
      case 'join': {
        if (s.phase !== 'quali') return conn.send({ t: 'error', why: 'not-open' });
        const name = cleanName(msg.first, msg.initial);
        if (!name) return conn.send({ t: 'error', why: 'bad-name' });
        let p = s.players[pid];
        if (!p) {
          if (s.order.length >= MAX_PLAYERS) return conn.send({ t: 'error', why: 'full' });
          let shown = name, n = 2;
          const taken = new Set(Object.values(s.players).map(x => x.name));
          while (taken.has(shown)) shown = name + ' ' + (n++);
          const char = s.quali.char >= 0 ? s.quali.char : int(msg.char, 0, CHAR_COUNT - 1, 0);
          p = s.players[pid] = { name: shown, char, status: 'racing', total: null, laps: null, at: this.io.now() };
          s.order.push(pid);
        }
        await this.persist();
        conn.send(this.youMsg(pid)); this.pushTeachers(); return;
      }
      case 'result': {
        const p = s.players[pid]; if (!p) return conn.send({ t: 'error', why: 'unknown' });
        const total = Number(msg.total);
        if (!(total > 0 && total < 60 * 60 * 30)) return;
        if (p.total == null) {
          p.total = Math.round(total);
          p.laps = Array.isArray(msg.laps) ? msg.laps.slice(0, 5).map(x => Math.round(Number(x) || 0)) : null;
          p.status = 'done';
          await this.persist();
        }
        conn.send({ t: 'result-ok' });
        this.pushPlayers(); this.pushTeachers(); return;
      }
      case 'fin': {
        const d = s.duel; if (!d || s.phase !== 'duel') return;
        const slot = d.p.indexOf(pid); if (slot < 0 || d.fin[slot] != null) return;
        const time = Number(msg.time); if (!(time > 0)) return;
        // Wer zuerst im Ziel ist, gewinnt. Die übrigen Plätze meldet das Handy des Siegers aus seiner Sicht
        d.fin[slot] = Math.round(time);
        d.order = cleanOrder(msg.order, d.p.length, slot);
        d.winner = slot; d.state = 'done'; s.phase = 'podium';
        await this.persist(); this.pushAll(); return;
      }
    }
  }

  // ---------- Sicht auf den Raum
  online() {
    const set = new Set();
    for (const c of this.io.conns()) { const m = c.meta || {}; if (m.role === 'player' && c.ws !== this.closing) set.add(m.pid); }
    return set;
  }
  ranking() {
    const s = this.s;
    const done = s.order.filter(p => s.players[p] && s.players[p].total != null);
    done.sort((a, b) => s.players[a].total - s.players[b].total || s.players[a].at - s.players[b].at);
    return done;
  }
  roomMsg() {
    const s = this.s, on = this.online(), rank = this.ranking();
    const players = s.order.filter(p => s.players[p]).map(pid => {
      const p = s.players[pid];
      return { pid, name: p.name, char: p.char, status: p.status, total: p.total, laps: p.laps, online: on.has(pid), rank: rank.indexOf(pid) + 1 };
    });
    const d = s.duel;
    return {
      t: 'room', code: s.code, phase: s.phase, quali: s.quali, players, now: this.io.now(),
      duel: d ? { ...d, n: d.p.length, online: d.p.map(pid => on.has(pid)) } : null,
    };
  }
  youMsg(pid) {
    const s = this.s, p = s.players[pid] || null, d = s.duel;
    const rank = this.ranking(), r = rank.indexOf(pid);
    let duel = null;
    if (d && d.p.includes(pid) && (s.phase === 'duel-setup' || s.phase === 'duel' || s.phase === 'podium')) {
      const slot = d.p.indexOf(pid);
      duel = { slot, n: d.p.length, names: d.names, chars: d.chars, track: d.track, laps: d.laps, state: d.state, startAt: d.startAt, fin: d.fin, winner: d.winner, order: d.order, round: d.round };
    }
    return {
      t: 'you', phase: s.phase, quali: s.quali, now: this.io.now(),
      me: p ? { name: p.name, char: p.char, status: p.status, total: p.total, rank: r + 1, of: rank.length } : null,
      duel,
    };
  }
  sendTeacher(conn) { conn.send(this.roomMsg()); }
  pushTeachers() {
    if (!this.s) return;
    let msg = null;
    for (const c of this.io.conns()) if ((c.meta || {}).role === 'teacher') { msg = msg || this.roomMsg(); c.send(msg); }
  }
  pushPlayers() {
    if (!this.s) return;
    for (const c of this.io.conns()) { const m = c.meta || {}; if (m.role === 'player') c.send(this.youMsg(m.pid)); }
  }
  pushAll() { this.pushTeachers(); this.pushPlayers(); }
}

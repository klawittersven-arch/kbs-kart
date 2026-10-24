// Lehrkraft-Seite (Beamer): Qualifying einrichten, QR-Code, Zeitenliste, Finale, Siegerehrung.
(function () {
  'use strict';
  const KK = window.KK, U = window.KUtil, $ = s => document.querySelector(s);
  const viewEl = $('#view'), toastEl = $('#toast'), netdot = $('#netdot'), codeChip = $('#codeChip');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const T = KK.TRACKS, C = KK.CHARS;
  const lapsTxt = n => n + ' ' + (n === 1 ? 'Runde' : 'Runden');

  let sess = U.store('kbs.teacher');
  let net = null, room = null, screen = '', spect = null, podiumRound = 0, endTimer = 0;
  const setup = Object.assign({ track: 0, laps: 2, char: -1, reset: true }, U.store('kbs.teacher.setup') || {});

  // ---------------------------------------------------------------- Verbindung
  function newSession() {
    sess = { code: U.randomCode(5), key: U.randomId(24) };
    U.store('kbs.teacher', sess); room = null; screen = '';
    connect();
  }
  function connect() {
    if (net) net.close();
    codeChip.hidden = false; codeChip.textContent = 'Code ' + sess.code;
    net = window.KNet({
      code: sess.code, params: { role: 'teacher', key: sess.key },
      onMessage, onStatus: s => { netdot.dataset.s = s; if (s === 'offline' && net.stopped === 'code-taken') newSession(); },
    });
    net.open();
  }
  function onMessage(m) {
    switch (m.t) {
      case 'room': room = m; render(); break;
      case 'error':
        if (m.why === 'code-taken') newSession();
        else if (m.why === 'duel-offline') toast('Beide Handys müssen verbunden sein, bevor das Rennen startet.');
        else if (m.why === 'duel-players') toast('Bitte zwei verschiedene Fahrer wählen.');
        break;
      case 'st': case 'ev': KK.netIn(m); break;
      case 'ended': room = null; screen = ''; break;
    }
  }
  function send(obj) { if (!net.send(obj)) toast('Keine Verbindung zum Server. Es wird neu verbunden …'); }
  let toastT = 0;
  function toast(t) { toastEl.textContent = t; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => toastEl.hidden = true, 4200); }

  // ---------------------------------------------------------------- Bausteine
  function trackPicker(sel, onPick) {
    const wrap = document.createElement('div'); wrap.className = 'tracks'; wrap.setAttribute('role', 'radiogroup'); wrap.setAttribute('aria-label', 'Strecke');
    T.forEach((t, i) => {
      const b = document.createElement('button');
      b.className = 'trk' + (t.bonus ? ' bonus' : ''); b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(i === sel));
      const th = KK.TH[t.theme];
      b.appendChild(KK.drawMiniMap(KK.GEOM[i], 64, 4, th.curbA));
      const s = document.createElement('span'); s.innerHTML = `<b>${esc(t.name)}</b><small>${t.bonus ? 'Bonusstrecke · sehr schwer' : esc(t.sub)}</small>`;
      b.appendChild(s);
      b.onclick = () => { KK.AU.init(); wrap.querySelectorAll('.trk').forEach((x, j) => x.setAttribute('aria-checked', String(j === i))); onPick(i); };
      wrap.appendChild(b);
    });
    return wrap;
  }
  function portraitCanvas(ci, size) {
    const c = document.createElement('canvas'); c.width = 80; c.height = 80;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(KK.KSPR[ci][6], 0, 0);
    if (size) c.style.width = c.style.height = size;
    return c;
  }
  function charPicker(sel, withFree, onPick) {
    const wrap = document.createElement('div'); wrap.className = 'figs'; wrap.setAttribute('role', 'radiogroup'); wrap.setAttribute('aria-label', 'Spielfigur');
    const opts = (withFree ? [-1] : []).concat(C.map((_, i) => i));
    for (const i of opts) {
      const b = document.createElement('button'); b.className = 'fig'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(i === sel));
      if (i < 0) { b.classList.add('free'); b.innerHTML = '<span class="free-ico" aria-hidden="true">?</span><b>Freie Wahl</b>'; }
      else { b.appendChild(portraitCanvas(i)); const n = document.createElement('b'); n.textContent = C[i].name; b.appendChild(n); }
      b.onclick = () => { KK.AU.init(); wrap.querySelectorAll('.fig').forEach(x => x.setAttribute('aria-checked', 'false')); b.setAttribute('aria-checked', 'true'); onPick(i); };
      wrap.appendChild(b);
    }
    return wrap;
  }
  function stepper(val, min, max, onChange) {
    const w = document.createElement('div'); w.className = 'stepper';
    w.innerHTML = `<button aria-label="Weniger">−</button><output>${lapsTxt(val)}</output><button aria-label="Mehr">+</button>`;
    const [minus, out, plus] = w.children;
    const set = v => { val = Math.max(min, Math.min(max, v)); out.textContent = lapsTxt(val); minus.disabled = val <= min; plus.disabled = val >= max; onChange(val); };
    minus.onclick = () => set(val - 1); plus.onclick = () => set(val + 1);
    minus.disabled = val <= min; plus.disabled = val >= max;
    return w;
  }
  function stopSpectate() {
    if (!spect) return;
    KK.H.render = null; KK.H.tick = null; KK.R = null; KK.MUS.stop(); KK.setScreen('idle');
    spect = null;
  }

  // ---------------------------------------------------------------- Ansichten
  function render() {
    if (!room) return;
    codeChip.textContent = 'Code ' + room.code;
    const ph = room.phase;
    if (ph !== 'duel') { clearTimeout(endTimer); endTimer = 0; }
    if (ph === 'setup') { stopSpectate(); if (screen !== 'setup') renderSetup(); else updateSetupCount(); }
    else if (ph === 'quali') { stopSpectate(); if (screen !== 'quali') renderQuali(); else updateQuali(); }
    else if (ph === 'duel-setup') { stopSpectate(); if (screen !== 'duel-setup') renderDuelSetup(); else updateDuelSetup(); }
    else if (ph === 'duel') { if (!spect || spect.round !== room.duel.round) startSpectate(); else updateSpectate(); }
    else if (ph === 'podium') { stopSpectate(); if (screen !== 'podium' || podiumRound !== room.duel.round) renderPodium(); }
  }

  // ---------- 1. Qualifying einrichten
  function renderSetup() {
    screen = 'setup';
    viewEl.innerHTML = `<div class="tpage setup">
      <div class="thead"><h2>Qualifying einrichten</h2><p>Die SuS fahren allein gegen die Uhr, jede auf dem eigenen Handy. Die Gesamtzeit erscheint hier am Beamer.</p></div>
      <div class="tsec"><h3>Strecke</h3><div id="slotTracks"></div></div>
      <div class="tgrid2">
        <div class="tsec"><h3>Rundenzahl</h3><div id="slotLaps"></div></div>
        <div class="tsec"><h3>Spielfigur</h3><div id="slotFigs"></div></div>
      </div>
      <div class="tactions">
        <label class="check" id="resetRow" hidden><input type="checkbox" id="chkReset" checked> Bisherige Anmeldungen und Zeiten löschen (<span id="nPlayers">0</span>)</label>
        <button class="big-btn" id="btnOpen">Qualifying starten und QR-Code zeigen</button>
      </div></div>`;
    $('#slotTracks').appendChild(trackPicker(setup.track, i => { setup.track = i; saveSetup(); }));
    $('#slotLaps').appendChild(stepper(setup.laps, 1, 5, v => { setup.laps = v; saveSetup(); }));
    $('#slotFigs').appendChild(charPicker(setup.char, true, i => { setup.char = i; saveSetup(); }));
    updateSetupCount();
    $('#btnOpen').onclick = () => {
      KK.AU.init();
      const reset = room.players.length ? $('#chkReset').checked : true;
      send({ t: 'quali-open', track: setup.track, laps: setup.laps, char: setup.char, reset });
    };
  }
  function saveSetup() { U.store('kbs.teacher.setup', setup); }
  function updateSetupCount() {
    const n = room.players.length;
    $('#resetRow').hidden = !n; $('#nPlayers').textContent = n === 1 ? '1 Person' : n + ' Personen';
  }

  // ---------- 2. Qualifying läuft
  function joinUrl() { return location.origin + '/mitspielen#' + room.code; }
  function drawQR(canvas, text) {
    const qr = window.qrcode(0, 'M'); qr.addData(text); qr.make();
    const n = qr.getModuleCount(), q = 3, px = 8, size = (n + q * 2) * px;
    canvas.width = canvas.height = size;
    const g = canvas.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, size, size);
    g.fillStyle = '#0d1030';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) g.fillRect((c + q) * px, (r + q) * px, px, px);
  }
  function renderQuali() {
    screen = 'quali';
    const q = room.quali, host = location.host;
    viewEl.innerHTML = `<div class="tpage quali">
      <div class="joinbox">
        <p class="eyebrow">Qualifying · ${esc(T[q.track].name)} · ${lapsTxt(q.laps)}</p>
        <h2>Scanne den Code und fahr deine Bestzeit</h2>
        <canvas id="qr" class="qr" role="img" aria-label="QR-Code zum Mitspielen"></canvas>
        <p class="joinurl">Ohne Kamera: <b>${esc(host)}/mitspielen</b> öffnen und den Code <b class="code">${esc(room.code)}</b> eingeben.</p>
        <p class="qmeta">${q.char >= 0 ? 'Alle fahren mit ' + esc(C[q.char].name) : 'Spielfigur frei wählbar'} · Zeitfahren mit 3× Turbo</p>
      </div>
      <div class="board">
        <div class="board-head"><h2>Zeiten</h2><span id="counts"></span></div>
        <ol class="ranking" id="ranking"></ol>
        <div class="tactions">
          <button class="ghost-btn" id="btnSettings">Einstellungen ändern</button>
          <button class="big-btn" id="btnFinal">Finale einrichten</button>
        </div>
      </div></div>`;
    drawQR($('#qr'), joinUrl());
    $('#btnSettings').onclick = () => send({ t: 'phase', phase: 'setup' });
    $('#btnFinal').onclick = openDuelSetup;
    updateQuali();
  }
  function sortedPlayers() {
    const done = room.players.filter(p => p.total != null).sort((a, b) => a.total - b.total);
    const rest = room.players.filter(p => p.total == null);
    return done.concat(rest);
  }
  function updateQuali() {
    const list = sortedPlayers(), done = list.filter(p => p.total != null).length;
    $('#counts').textContent = `${list.length} angemeldet · ${done} im Ziel`;
    const ol = $('#ranking');
    ol.classList.toggle('many', list.length > 12);
    if (!list.length) { ol.innerHTML = '<li class="empty">Noch niemand angemeldet. Sobald jemand den QR-Code scannt und einen Namen eingibt, erscheint er hier.</li>'; return; }
    ol.innerHTML = list.map((p, i) => {
      const fin = p.total != null;
      return `<li class="${fin && i < 2 ? 'top top' + (i + 1) : ''}${fin ? '' : ' running'}" data-pid="${esc(p.pid)}">
        <span class="rk">${fin ? i + 1 + '.' : ''}</span><canvas width="80" height="80" data-c="${p.char}"></canvas>
        <span class="nm">${esc(p.name)}</span><span class="tm">${fin ? KK.fmt(p.total) : 'fährt …'}</span>
        <button class="kick" title="${esc(p.name)} entfernen" aria-label="${esc(p.name)} entfernen">×</button></li>`;
    }).join('');
    ol.querySelectorAll('canvas[data-c]').forEach(c => { const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(KK.KSPR[+c.dataset.c][6], 0, 0); });
    ol.querySelectorAll('.kick').forEach(b => b.onclick = () => { const li = b.closest('li'); confirmKick(li.dataset.pid, li.querySelector('.nm').textContent); });
  }
  function confirmKick(pid, name) {
    toastEl.innerHTML = `${esc(name)} aus der Liste entfernen? <button class="mini" id="kYes">Entfernen</button> <button class="mini ghost" id="kNo">Abbrechen</button>`;
    toastEl.hidden = false; clearTimeout(toastT);
    $('#kYes').onclick = () => { send({ t: 'kick', pid }); toastEl.hidden = true; };
    $('#kNo').onclick = () => { toastEl.hidden = true; };
  }

  // ---------- 3. Finale einrichten
  let duelForm = null;
  function openDuelSetup() {
    const fin = room.players.filter(p => p.total != null).sort((a, b) => a.total - b.total);
    const pool = fin.length >= 2 ? fin : fin.concat(room.players.filter(p => p.total == null));
    if (pool.length < 2) return toast('Für ein Finale braucht es mindestens zwei angemeldete SuS.');
    const a = pool[0], b = pool[1];
    duelForm = { a: a.pid, b: b.pid, ca: a.char, cb: b.char, track: room.quali.track, laps: 3 };
    send({ t: 'duel-setup', ...duelForm });
  }
  function renderDuelSetup() {
    screen = 'duel-setup';
    const d = room.duel;
    duelForm = { a: d.p[0], b: d.p[1], ca: d.chars[0], cb: d.chars[1], track: d.track, laps: d.laps };
    const opts = sel => sortedPlayers().map(p => `<option value="${esc(p.pid)}" ${p.pid === sel ? 'selected' : ''}>${esc(p.name)}${p.total != null ? ' · ' + KK.fmt(p.total) : ''}</option>`).join('');
    viewEl.innerHTML = `<div class="tpage duelsetup">
      <div class="thead"><h2>Finale einrichten</h2><p>Die zwei Schnellsten sind vorausgewählt. Alle anderen Handys wurden getrennt.</p></div>
      <div class="duo">
        ${[0, 1].map(s => `<div class="slot" data-s="${s}">
          <h3>Fahrer ${s + 1}</h3>
          <select id="selP${s}" aria-label="Fahrer ${s + 1}">${opts(d.p[s])}</select>
          <p class="online" id="on${s}"></p>
          <div id="figs${s}"></div></div>`).join('<div class="vs" aria-hidden="true">VS</div>')}
      </div>
      <div class="tsec"><h3>Strecke</h3><div id="slotTracks"></div></div>
      <div class="tsec"><h3>Rundenzahl</h3><div id="slotLaps"></div></div>
      <div class="tactions">
        <button class="ghost-btn" id="btnBackQ">Zurück zum Qualifying</button>
        <span class="hint" id="startHint"></span>
        <button class="big-btn" id="btnStart">Rennen starten</button>
      </div></div>`;
    const apply = () => send({ t: 'duel-setup', ...duelForm });
    [0, 1].forEach(s => {
      $('#figs' + s).appendChild(charPicker(s ? duelForm.cb : duelForm.ca, false, i => { if (s) duelForm.cb = i; else duelForm.ca = i; apply(); }));
      $('#selP' + s).onchange = e => {
        const pid = e.target.value, p = room.players.find(x => x.pid === pid);
        if (s) { duelForm.b = pid; if (p) duelForm.cb = p.char; } else { duelForm.a = pid; if (p) duelForm.ca = p.char; }
        if (duelForm.a === duelForm.b) return toast('Bitte zwei verschiedene Fahrer wählen.');
        screen = ''; apply();
      };
    });
    $('#slotTracks').appendChild(trackPicker(duelForm.track, i => { duelForm.track = i; apply(); }));
    $('#slotLaps').appendChild(stepper(duelForm.laps, 1, 5, v => { duelForm.laps = v; apply(); }));
    $('#btnBackQ').onclick = () => send({ t: 'phase', phase: 'quali' });
    $('#btnStart').onclick = () => { KK.AU.init(); send({ t: 'duel-start' }); };
    updateDuelSetup();
  }
  function updateDuelSetup() {
    const d = room.duel; if (!d) return;
    [0, 1].forEach(s => {
      const el = $('#on' + s); if (!el) return;
      el.className = 'online ' + (d.online[s] ? 'yes' : 'no');
      el.textContent = d.online[s] ? 'Handy verbunden' : 'Handy nicht verbunden: Seite neu öffnen oder QR-Code scannen';
    });
    const ok = d.online[0] && d.online[1];
    const b = $('#btnStart'); if (b) b.disabled = !ok;
    const h = $('#startHint'); if (h) h.textContent = ok ? 'Beide bereit.' : 'Warte, bis beide Handys verbunden sind.';
  }

  // ---------- 4. Live-Duell am Beamer (Splitscreen)
  function startSpectate() {
    stopSpectate();
    screen = 'duel';
    const d = room.duel;
    viewEl.innerHTML = `<div class="tpage spectate">
      <div class="split">
        ${[0, 1].map(s => `<div class="sv">
          <div class="svbar"><span class="svname">${esc(d.names[s])}</span><span class="svlap" id="lap${s}"></span><span class="svpos" id="pos${s}"></span></div>
          <div class="svstage"><canvas id="cv${s}" width="480" height="320"></canvas><div class="svfin" id="fin${s}" hidden></div></div></div>`).join('')}
      </div>
      <div class="specfoot"><span class="eyebrow">Finale · ${esc(T[d.track].name)} · ${lapsTxt(d.laps)}</span><span class="hint" id="endHint"></span><button class="ghost-btn" id="btnEnd">Rennen beenden</button></div></div>`;
    const R = KK.startNet({ mode: 'duel', track: d.track, laps: d.laps, cc: 150, grid: d.chars.slice(), localSlot: -1, names: d.names.slice(), noPause: true, tags: true, alwaysTick: true });
    const ms = d.startAt - net.serverNow();
    R.cd = Math.max(30, Math.min(420, Math.round(ms / (1000 / 60))));
    const views = [0, 1].map(s => { const v = KK.makeView($('#cv' + s)); v.cam.tgt = R.karts[s]; v.cam.a = R.karts[s].a; return v; });
    spect = { round: d.round, views };
    KK.H.render = () => { if (KK.R) { KK.renderView(views[0]); KK.renderView(views[1]); } };
    let n = 0;
    KK.H.tick = () => { if (++n % 8) return; const R2 = KK.R; if (!R2) return; [0, 1].forEach(s => { const k = R2.karts[s]; $('#lap' + s).textContent = 'Runde ' + Math.max(1, Math.min(R2.laps, k.lap)) + '/' + R2.laps; $('#pos' + s).textContent = k.place + '.'; }); };
    $('#btnEnd').onclick = () => endDuel();
    updateSpectate();
  }
  function leader() { const R = KK.R; if (!R) return -1; return R.karts[0].place <= R.karts[1].place ? 0 : 1; }
  function endDuel() { send({ t: 'duel-end', winner: leader() }); }
  function updateSpectate() {
    const d = room.duel; if (!d) return;
    [0, 1].forEach(s => { const el = $('#fin' + s); if (el && d.fin[s] != null) { el.hidden = false; el.textContent = 'Ziel · ' + KK.fmt(d.fin[s]); } });
    const one = (d.fin[0] != null) !== (d.fin[1] != null);
    if (one && !endTimer) {
      let left = 25;
      const tickDown = () => {
        const h = $('#endHint'); if (h) h.textContent = 'Rennen endet automatisch in ' + left + ' s';
        if (left-- <= 0) { endTimer = 0; endDuel(); return; }
        endTimer = setTimeout(tickDown, 1000);
      };
      tickDown();
    }
  }

  // ---------- 5. Siegerehrung
  function renderPodium() {
    screen = 'podium';
    const d = room.duel; podiumRound = d.round;
    const w = d.winner, l = 1 - w;
    if (w < 0) {
      viewEl.innerHTML = `<div class="tpage tpodium"><div class="thead"><h2>Rennen beendet</h2><p>Es wurde kein Sieger ermittelt.</p></div>${podiumActions()}</div>`;
      bindPodium(); return;
    }
    viewEl.innerHTML = `<div class="tpage tpodium">
      <canvas id="winCv" class="wincv" width="360" height="200" role="img" aria-label="${esc(d.names[w])} mit Pokal"></canvas>
      <div class="winner">
        <p class="eyebrow">Sieger des Finales · ${esc(T[d.track].name)}</p>
        <h2 class="wname">${esc(d.names[w])}</h2>
        <p class="wmeta">${d.fin[w] != null ? 'Zeit ' + KK.fmt(d.fin[w]) : ''}${d.fin[l] != null ? ' · vor ' + esc(d.names[l]) + ' (' + KK.fmt(d.fin[l]) + ')' : ' · vor ' + esc(d.names[l])}</p>
      </div>
      ${podiumActions()}</div>`;
    winnerScene($('#winCv'), d.chars[w]);
    bindPodium();
    KK.AU.init(); KK.SFX.finish(); KK.MUS.play(4);
  }
  function podiumActions() {
    return `<div class="tactions center"><button class="big-btn" id="btnRematch">Revanche</button><button class="ghost-btn" id="btnNewFinal">Anderes Finale</button><button class="ghost-btn" id="btnBackQ2">Zurück zum Qualifying</button></div>`;
  }
  function bindPodium() {
    const d = room.duel;
    $('#btnRematch').onclick = () => send({ t: 'duel-setup', a: d.p[0], b: d.p[1], ca: d.chars[0], cb: d.chars[1], track: d.track, laps: d.laps });
    $('#btnNewFinal').onclick = () => { KK.MUS.stop(); send({ t: 'duel-setup', a: d.p[0], b: d.p[1], ca: d.chars[0], cb: d.chars[1], track: d.track, laps: d.laps }); };
    $('#btnBackQ2').onclick = () => { KK.MUS.stop(); send({ t: 'phase', phase: 'quali' }); };
  }
  function winnerScene(cv, ci) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height; g.imageSmoothingEnabled = false;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const conf = Array.from({ length: 70 }, () => ({ x: rnd() * W, y: rnd() * H, v: 16 + rnd() * 26, ph: rnd() * 6.28, c: ['#ffb238', '#ff4d6a', '#4fe0b5', '#5ec8ff', '#ffffff', '#ffd23f'][(rnd() * 6) | 0] }));
    const t0 = performance.now();
    const base = 170, scale = 2;
    function draw(t) {
      g.clearRect(0, 0, W, H);
      const gr = g.createRadialGradient(W / 2, 70, 6, W / 2, 90, 190); gr.addColorStop(0, 'rgba(255,214,130,.35)'); gr.addColorStop(1, 'rgba(255,214,130,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // Siegersockel
      g.fillStyle = '#141022'; g.fillRect(W / 2 - 101, base - 1, 202, H - base + 1);
      g.fillStyle = '#ffc233'; g.fillRect(W / 2 - 100, base + 5, 200, H - base - 5);
      g.fillStyle = '#ffe58a'; g.fillRect(W / 2 - 100, base, 200, 5);
      g.fillStyle = '#d99a1a'; g.fillRect(W / 2 + 96, base + 5, 4, H - base - 5);
      // Pokal
      g.drawImage(KK.TROPHY, W / 2 + 52, base + 3 - 45 * 1.3 | 0, 40 * 1.3 | 0, 46 * 1.3 | 0);
      // Kart dreht sich langsam
      const ang = reduce ? 8 : Math.floor(t * 4) % KK.ANG;
      const spr = KK.KSPR[ci][ang], b = KK.sprBounds(spr);
      let hop = 0; if (!reduce) { const ph = t % 1.6; if (ph < .36) hop = -Math.round(Math.sin(Math.PI * ph / .36) * 10); }
      g.fillStyle = 'rgba(20,16,34,.35)'; g.beginPath(); g.ellipse(W / 2 - 20, base + 3, 40, 4, 0, 0, 6.283); g.fill();
      g.drawImage(spr, Math.round(W / 2 - 20 - (b.x0 + b.x1) / 2 * scale), Math.round(base + 3 - b.y1 * scale + hop), 80 * scale, 80 * scale);
      for (const c of conf) { const y = ((c.y + c.v * t) % (H + 10)) - 10, x = Math.round(c.x + Math.sin(t * 2 + c.ph) * 4); g.fillStyle = c.c; if (Math.sin(t * 6 + c.ph) > 0) g.fillRect(x, Math.round(y), 3, 2); else g.fillRect(x, Math.round(y), 2, 3); }
    }
    function loop(now) { if (!cv.isConnected) return; draw((now - t0) / 1000); requestAnimationFrame(loop); }
    if (reduce) draw(0); else requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- Sitzung
  const dlg = $('#dlg');
  $('#btnSess').onclick = () => { $('#dlgCode').textContent = sess.code; dlg.hidden = false; $('#btnDlgClose').focus(); };
  $('#btnDlgClose').onclick = () => { dlg.hidden = true; };
  $('#btnNewSess').onclick = () => { dlg.hidden = true; stopSpectate(); newSession(); };
  $('#btnWipe').onclick = () => {
    dlg.hidden = true; stopSpectate();
    if (net) net.send({ t: 'wipe' });
    setTimeout(() => { U.store('kbs.teacher', null); newSession(); toast('Die Sitzung wurde beendet und alle Daten gelöscht.'); }, 400);
  };
  addEventListener('keydown', e => { if (e.key === 'Escape' && !dlg.hidden) dlg.hidden = true; });
  $('#btnFullT').onclick = () => {
    try { if (document.fullscreenElement) document.exitFullscreen(); else { const p = document.documentElement.requestFullscreen(); if (p && p.catch) p.catch(() => {}); } } catch (e) {}
  };
  document.addEventListener('pointerdown', () => KK.AU.init(), { once: true });

  if (sess && /^[A-Z0-9]{5}$/.test(sess.code) && sess.key) connect(); else newSession();
  window.__teacher = { get room() { return room; }, get net() { return net; }, get screen() { return screen; } };
})();

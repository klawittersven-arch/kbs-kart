// Handy-Seite der SuS: Anmelden, Qualifying fahren, Zeit senden, ggf. Finale fahren.
(function () {
  'use strict';
  const KK = window.KK, U = window.KUtil, $ = s => document.querySelector(s);
  const panel = $('#panel'), consoleEl = $('#console'), netdot = $('#netdot'), raceNote = $('#raceNote');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' -]{0,15}$/;
  const INIT_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ]$/;

  let code = decodeURIComponent((location.hash || '').slice(1)).toUpperCase().replace(/[^A-Z0-9]/g, '');
  let pid = U.store('kbs.pid');
  if (!pid || !/^[a-z0-9]{8,24}$/.test(pid)) { pid = U.randomId(16); U.store('kbs.pid', pid); }

  let net = null, you = null, view = '', racing = null, duelRound = 0, localDuelDone = false, released = false;
  const lastName = U.store('kbs.name') || {};
  const form = { first: lastName.first || '', initial: lastName.initial || '', char: lastName.char | 0, err: '' };
  // Auf Handys und Laptops der SuS läuft nie Musik, nur Soundeffekte
  KK.AU.music = false;
  const resKey = () => 'kbs.res.' + code;

  // ---------------------------------------------------------------- Verbindung
  function connect() {
    if (net) net.close();
    net = window.KNet({
      code, params: { role: 'player', pid },
      onMessage, onStatus: s => { netdot.dataset.s = racing === 'quali' && s === 'offline' ? 'idle' : s; if (s === 'offline' && net && net.stopped && !racing) onStopped(net.stopped); },
    });
    net.open();
  }
  function onStopped(why) {
    if (why === 'no-room') return showError('Diese Klasse gibt es nicht (mehr).', 'Prüfe den Code oder scanne den QR-Code am Beamer erneut.', true);
    if (why === 'ended') return showError('Die Sitzung ist beendet.', 'Danke fürs Mitfahren! Du kannst die Seite jetzt schließen.');
  }
  function onMessage(m) {
    switch (m.t) {
      case 'you': you = m; update(); break;
      case 'result-ok': U.store(resKey(), null); if (!racing) update(); break;
      case 'error': onError(m.why); break;
      case 'kicked':
        U.store('kbs.pid', null); U.store(resKey(), null); pid = U.randomId(16); U.store('kbs.pid', pid);
        stopRace(); net.close();
        showError('Du wurdest von der Lehrkraft aus der Liste entfernt.', 'Wenn das ein Versehen war, scanne den QR-Code noch einmal.');
        break;
      case 'ended': stopRace(); showError('Die Sitzung ist beendet.', 'Danke fürs Mitfahren! Du kannst die Seite jetzt schließen.'); break;
      case 'st': case 'ev': KK.netIn(m); break;
    }
  }
  function onError(why) {
    if (why === 'bad-name') { form.err = 'Bitte nur Buchstaben: Vorname und ein Anfangsbuchstabe.'; view = ''; renderName(); }
    else if (why === 'not-open') { view = ''; update(); }
    else if (why === 'full') showError('Die Klasse ist voll.', 'Es können höchstens 60 Personen mitfahren.');
    else if (why === 'no-room' || why === 'bad-pid') onStopped('no-room');
  }

  // ---------------------------------------------------------------- Ablauf
  function update() {
    if (!you) return;
    if (racing === 'quali') return;
    const d = you.duel;
    if (racing === 'duel') {
      if (d && d.state === 'done') finishDuelView();
      return;
    }
    if (d) {
      released = false;
      if (d.state === 'running' && d.round !== duelRound) return startDuel(d);
      if (d.state === 'ready') return renderDuelInvite(d);
      if (d.state === 'done') return renderDuelResult(d);
    }
    if (you.phase === 'duel-setup' || you.phase === 'duel' || you.phase === 'podium') return release();
    released = false;
    const me = you.me;
    if (!me) {
      if (you.phase === 'quali') { if (view !== 'name' && view !== 'char' && view !== 'joining') renderName(); }
      else renderWait();
      return;
    }
    if (me.status === 'done') { U.store(resKey(), null); return renderResult(); }
    const saved = U.store(resKey());
    if (saved && saved.total) { net.send({ t: 'result', total: saved.total, laps: saved.laps }, true); return renderResult(saved); }
    if (view === 'joining') return startQuali();
    renderInterrupted();
  }

  // Nicht im Finale: Die Seite bleibt still verbunden (kostet fast nichts), damit die
  // Lehrkraft Fahrer tauschen oder ein größeres Finale einrichten kann. Fürs Rennen selbst
  // ist diese Verbindung nicht nötig; wer die Seite schließt, stört niemanden.
  function release() {
    if (released) return;
    released = true; view = 'released';
    const me = you && you.me;
    setPanel(`<div class="card">
      <h2>Das Finale läuft am Beamer</h2>
      <p>${me && me.total ? `Deine Qualifying-Zeit: <strong>${KK.fmt(me.total)}</strong>${me.rank ? ` · Platz ${me.rank} von ${me.of}` : ''}. ` : ''}Danke fürs Mitfahren! Du kannst die Seite jetzt schließen.</p>
      <p>Wenn du sie offen lässt, meldet sie sich von selbst, sobald deine Lehrkraft dich ins Finale holt.</p></div>`);
  }

  // ---------------------------------------------------------------- Ansichten
  function setPanel(html) { panel.innerHTML = html; panel.hidden = false; consoleEl.hidden = true; }
  function trackName(i) { return (KK.TRACKS[i] || KK.TRACKS[0]).name; }

  function renderCodeEntry(err) {
    view = 'code';
    setPanel(`<form class="card" id="codeForm" novalidate>
      <h2>Mitfahren</h2>
      <p>Scanne den QR-Code am Beamer oder gib den Code ein, der dort steht.</p>
      <div class="field"><label for="inCode">Code</label><input id="inCode" inputmode="text" autocomplete="off" autocapitalize="characters" maxlength="5" placeholder="z. B. K7QXM" value=""></div>
      ${err ? `<p class="err">${esc(err)}</p>` : ''}
      <button class="big-btn" type="submit">Weiter</button></form>`);
    $('#codeForm').onsubmit = e => {
      e.preventDefault();
      const v = $('#inCode').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (v.length !== 5) return renderCodeEntry('Der Code hat genau 5 Zeichen.');
      code = v; history.replaceState(null, '', '#' + code); connect(); renderConnecting();
    };
  }
  function renderConnecting() { view = 'connecting'; setPanel(`<div class="card"><h2>Verbinde …</h2><p>Einen Moment, die Klasse wird gesucht.</p></div>`); }
  function renderWait() {
    view = 'wait';
    setPanel(`<div class="card"><h2>Gleich geht's los</h2><p>Deine Lehrkraft richtet das Qualifying gerade ein. Lass diese Seite offen, sie aktualisiert sich von selbst.</p><div class="pulse" aria-hidden="true"></div></div>`);
  }
  function showError(title, text, retry) {
    view = 'error';
    setPanel(`<div class="card"><h2>${esc(title)}</h2><p>${esc(text)}</p>${retry ? '<button class="ghost-btn" id="btnCode">Code eingeben</button>' : ''}</div>`);
    if (retry) $('#btnCode').onclick = () => renderCodeEntry();
  }

  function renderName() {
    view = 'name';
    const q = you.quali;
    setPanel(`<form class="card" id="nameForm" novalidate>
      <h2>Qualifying</h2>
      <p><strong>${esc(trackName(q.track))}</strong> · ${q.laps} ${q.laps === 1 ? 'Runde' : 'Runden'} · Zeitfahren mit 3× Turbo. Deine Gesamtzeit erscheint am Beamer.</p>
      <p class="hint">Gas gibt das Spiel automatisch. Raketenstart: Tippe <b>Drift</b>, wenn das dritte rote Licht angeht.</p>
      <div class="row">
        <div class="field grow"><label for="inFirst">Vorname</label><input id="inFirst" autocomplete="given-name" maxlength="16" value="${esc(form.first)}" required></div>
        <div class="field initial"><label for="inInit">Nachname</label><input id="inInit" maxlength="1" autocapitalize="characters" autocomplete="off" value="${esc(form.initial)}" placeholder="K" required></div>
      </div>
      <p class="hint">Vom Nachnamen nur den ersten Buchstaben. Am Beamer steht dann: <strong class="preview-name" id="pv">${esc(preview())}</strong></p>
      ${form.err ? `<p class="err">${esc(form.err)}</p>` : ''}
      <button class="big-btn" type="submit">Weiter</button></form>`);
    const f = $('#inFirst'), i = $('#inInit');
    const upd = () => { form.first = f.value; form.initial = i.value; $('#pv').textContent = preview(); };
    f.oninput = upd; i.oninput = upd;
    $('#nameForm').onsubmit = e => {
      e.preventDefault(); upd();
      if (!NAME_RE.test(form.first.trim())) { form.err = 'Bitte gib deinen Vornamen ein (nur Buchstaben).'; return renderName(); }
      if (!INIT_RE.test(form.initial.trim())) { form.err = 'Bitte gib den ersten Buchstaben deines Nachnamens ein.'; return renderName(); }
      form.err = '';
      if (you.quali.char >= 0) { form.char = you.quali.char; renderChar(true); } else renderChar(false);
    };
    if (!form.first) setTimeout(() => f.focus(), 50);
  }
  function preview() {
    const a = form.first.trim(), b = form.initial.trim();
    if (!a) return 'Lena K.';
    return a.charAt(0).toLocaleUpperCase('de-DE') + a.slice(1) + ' ' + (b ? b.toLocaleUpperCase('de-DE') + '.' : '');
  }
  function portrait(canvas, ci) { const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 80, 80); g.drawImage(KK.KSPR[ci][6], 0, 0); }

  function renderChar(fixed) {
    view = 'char';
    const C = KK.CHARS;
    if (fixed) {
      const c = C[form.char];
      setPanel(`<div class="card">
        <h2>Deine Spielfigur</h2>
        <p>Deine Lehrkraft hat für alle dieselbe Figur gewählt.</p>
        <div class="fixed-char"><canvas width="80" height="80" id="fc"></canvas><div><b>${esc(c.name)}</b><span>${esc(c.kind)} · ${esc(c.cls)}gewicht</span></div></div>
        <button class="big-btn" id="btnGo">Los geht's!</button>
        <button class="ghost-btn" id="btnBack">Namen ändern</button></div>`);
      portrait($('#fc'), form.char);
    } else {
      setPanel(`<div class="card">
        <h2>Wähle deine Figur</h2>
        <div class="cgrid" role="radiogroup" aria-label="Spielfigur">${C.map((c, i) => `<button class="cpick" role="radio" aria-checked="${i === form.char}" data-i="${i}"><canvas width="80" height="80"></canvas><b>${esc(c.name)}</b><span>${esc(c.cls)}</span></button>`).join('')}</div>
        <div class="statbox" id="stats"></div>
        <button class="big-btn" id="btnGo">Los geht's!</button>
        <button class="ghost-btn" id="btnBack">Namen ändern</button></div>`);
      panel.querySelectorAll('.cpick').forEach(b => {
        const i = +b.dataset.i; portrait(b.querySelector('canvas'), i);
        b.onclick = () => { form.char = i; panel.querySelectorAll('.cpick').forEach(x => x.setAttribute('aria-checked', String(+x.dataset.i === i))); stats(); KK.SFX.move && KK.SFX.move(); };
      });
      stats();
    }
    $('#btnBack').onclick = () => renderName();
    $('#btnGo').onclick = () => {
      KK.AU.init();
      if (!you || you.phase !== 'quali') return update();
      view = 'joining';
      $('#btnGo').disabled = true; $('#btnGo').textContent = 'Melde an …';
      U.store('kbs.name', { first: form.first.trim(), initial: form.initial.trim(), char: form.char });
      net.send({ t: 'join', first: form.first.trim(), initial: form.initial.trim(), char: form.char }, true);
    };
  }
  function stats() {
    const c = KK.CHARS[form.char], el = $('#stats'); if (!el) return;
    el.innerHTML = `<b>${esc(c.name)}</b> <span>${esc(c.kind)} · ${esc(c.cls)}gewicht</span>` + KK.STAT_LABELS.map(([k, l]) => `<div class="st"><span>${l}</span><i style="--v:${c.st[k]}"></i></div>`).join('');
  }

  function renderInterrupted() {
    view = 'interrupted';
    setPanel(`<div class="card"><h2>Dein Lauf wurde unterbrochen</h2>
      <p>Du bist angemeldet, aber es ist noch keine Zeit angekommen. Starte das Qualifying neu.</p>
      <button class="big-btn" id="btnGo">Rennen starten</button></div>`);
    $('#btnGo').onclick = () => { KK.AU.init(); startQuali(); };
  }

  function renderResult(local) {
    view = 'result';
    const me = you && you.me, total = me && me.total != null ? me.total : local && local.total;
    const laps = local && local.laps;
    const sent = me && me.status === 'done';
    setPanel(`<div class="card result">
      <h2>Ziel!</h2>
      <div class="result-time">${total ? KK.fmt(total) : '–'}</div>
      ${laps && laps.length > 1 ? `<ol class="laplist">${laps.map((t, i) => `<li><span>Runde ${i + 1}</span><span>${KK.fmt(t)}</span></li>`).join('')}</ol>` : ''}
      <p class="sendstate ${sent ? 'ok' : ''}">${sent ? `Deine Zeit ist am Beamer angekommen.${me.rank ? ` Du bist gerade auf <strong>Platz ${me.rank}</strong> von ${me.of}.` : ''}` : 'Deine Zeit wird gesendet …'}</p>
      <p>Lass die Seite offen. Die zwei Schnellsten fahren gleich das Finale gegeneinander.</p></div>`);
  }

  function renderDuelInvite(d) {
    view = 'invite';
    const others = d.names.map((nm, i) => i).filter(i => i !== d.slot);
    const vs = d.names.length === 2
      ? `<div class="versus"><div><canvas width="80" height="80" data-c="${d.chars[d.slot]}"></canvas><b>${esc(d.names[d.slot])}</b><span>Du</span></div><em>gegen</em><div><canvas width="80" height="80" data-c="${d.chars[others[0]]}"></canvas><b>${esc(d.names[others[0]])}</b><span>Gegner</span></div></div>`
      : `<div class="field4" style="grid-template-columns:repeat(${d.names.length},minmax(0,1fr))">${d.names.map((nm, i) => `<div class="${i === d.slot ? 'me' : ''}"><canvas width="80" height="80" data-c="${d.chars[i]}"></canvas><b>${esc(nm)}</b><span>${i === d.slot ? 'Du · ' : ''}Startplatz ${i + 1}</span></div>`).join('')}</div>`;
    setPanel(`<div class="card invite">
      <h2>Du fährst im Finale!</h2>
      ${vs}
      <p><strong>${esc(trackName(d.track))}</strong> · ${d.laps} ${d.laps === 1 ? 'Runde' : 'Runden'} · ${d.names.length} Fahrer · mit Items. Du startest von <strong>Startplatz ${d.slot + 1}</strong>. Das Rennen beginnt, sobald deine Lehrkraft am Beamer auf „Rennen starten“ drückt.</p>
      <p class="hint">Tipp: Halte dein Handy quer, dann sind die Tasten links und rechts. Gas gibt das Spiel automatisch, Raketenstart mit <b>Drift</b> beim dritten roten Licht.</p>
      <button class="ghost-btn" id="btnSnd">Ton testen</button></div>`);
    panel.querySelectorAll('canvas[data-c]').forEach(c => portrait(c, +c.dataset.c));
    $('#btnSnd').onclick = () => { KK.AU.init(); KK.SFX.ok(); };
  }

  function placeOf(d) { return d.order ? d.order.indexOf(d.slot) + 1 : (d.winner === d.slot ? 1 : 0); }
  function renderDuelResult(d) {
    view = 'duelres';
    const n = d.names.length, place = placeOf(d), win = place === 1;
    const title = d.winner < 0 ? 'Rennen beendet' : win ? 'Gewonnen!' : n === 2 ? 'Knapp verloren' : place + '. Platz';
    const wt = d.winner >= 0 ? d.fin[d.winner] : null;
    setPanel(`<div class="card result ${win ? 'win' : ''}">
      <h2>${title}</h2>
      <canvas width="80" height="80" id="pvr" class="big-port"></canvas>
      <p>${win ? `Deine Zeit: <strong>${wt ? KK.fmt(wt) : '–'}</strong>` : d.winner >= 0 ? `${esc(d.names[d.winner])} war zuerst im Ziel${wt ? ` (<strong>${KK.fmt(wt)}</strong>)` : ''}.${n > 2 && place ? ` Du bist <strong>${place}.</strong> von ${n}.` : ''}` : ''}</p>
      <p>Die Siegerehrung siehst du am Beamer.</p></div>`);
    portrait($('#pvr'), d.chars[d.slot]);
  }

  // ---------------------------------------------------------------- Rennen
  function showConsole() { panel.hidden = true; consoleEl.hidden = false; raceNote.hidden = true; document.body.classList.add('racing'); $('#keys').hidden = KK.usingTouch; }
  function stopRace() {
    racing = null; KK.H.onFinish = null; KK.H.onPost = null; document.body.classList.remove('racing'); $('#keys').hidden = true;
    if (KK.R) { KK.R = null; KK.MUS.stop(); }
    KK.setScreen('idle');
  }

  function startQuali() {
    const me = you.me, q = you.quali;
    racing = 'quali'; view = 'race';
    showConsole();
    const R = KK.startNet({ mode: 'quali', track: q.track, laps: q.laps, cc: 150, grid: [me.char], player: me.char, localSlot: 0, noPause: true, autoGas: true });
    KK.say(trackName(q.track), 110);
    let local = null;
    KK.H.onFinish = k => {
      local = { total: k.ftime, laps: k.lapTimes.slice() };
      U.store(resKey(), local);
      net.send({ t: 'result', total: local.total, laps: local.laps }, true);
    };
    KK.H.onPost = () => { stopRace(); renderResult(local); if (you) update(); };
    // Während des Rennens keine Verbindung offen halten (schont das WLAN)
    setTimeout(() => { if (racing === 'quali') net.close(); }, 400);
    return R;
  }

  function startDuel(d) {
    duelRound = d.round; racing = 'duel'; localDuelDone = false; view = 'race';
    showConsole();
    const R = KK.startNet({ mode: 'duel', track: d.track, laps: d.laps, cc: 150, grid: d.chars.slice(), localSlot: d.slot, names: d.names.slice(), noPause: true, tags: true, autoGas: true });
    R.net = { slot: d.slot, seq: 0, send: o => net.send(o) };
    const ms = d.startAt - net.serverNow();
    R.cd = Math.max(30, Math.min(420, Math.round(ms / (1000 / 60))));
    KK.say('Finale · ' + trackName(d.track), 110);
    KK.H.onFinish = k => {
      localDuelDone = true;
      // Reihenfolge aus Sicht dieses Handys: wer im Ziel ist zuerst, dann nach Streckenfortschritt
      const Rr = KK.R, order = Rr.karts.map((_, i) => i).sort((a, b) => {
        const A = Rr.karts[a], B = Rr.karts[b];
        if (A === k) return -1; if (B === k) return 1;
        if (A.finished && B.finished) return A.ftime - B.ftime;
        if (A.finished) return -1; if (B.finished) return 1;
        return KK.prog(B) - KK.prog(A);
      });
      net.send({ t: 'fin', time: k.ftime, order }, true);
    };
    KK.H.onPost = () => {
      if (you && you.duel && you.duel.state === 'done') finishDuelView();
      else { raceNote.textContent = 'Warte auf die Siegerehrung …'; raceNote.hidden = false; }
    };
  }
  function finishDuelView() {
    const d = you.duel, R = KK.R;
    if (!d) return;
    // Nach der eigenen Zieldurchfahrt kurz „Ziel!“ stehen lassen
    if (R && R.player && R.player.finished && R.postT < 120) { setTimeout(finishDuelView, 300); return; }
    if (R && R.player && !R.player.finished && !finishDuelView.shown) {
      finishDuelView.shown = true;
      if (d.winner >= 0 && d.winner !== d.slot) { KK.say(d.names[d.winner] + ' ist im Ziel!', 120, 'gold'); KK.SFX.final(); }
      setTimeout(finishDuelView, 2000); return;
    }
    finishDuelView.shown = false;
    stopRace(); renderDuelResult(d);
  }

  // ---------------------------------------------------------------- Start
  if (code.length === 5) { connect(); renderConnecting(); }
  else renderCodeEntry();

  window.__student = { get you() { return you; }, get net() { return net; }, get view() { return view; }, get racing() { return racing; } };
})();

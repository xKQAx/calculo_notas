(() => {
  const $ = s => document.querySelector(s);
  const KEY = 'calculo_notas_v1';
  const blank = () => ({ sem: 1, prev: {}, notes: {}, extra: {}, base: '', hist: {} });
  let st = blank();
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : Math.min(5, Math.max(0, n)); };
  const fmt = (n, d = 2) => n.toFixed(d).replace('.', ',');
  const money = n => '$' + Math.round(n).toLocaleString('es-CO');

  // Nota 0–5: si no hay coma, el primer dígito es la unidad y el resto el decimal ("45" → "4,5").
  const formatNota = raw => {
    const s = String(raw ?? '').replace(/\./g, ',');
    const digits = s.replace(/\D/g, '');
    if (!digits) return '';
    const commaAt = s.indexOf(',');
    if (commaAt === -1 && digits.length === 1) return digits[0] > '5' ? '5' : digits[0];
    let entero, decimal;
    if (commaAt === -1) {
      entero = digits[0];
      decimal = digits.slice(1, 3);
    } else {
      entero = (s.slice(0, commaAt).replace(/\D/g, '') || '0').slice(0, 1);
      decimal = s.slice(commaAt + 1).replace(/\D/g, '').slice(0, 2);
      if (decimal === '' && s.endsWith(',')) return (entero > '5' ? '5' : entero) + ',';
    }
    if (entero > '5') return '5,0';
    const n = parseFloat(entero + '.' + (decimal || '0'));
    if (n > 5) return '5,0';
    return decimal ? entero + ',' + decimal : entero;
  };

  // Pesos en es-CO: "4000000" → "4.000.000". El cálculo sigue leyendo solo los dígitos.
  const formatPesos = raw => {
    const digits = String(raw ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 9);
    if (!digits) return '';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Reescribe el campo y deja el cursor sobre el mismo dígito, no al final por los separadores.
  const applyMask = (el, format) => {
    const start = el.selectionStart ?? el.value.length;
    const digitsBefore = el.value.slice(0, start).replace(/\D/g, '').length;
    const next = format(el.value);
    if (next === el.value) return;
    el.value = next;
    let pos = next.length;
    if (digitsBefore === 0) pos = 0;
    else {
      let seen = 0;
      for (let i = 0; i < next.length; i++) {
        if (/\d/.test(next[i]) && ++seen === digitsBefore) { pos = i + 1; break; }
      }
    }
    try { el.setSelectionRange(pos, pos); } catch (e) {}
  };
  const up1 = n => Math.ceil(n * 10 - 1e-9) / 10;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let list = [];

  // Iconos de trazo, compartidos por chips y peldaños. El texto del chip no va dentro del SVG.
  const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICO = {
    ok: svg('<path d="M5 12.5 9.2 17 19 7"/>'),
    bad: svg('<path d="M8 8l8 8M16 8l-8 8"/>'),
    warn: svg('<path d="M12 4.5 3.5 19.5h17L12 4.5z"/><path d="M12 10v4M12 16.6h.01"/>'),
    info: svg('<path d="M5 12h12M13 7l5 5-5 5"/>'),
    soft: svg('<path d="M5 12.5 9.2 17 19 7"/>'),
    done: svg('<path d="m12 3 2.4 4.8 5.3.8-3.8 3.7.9 5.3L12 15.8 7.2 17.6l.9-5.3L4.3 8.6l5.3-.8L12 3z"/>'),
    open: svg('<circle cx="12" cy="12" r="7"/><path d="M12 8v4l2.5 2"/>'),
    no: svg('<circle cx="12" cy="12" r="8"/><path d="M7.5 7.5l9 9"/>')
  };
  const chip = (kind, text) => `<span class="chip chip-${kind}">${ICO[kind]}${esc(text)}</span>`;

  const courses = (sem = st.sem) => PENSUM[sem].map((c, i) => ({ id: sem + '-' + i, ...c }))
    .concat(st.extra[sem] || [])
    .map(c => ({ w: CORTES, min: MIN_APROBAR, ...c }));

  // Punto discreto: hay notas escritas, una electiva o un polígrafo de ese semestre.
  function semHasData(n) {
    const key = String(n);
    const prefixed = Object.keys(st.notes).some(id => id.startsWith(key + '-') && (st.notes[id] || []).some(v => String(v ?? '').trim() !== ''));
    const extras = st.extra[key] || [];
    const extraNotes = extras.some(c => (st.notes[c.id] || []).some(v => String(v ?? '').trim() !== ''));
    const hist = Object.values(st.hist || {}).some(p => String(p.nivel) === key);
    return prefixed || extraNotes || extras.length > 0 || hist;
  }

  function refreshDot() {
    const b = document.querySelector(`#tabs [data-sem="${st.sem}"]`);
    if (!b) return;
    const has = semHasData(st.sem);
    b.setAttribute('aria-label', has ? `Semestre ${st.sem}, con datos` : `Semestre ${st.sem}`);
    const dot = b.querySelector('.sem-dot');
    if (has && !dot) b.insertAdjacentHTML('afterbegin', '<span class="sem-dot" aria-hidden="true"></span>');
    if (!has && dot) dot.remove();
  }

  function centerTab() {
    const nav = $('#tabs');
    const b = nav.querySelector('[aria-pressed="true"]');
    if (!b || !window.matchMedia('(max-width: 1199px)').matches) return;
    const left = b.offsetLeft - (nav.clientWidth - b.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, left), behavior: 'auto' });
  }

  function render() {
    $('#tabs').innerHTML = Object.keys(PENSUM).map(n => {
      const on = n == st.sem;
      const has = semHasData(n);
      const label = has ? `Semestre ${n}, con datos` : `Semestre ${n}`;
      const dot = has ? '<span class="sem-dot" aria-hidden="true"></span>' : '';
      return `<button type="button" data-sem="${n}" aria-pressed="${on}" aria-label="${label}">${dot}<span>Semestre ${n}</span></button>`;
    }).join('');
    const p = st.prev[st.sem] || {};
    $('#prevCred').value = p.cred ?? '';
    $('#prevAvg').value = p.avg ?? '';
    $('#base').value = formatPesos(st.base || '');
    $('#semTitle').textContent = 'Materias del semestre ' + st.sem;
    $('#notice').hidden = Object.keys(st.hist || {}).length > 0;
    $('#accBox').open = st.sem > 1 && !(p.cred || p.avg);
    list = courses();
    // data-label alimenta la tarjeta móvil: el CSS lo muestra y esconde el thead.
    $('#rows').innerHTML = list.map((c, i) => {
      const n = st.notes[c.id] || [];
      const inp = k => {
        const aria = c.w.length === 1 ? `Nota única de ${esc(c.name)}` : `Nota del corte ${k + 1} de ${esc(c.name)}`;
        return `<input data-i="${i}" data-k="${k}" inputmode="decimal" autocomplete="off" spellcheck="false" value="${esc(formatNota(n[k] ?? ''))}" aria-label="${aria}">`;
      };
      const cells = c.w.length === 1
        ? `<td colspan="3" class="one cut" data-label="Nota única 100%">${inp(0)}<small class="unit">nota única, 100%</small></td>`
        : c.w.map((w, k) => `<td class="cut" data-label="Corte ${k + 1} ${Math.round(w * 100)}%">${inp(k)}</td>`).join('');
      const del = c.extra ? ` <button type="button" class="link" data-del="${esc(c.id)}">quitar</button>` : '';
      return `<tr><td class="name" data-label="Materia">${esc(c.name)}<small>mínimo ${fmt(c.min, 1)}${del}</small></td><td class="cred" data-label="Créditos">${c.credits}</td>${cells}<td class="res" data-label="Definitiva" id="r${i}"></td><td class="need" data-label="Qué necesitas" id="n${i}"></td></tr>`;
    }).join('');
    update();
    centerTab();
    if (typeof Hist !== 'undefined') Hist.draw();
  }

  // La barra se arma una vez para que el pin se desplace y no reaparezca en cada tecla.
  function drawScale(shown, finalAvg) {
    const min = 3, max = 5, span = max - min;
    let root = $('#ruler .scale');
    if (!root) {
      const edges = [min, ...DESCUENTOS.map(t => t.prom), max];
      const zones = [];
      for (let i = 0; i < edges.length - 1; i++) {
        const pct = i === 0 ? 0 : DESCUENTOS[i - 1].pct;
        zones.push(`<div class="zone" data-pct="${pct}" style="width:${((edges[i + 1] - edges[i]) / span * 100).toFixed(4)}%"></div>`);
      }
      const marks = DESCUENTOS.map(t => `<i class="mark" style="left:${((t.prom - min) / span * 100).toFixed(4)}%"></i>`).join('');
      const key = [{ pct: 0, name: 'Sin descuento' }, ...DESCUENTOS.map(t => ({ pct: t.pct, name: `${fmt(t.prom, 1)} · ${t.pct}%` }))]
        .map(z => `<li><i data-pct="${z.pct}" aria-hidden="true"></i>${z.name}</li>`).join('');
      $('#ruler').innerHTML = `<div class="scale" role="img"><div class="scale-track" aria-hidden="true">${zones.join('')}${marks}<span class="pin" hidden><span class="pin-val"></span></span></div><div class="scale-ends" aria-hidden="true"><span>3,0</span><span>5,0</span></div><ul class="scale-key" aria-hidden="true">${key}</ul></div>`;
      root = $('#ruler .scale');
    }
    const phrase = describeScale(shown, finalAvg);
    root.setAttribute('aria-label', phrase);
    const pin = root.querySelector('.pin');
    if (shown === null) { pin.hidden = true; return; }
    const pos = Math.min(100, Math.max(0, (shown - min) / span * 100));
    let pct = 0;
    DESCUENTOS.forEach(t => { if (shown >= t.prom) pct = t.pct; });
    const reveal = pin.hidden;
    pin.style.left = pos.toFixed(4) + '%';
    pin.dataset.pct = String(pct);
    pin.querySelector('.pin-val').textContent = fmt(shown);
    pin.hidden = false;
    if (reveal) {
      pin.style.transition = 'none';
      requestAnimationFrame(() => { pin.style.transition = ''; });
    }
  }

  function describeScale(shown, finalAvg) {
    if (shown === null) return 'Escala de descuento de 3,0 a 5,0. Aún no hay promedio para ubicar.';
    const kind = finalAvg ? 'Promedio del semestre' : 'Promedio con lo que llevas';
    const hit = [...DESCUENTOS].reverse().find(t => shown >= t.prom);
    if (!hit) return `${kind} ${fmt(shown)}, en la zona sin descuento, por debajo de ${fmt(DESCUENTOS[0].prom, 1)}. La escala va de 3,0 a 5,0.`;
    const next = DESCUENTOS.find(t => t.prom > shown);
    const hasta = next ? `, antes de ${fmt(next.prom, 1)}` : '';
    return `${kind} ${fmt(shown)}, en la zona de ${hit.pct} por ciento, desde ${fmt(hit.prom, 1)}${hasta}. La escala va de 3,0 a 5,0.`;
  }

  // Tarjeta de meta. El texto va escapado; extra es HTML ya armado (el valor a pagar).
  function stepArticle(cls, value, kicker, state, msg, extra) {
    const ico = cls === 'is-done' ? 'done' : cls === 'is-pass' ? 'ok' : cls === 'is-no' ? 'no' : 'open';
    return `<article class="step ${cls}"><span class="step-ico">${ICO[ico]}</span><div><p class="step-top"><b>${esc(String(value))}</b><span>${esc(kicker)}</span></p><p class="step-state">${esc(state)}</p><p class="step-msg">${esc(msg)}</p>${extra || ''}</div></article>`;
  }

  // Promedio aún abierto para que el semestre, con todas las materias, llegue a target.
  const gap = (target, cr, known, left) => (target * cr - known) / left;

  function joinEs(names) {
    const max = 2;
    if (names.length <= max) {
      if (names.length <= 1) return names[0] || '';
      return names.slice(0, -1).join(', ') + ' y ' + names[names.length - 1];
    }
    return names.slice(0, max).join(', ') + ' y ' + (names.length - max) + ' más';
  }

  // Nota que, sacada en lo que falta, aprueba cada materia con su propio mínimo
  // (3,0 en general; 3,5 y 3,8 en práctica y trabajo de grado).
  function passSubjectsArticle() {
    const lost = [];
    const open = [];
    list.forEach(c => {
      const r = Calc.course(c.w, (st.notes[c.id] || []).map(num));
      if (r.final !== null) {
        if (r.final < c.min) lost.push(c.name);
        return;
      }
      open.push({ name: c.name, x: Calc.need(r, c.min) });
    });
    if (lost.length) return stepArticle('is-no', '—', 'materias perdidas', 'Imposible', 'Ya no alcanzan: ' + joinEs(lost));
    const pending = open.filter(o => o.x > 0);
    if (!pending.length) {
      const msg = open.length ? 'Ya lo tienes asegurado' : 'Todas las materias están aprobadas';
      return stepArticle('is-pass', fmt(MIN_APROBAR, 1), 'todas las materias', 'Lograda', msg);
    }
    const blocked = pending.filter(o => o.x > 5);
    if (blocked.length) return stepArticle('is-no', '—', 'materias perdidas', 'Imposible', 'Ya no alcanza en ' + joinEs(blocked.map(o => o.name)) + ', ni con 5,0');
    const show = up1(Math.max(...pending.map(o => o.x)));
    const tops = pending.filter(o => Math.abs(up1(o.x) - show) < 1e-9);
    const rest = pending.length - tops.length;
    const settled = list.length - pending.length;
    let kicker, msg;
    if (rest === 0 && tops.length > 1) {
      kicker = settled ? 'en las abiertas' : 'en cada materia';
      msg = 'Saca al menos esto en lo que falta';
    } else if (tops.length === 1) {
      kicker = tops[0].name;
      msg = rest ? 'Es la más exigente. Las demás piden menos' : 'Saca al menos esto en lo que falta';
    } else {
      kicker = 'en varias';
      msg = 'La necesitan ' + joinEs(tops.map(t => t.name)) + '. Las demás piden menos';
    }
    return stepArticle('is-open', fmt(show, 1), kicker, 'Alcanzable', msg);
  }

  // La otra cuenta: un solo promedio en lo que falta para que el semestre llegue a 3,0.
  function passAverageArticle(complete, avg, cr, known, left) {
    const target = MIN_APROBAR;
    const kicker = 'promedio del semestre';
    if (complete || !(left > 0)) {
      if (avg !== null && avg >= target) return stepArticle('is-pass', fmt(target, 1), kicker, 'Lograda', 'El promedio ya llega');
      return stepArticle('is-no', fmt(target, 1), kicker, 'Imposible', 'Con el semestre cerrado no se llega');
    }
    const x = gap(target, cr, known, left);
    if (x <= 0) return stepArticle('is-pass', fmt(target, 1), kicker, 'Lograda', 'Ya lo tienes asegurado');
    if (x > 5) return stepArticle('is-no', '—', kicker, 'Imposible', 'Ya no alcanza ni con 5,0');
    return stepArticle('is-open', fmt(up1(x), 1), kicker, 'Alcanzable', 'Saca este promedio en lo que falta para llegar a ' + fmt(target, 1));
  }

  function drawPass(complete, avg, cr, known, left) {
    $('#passHint').textContent = 'Arriba, la nota para aprobar cada materia con su mínimo. Abajo, la nota para que el promedio del semestre llegue a ' + fmt(MIN_APROBAR, 1) + '.';
    $('#pass').innerHTML = passSubjectsArticle() + passAverageArticle(complete, avg, cr, known, left);
  }

  function drawGoals(complete, avg, cr, known, left) {
    const base = parseInt(String($('#base').value).replace(/\D/g, '')) || 0;
    $('#goals').innerHTML = DESCUENTOS.map(t => {
      let cls, state, msg;
      if (complete) {
        if (avg >= t.prom) { cls = 'is-done'; state = 'Lograda'; msg = 'Este descuento ya es tuyo'; }
        else { cls = 'is-no'; state = 'Imposible'; msg = 'Con el semestre cerrado no se llega'; }
      } else {
        const x = gap(t.prom, cr, known, left);
        if (x <= 0) { cls = 'is-done'; state = 'Lograda'; msg = 'Ya lo tienes asegurado'; }
        else if (x > 5) { cls = 'is-no'; state = 'Imposible'; msg = 'Ya no alcanza'; }
        else { cls = 'is-open'; state = 'Alcanzable'; msg = 'Necesitas ' + fmt(up1(x), 1) + ' en lo que falta'; }
      }
      const pay = base ? `<p class="pay">Pagarías ${money(base * (1 - t.pct / 100))}</p>` : '';
      return stepArticle(cls, fmt(t.prom, 1), t.pct + '%', state, msg, pay);
    }).join('');
  }

  function markInvalid() {
    $('#rows').querySelectorAll('input[data-k]').forEach(inp => {
      const raw = inp.value.trim().replace(',', '.');
      const n = parseFloat(raw);
      const bad = raw !== '' && (Number.isNaN(n) || n < 0 || n > 5);
      const td = inp.closest('td');
      let err = td.querySelector('.err');
      if (!bad) {
        inp.removeAttribute('aria-invalid');
        inp.removeAttribute('aria-describedby');
        if (err) err.remove();
        return;
      }
      if (!err) {
        err = document.createElement('small');
        err.className = 'err';
        err.id = `err-${inp.dataset.i}-${inp.dataset.k}`;
        err.textContent = 'Entre 0 y 5';
        td.appendChild(err);
      }
      inp.setAttribute('aria-invalid', 'true');
      inp.setAttribute('aria-describedby', err.id);
    });
  }

  // Materias con nota de un semestre. La regla de qué nota cuenta vive en Calc.grade.
  function gradedItems(sem) {
    const items = [];
    courses(sem).forEach(c => {
      const grade = Calc.grade(Calc.course(c.w, (st.notes[c.id] || []).map(num)));
      if (grade !== null) items.push({ credits: c.credits, grade });
    });
    return items;
  }

  function update() {
    let cr = 0, known = 0, left = 0, pts = 0, complete = true;
    const currentItems = [];
    list.forEach((c, i) => {
      const r = Calc.course(c.w, (st.notes[c.id] || []).map(num));
      const grade = Calc.grade(r);
      if (grade !== null) currentItems.push({ credits: c.credits, grade });
      cr += c.credits; known += c.credits * r.known; left += c.credits * r.left;
      const res = $('#r' + i), nd = $('#n' + i);
      if (r.final !== null) {
        pts += c.credits * r.final;
        const pass = r.final >= c.min;
        res.className = 'res ' + (pass ? 'ok' : 'bad');
        res.textContent = fmt(r.final, 1);
        nd.innerHTML = pass ? chip('ok', 'Aprobada') : chip('bad', 'No aprobada');
      } else {
        complete = false;
        res.className = 'res';
        res.innerHTML = r.left < 1 ? `<span class="sofar">${fmt(r.known)}</span><small>van</small>` : '—';
        const x = Calc.need(r, c.min);
        if (x <= 0) nd.innerHTML = chip('soft', 'Ya pasaste');
        else if (x > 5) nd.innerHTML = chip('warn', 'Ya no alcanza');
        else nd.innerHTML = chip('info', 'Saca ' + fmt(up1(x), 1) + (r.left < 1 ? ' en lo que falta' : ' en total'));
      }
    });
    markInvalid();
    refreshDot();

    const avg = complete ? Calc.r2(pts / cr) : null;
    const sofar = cr - left > 0 ? known / (cr - left) : null;
    const shown = avg !== null ? avg : sofar;
    const prevCredRaw = $('#prevCred').value.trim(), prevAvgRaw = $('#prevAvg').value.trim();
    const explicitPrev = prevCredRaw !== '' || prevAvgRaw !== '';
    const pCred = parseInt(prevCredRaw) || 0, pAvg = num(prevAvgRaw) || 0;
    // Base escrita (o del polígrafo): no se vuelve a sumar con semestres anteriores.
    // Si los campos están vacíos, esos semestres salen de las notas ya cargadas.
    let baseCred = 0, baseAvg = 0, items = currentItems;
    if (explicitPrev) { baseCred = pCred; baseAvg = pAvg; }
    else Object.keys(PENSUM).forEach(n => { if (+n < st.sem) items = items.concat(gradedItems(+n)); });
    const carried = Calc.ponderado(baseAvg, baseCred, items);
    $('#accSummary').textContent = carried.cred + ' créditos, promedio ' + fmt(carried.avg);
    const acc = carried.cred > 0 ? carried.avg : null;
    const d = avg !== null ? Calc.discount(avg, DESCUENTOS) : null;
    const shownTxt = shown !== null ? fmt(shown) : '—';
    const accTxt = acc !== null ? fmt(acc) : '—';
    const discPct = avg !== null ? (d ? d.pct : 0) : null;
    const label = avg !== null ? 'Promedio del semestre' : 'Promedio con lo que llevas';
    $('#summary').innerHTML =
      `<p class="hero"><b>${shownTxt}</b><span>${label}</span></p>` +
      `<dl class="figs"><div><dt>Créditos</dt><dd>${cr}</dd></div>` +
      `<div><dt>Acumulado</dt><dd>${accTxt}</dd></div>` +
      `<div><dt>Descuento</dt><dd${discPct ? ' class="is-gold"' : ''}>${discPct !== null ? discPct + '%' : '—'}</dd></div></dl>`;
    drawScale(shown, avg !== null);
    drawPass(complete, avg, cr, known, left);
    drawGoals(complete, avg, cr, known, left);
  }

  $('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-sem]'); if (!b) return; st.sem = +b.dataset.sem; save(); render(); });
  $('#rows').addEventListener('input', e => {
    const t = e.target; if (t.dataset.k === undefined) return;
    applyMask(t, formatNota);
    const c = list[t.dataset.i];
    (st.notes[c.id] = st.notes[c.id] || [])[t.dataset.k] = t.value;
    save(); update();
  });
  $('#rows').addEventListener('focusout', e => {
    const t = e.target;
    if (!t.matches || !t.matches('input[data-k]') || !t.value.endsWith(',')) return;
    t.value = t.value.slice(0, -1);
    const c = list[t.dataset.i];
    if (!c) return;
    (st.notes[c.id] = st.notes[c.id] || [])[t.dataset.k] = t.value;
    save(); update();
  });
  $('#rows').addEventListener('click', e => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    st.extra[st.sem] = st.extra[st.sem].filter(c => c.id !== b.dataset.del); delete st.notes[b.dataset.del]; save(); render();
  });
  ['prevCred', 'prevAvg'].forEach(id => $('#' + id).addEventListener('input', () => {
    st.prev[st.sem] = { cred: $('#prevCred').value, avg: $('#prevAvg').value }; save(); update();
  }));
  $('#base').addEventListener('input', () => {
    applyMask($('#base'), formatPesos);
    st.base = $('#base').value;
    save(); update();
  });
  $('#addForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#exName').value.trim(), cr = parseInt($('#exCred').value);
    if (!name || !(cr > 0)) return;
    (st.extra[st.sem] = st.extra[st.sem] || []).push({ id: 'x' + Date.now(), name, credits: Math.min(cr, 10), extra: true });
    e.target.reset(); save(); render();
  });
  $('#reset').addEventListener('click', () => {
    if (!confirm('Se borrarán tus notas y tu historial guardados en este navegador. ¿Continuar?')) return;
    try { localStorage.removeItem(KEY); } catch (e) {}
    st = blank(); render();
  });

  // El resultado va en el flujo de la página (sin hoja ni scroll propio).
  window.addEventListener('resize', centerTab);

  // Tres vistas con hash en la URL: la flecha atrás del navegador funciona.
  const VIEWS = ['calculadora', 'historial', 'datos'];
  const show = v => {
    document.querySelectorAll('[data-view]').forEach(el => { el.hidden = el.dataset.view !== v; });
    document.querySelectorAll('#views [data-go]').forEach(b => (b.dataset.go === v ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
    window.scrollTo(0, 0);
  };
  document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) location.hash = b.dataset.go; });
  window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (VIEWS.includes(v)) show(v); });
  show(VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'calculadora');

  window.App = { get st() { return st; }, set st(v) { st = v; }, save, render, blank, coursesFor: courses };
  render();
})();

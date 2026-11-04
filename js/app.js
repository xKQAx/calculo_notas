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
  const up1 = n => Math.ceil(n * 10 - 1e-9) / 10;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let list = [];

  const courses = (sem = st.sem) => PENSUM[sem].map((c, i) => ({ id: sem + '-' + i, ...c }))
    .concat(st.extra[sem] || [])
    .map(c => ({ w: CORTES, min: MIN_APROBAR, ...c }));

  function render() {
    $('#tabs').innerHTML = Object.keys(PENSUM).map(n => `<button type="button" data-sem="${n}" aria-pressed="${n == st.sem}">Semestre ${n}</button>`).join('');
    const p = st.prev[st.sem] || {};
    $('#prevCred').value = p.cred ?? '';
    $('#prevAvg').value = p.avg ?? '';
    $('#base').value = st.base || '';
    $('#semTitle').textContent = 'Materias del semestre ' + st.sem;
    list = courses();
    $('#rows').innerHTML = list.map((c, i) => {
      const n = st.notes[c.id] || [];
      const inp = k => `<input data-i="${i}" data-k="${k}" inputmode="decimal" value="${esc(n[k] ?? '')}" aria-label="Nota del corte ${k + 1} de ${esc(c.name)}">`;
      const cells = c.w.length === 1
        ? `<td colspan="3" class="one">${inp(0)}<small>nota única, 100%</small></td>`
        : c.w.map((_, k) => `<td>${inp(k)}</td>`).join('');
      const del = c.extra ? ` <button type="button" class="link" data-del="${c.id}">quitar</button>` : '';
      return `<tr><td class="name">${esc(c.name)}<small>mínimo ${fmt(c.min, 1)}${del}</small></td><td>${c.credits}</td>${cells}<td class="res" id="r${i}"></td><td class="need" id="n${i}"></td></tr>`;
    }).join('');
    update();
    if (typeof Hist !== 'undefined') Hist.draw();
  }

  function update() {
    let cr = 0, known = 0, left = 0, pts = 0, complete = true;
    list.forEach((c, i) => {
      const r = Calc.course(c.w, (st.notes[c.id] || []).map(num));
      cr += c.credits; known += c.credits * r.known; left += c.credits * r.left;
      const res = $('#r' + i), nd = $('#n' + i);
      if (r.final !== null) {
        pts += c.credits * r.final;
        const pass = r.final >= c.min;
        res.textContent = fmt(r.final, 1);
        res.className = 'res ' + (pass ? 'ok' : 'bad');
        nd.textContent = pass ? 'Aprobada' : 'No aprobada';
      } else {
        complete = false;
        res.className = 'res';
        res.textContent = r.left < 1 ? 'van ' + fmt(r.known) + ' pts' : '-';
        const x = Calc.need(r, c.min);
        nd.textContent = x <= 0 ? 'Ya pasaste' : x > 5 ? 'Ya no alcanza' : 'Saca ' + fmt(up1(x), 1) + (r.left < 1 ? ' en lo que falta' : ' en total');
      }
    });

    const avg = complete ? Calc.r2(pts / cr) : null;
    const sofar = cr - left > 0 ? known / (cr - left) : null;
    const shown = avg !== null ? avg : sofar;
    const pCred = parseInt($('#prevCred').value) || 0, pAvg = num($('#prevAvg').value) || 0;
    const acc = complete ? Calc.r2(Calc.accum(pAvg, pCred, pts, cr)) : null;
    const d = avg !== null ? Calc.discount(avg, DESCUENTOS) : null;
    const stat = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
    $('#summary').innerHTML =
      stat(cr, 'créditos del semestre') +
      stat(shown !== null ? fmt(shown) : '-', avg !== null ? 'promedio del semestre' : 'promedio con lo que llevas') +
      stat(acc !== null ? fmt(acc) : '-', 'promedio acumulado nuevo') +
      stat(avg !== null ? (d ? d.pct : 0) + '%' : '-', 'descuento por promedio');

    const pos = x => Math.min(100, Math.max(0, (x - 3) / 2 * 100));
    $('#ruler').innerHTML = `<div class="bar"><i style="width:${shown === null ? 0 : pos(shown)}%"></i>` +
      DESCUENTOS.map(t => `<span class="tick" style="left:${pos(t.prom)}%"><span>${fmt(t.prom, 1)}<br>${t.pct}%</span></span>`).join('') +
      `</div><div class="ends"><span>3,0</span><span>5,0</span></div>`;

    const base = parseInt(String($('#base').value).replace(/\D/g, '')) || 0;
    $('#goals').innerHTML = DESCUENTOS.map(t => {
      let msg;
      if (complete) msg = avg >= t.prom ? 'Lo lograste' : 'No alcanzado';
      else {
        const x = (t.prom * cr - known) / left;
        msg = x <= 0 ? 'Ya lo tienes asegurado' : x > 5 ? 'Ya no alcanza' : 'Necesitas ' + fmt(up1(x), 1) + ' de promedio en lo que falta';
      }
      const m = base ? `<span>Pagarías ${money(base * (1 - t.pct / 100))}</span>` : '';
      return `<div class="goal"><b>${fmt(t.prom, 1)}</b><span>${t.pct}% de descuento</span><strong>${msg}</strong>${m}</div>`;
    }).join('');
  }

  $('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-sem]'); if (!b) return; st.sem = +b.dataset.sem; save(); render(); });
  $('#rows').addEventListener('input', e => {
    const t = e.target; if (t.dataset.k === undefined) return;
    const c = list[t.dataset.i];
    (st.notes[c.id] = st.notes[c.id] || [])[t.dataset.k] = t.value;
    save(); update();
  });
  $('#rows').addEventListener('click', e => {
    const id = e.target.dataset.del; if (!id) return;
    st.extra[st.sem] = st.extra[st.sem].filter(c => c.id !== id); delete st.notes[id]; save(); render();
  });
  ['prevCred', 'prevAvg'].forEach(id => $('#' + id).addEventListener('input', () => {
    st.prev[st.sem] = { cred: $('#prevCred').value, avg: $('#prevAvg').value }; save(); update();
  }));
  $('#base').addEventListener('input', () => { st.base = $('#base').value; save(); update(); });
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
  window.App = { get st() { return st; }, set st(v) { st = v; }, save, render, blank, coursesFor: courses };
  render();
})();

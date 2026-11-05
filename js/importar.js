// Carga de polígrafos en PDF, historial y exportación. Todo ocurre en el navegador.
const Hist = (() => {
  const $ = s => document.querySelector(s);
  const A = () => window.App;
  const fmt = (n, d = 2) => (isNaN(n) ? '-' : Number(n).toFixed(d).replace('.', ','));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sorted = () => Object.values(A().st.hist || {}).sort((a, b) => String(a.period).localeCompare(String(b.period)));
  const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICO = {
    ok: svg('<path d="M5 12.5 9.2 17 19 7"/>'),
    warn: svg('<path d="M12 4.5 3.5 19.5h17L12 4.5z"/><path d="M12 10v4M12 16.6h.01"/>'),
    err: svg('<circle cx="12" cy="12" r="8"/><path d="M9 9l6 6M15 9l-6 6"/>'),
    x: svg('<path d="M8 8l8 8M16 8l-8 8"/>')
  };
  if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  // El aviso reemplaza la lista: icono y color según éxito, advertencia o error.
  function log(msg, kind) {
    const type = kind === 'warn' ? 'warn' : (kind === 'err' || kind === 'error' || kind === true) ? 'err' : 'ok';
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.innerHTML = `${ICO[type]}<p></p><button type="button" class="toast-x" aria-label="Cerrar aviso">${ICO.x}</button>`;
    el.querySelector('p').textContent = msg;
    el.querySelector('button').addEventListener('click', () => el.remove());
    const box = $('#log');
    box.prepend(el);
    while (box.children.length > 4) box.lastElementChild.remove();
  }

  async function pdfText(file) {
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    let t = '';
    for (let i = 1; i <= pdf.numPages; i++) t += (await (await pdf.getPage(i)).getTextContent()).items.map(x => x.str).join(' ') + ' ';
    return t;
  }

  // Deja listos los datos de "lo que ya llevas acumulado" para cada semestre
  function applyPrev() {
    const st = A().st, ps = sorted();
    ps.forEach(p => {
      st.prev[p.nivel] = { cred: String(p.credAnt), avg: String(p.ppaAnt).replace('.', ',') };
      st.prev[p.nuevoNivel] = { cred: String(p.credNuevos), avg: String(p.ppaNuevo).replace('.', ',') };
    });
    const last = ps[ps.length - 1];
    if (last) {
      st.sem = Math.max(1, last.nuevoNivel);
      st.maxSem = Math.max(+(st.maxSem || 10), st.sem);
    }
  }

  async function addFiles(files) {
    if (!files.length) return;
    const drop = $('#drop'), status = $('#dropStatus');
    drop.classList.add('is-reading');
    drop.classList.remove('is-done', 'is-over');
    let ok = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (status) status.textContent = `Leyendo ${i + 1} de ${files.length}`;
        try {
          if (!window.pdfjsLib) throw new Error('No cargó el lector de PDF. Revisa tu conexión a internet.');
          const p = Poligrafo.parse(await pdfText(f));
          A().st.hist[p.period] = p;
          log(`${f.name}: periodo ${p.period}, ${p.courses.length} materias leídas.` + (p.warnings.length ? ' Revísalo: ' + p.warnings.join(' ') : ''), p.warnings.length ? 'warn' : 'ok');
          ok++;
        } catch (e) { log(`${f.name}: ${e.message}`, 'err'); }
      }
    } finally {
      drop.classList.remove('is-reading');
    }
    if (status) status.textContent = ok ? 'Listo' : '';
    if (ok) {
      drop.classList.add('is-done');
      setTimeout(() => {
        drop.classList.remove('is-done');
        if (status && status.textContent === 'Listo') status.textContent = '';
      }, 2400);
    }
    applyPrev(); A().save(); A().render();
  }

  function lineChart(ps) {
    const W = 360, H = 176, rot = ps.length > 4;
    const L = 36, R = 10, T = 14, B = rot ? 48 : 28;
    const innerW = W - L - R, innerH = H - T - B;
    const xAt = i => ps.length === 1 ? L + innerW / 2 : L + innerW * i / (ps.length - 1);
    const yAt = v => T + (5 - Math.min(5, Math.max(3, Number(v)))) / 2 * innerH;
    const d = key => ps.map((p, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)} ${yAt(p[key]).toFixed(1)}`).join(' ');
    const dots = (key, cls) => ps.map((p, i) => `<circle class="${cls}" cx="${xAt(i).toFixed(1)}" cy="${yAt(p[key]).toFixed(1)}" r="3.5"></circle>`).join('');
    const grid = [3, 4, 5].map(n => {
      const y = yAt(n);
      return `<line class="grid" x1="${L}" y1="${y.toFixed(1)}" x2="${W - R}" y2="${y.toFixed(1)}"></line><text class="axis" x="${L - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end">${n},0</text>`;
    }).join('');
    const labels = ps.map((p, i) => {
      const x = xAt(i).toFixed(1), y = H - (rot ? 10 : 8);
      const tr = rot ? ` transform="rotate(-40 ${x} ${y})"` : '';
      return `<text class="axis" x="${x}" y="${y}" text-anchor="${rot ? 'end' : 'middle'}"${tr}>${esc(p.period)}</text>`;
    }).join('');
    const aria = 'Promedio por periodo. ' + ps.map(p => `${p.period}: semestre ${fmt(p.promSem)}, acumulado ${fmt(p.ppaNuevo)}`).join('. ');
    return `<figure class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}" focusable="false">${grid}<path class="line line-ppa" d="${d('ppaNuevo')}"></path><path class="line line-sem" d="${d('promSem')}"></path>${dots('ppaNuevo', 'dot-ppa')}${dots('promSem', 'dot-sem')}${labels}</svg><figcaption><span><i class="swatch ppa" aria-hidden="true"></i>PPA</span><span><i class="swatch sem" aria-hidden="true"></i>Promedio del semestre</span></figcaption></figure>`;
  }

  function draw() {
    const ps = sorted(), box = $('#hist');
    if (!ps.length) { box.innerHTML = '<p class="hint">Aún no hay polígrafos cargados. Cuando subas los PDF, aquí verás tu historial y la calculadora tomará tus acumulados sola.</p><p><button type="button" class="btn" data-go="datos">Subir polígrafos</button></p>'; return; }
    const last = ps[ps.length - 1];
    const chip = ok => ok
      ? `<span class="chip chip-ok">${ICO.ok}Aprobada</span>`
      : `<span class="chip chip-bad">${ICO.err}No aprobada</span>`;
    const numeric = ps.length >= 2 && ps.every(p => !isNaN(p.promSem) && !isNaN(p.ppaNuevo));
    box.innerHTML = `<dl class="hist-meta"><div><dt>Créditos acumulados</dt><dd>${last.credNuevos}</dd></div><div><dt>Promedio acumulado</dt><dd>${fmt(last.ppaNuevo)}</dd></div><div><dt>Periodos</dt><dd>${ps.length}</dd></div></dl>` +
      (numeric ? lineChart(ps) : '') +
      ps.map(p => `<details class="period"><summary><span class="period-id">${esc(p.period)}</span><span class="period-sub">Semestre ${p.nivel} · ${p.credMatric} créditos</span><b class="period-avg">${fmt(p.promSem)}</b></summary>
        <div class="scroll hist-scroll"><table class="mini"><thead><tr><th>Código</th><th>Materia</th><th>Créd.</th><th>Def.</th><th>Estado</th></tr></thead><tbody>` +
        (p.courses || []).map(c => `<tr><td data-label="Código">${esc(c.code)}</td><td data-label="Materia">${esc(c.name)}</td><td data-label="Créditos">${c.credits || '—'}</td><td data-label="Definitiva">${typeof c.def === 'number' ? fmt(c.def, 1) : esc(c.def)}</td><td data-label="Estado">${chip(c.ok)}</td></tr>`).join('') +
        `</tbody></table></div><button type="button" class="link period-del" data-delp="${esc(p.period)}">Quitar este periodo</button></details>`).join('');
  }

  function download(name, blob) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const nv = v => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(x) ? '' : x; };

  const drop = $('#drop');
  // Evita que soltar un PDF fuera de la zona abra el archivo y se vaya de la página.
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => e.preventDefault());
  drop.addEventListener('dragenter', e => e.preventDefault());
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('is-over'); });
  drop.addEventListener('dragleave', e => {
    if (e.relatedTarget && drop.contains(e.relatedTarget)) return;
    drop.classList.remove('is-over');
  });
  drop.addEventListener('drop', async e => {
    e.preventDefault();
    e.stopPropagation();
    drop.classList.remove('is-over');
    const files = [...(e.dataTransfer && e.dataTransfer.files || [])].filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    if (!files.length) { log('Solo se leen polígrafos en PDF.', 'warn'); return; }
    await addFiles(files);
  });

  $('#pdfs').addEventListener('change', async e => { const f = [...e.target.files]; e.target.value = ''; await addFiles(f); });
  $('#hist').addEventListener('click', e => {
    const b = e.target.closest('[data-delp]'); if (!b) return;
    delete A().st.hist[b.dataset.delp]; A().save(); A().render();
  });

  $('#expJson').addEventListener('click', () => {
    download('calculo_notas_' + new Date().toISOString().slice(0, 10) + '.json', new Blob([JSON.stringify({ app: 'calculo_notas', version: 1, data: A().st }, null, 2)], { type: 'application/json' }));
  });
  $('#jsonIn').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const o = JSON.parse(await f.text());
      if (o.app !== 'calculo_notas' || !o.data || typeof o.data !== 'object') throw new Error('Este archivo no es un JSON de esta calculadora.');
      if (!confirm('Esto reemplaza lo que tienes ahora en el navegador. ¿Continuar?')) return;
      const st = Object.assign(A().blank(), o.data);
      if (!(+st.sem >= 1)) st.sem = 1;
      st.maxSem = Math.max(10, +(st.maxSem || 10), +st.sem);
      A().st = st; A().save(); A().render(); log(`${f.name}: datos cargados.`);
    } catch (err) { log(`${f.name}: ${err.message}`, 'err'); }
  });
  $('#expXlsx').addEventListener('click', () => {
    if (!window.XLSX) return log('No cargó el generador de Excel. Revisa tu conexión a internet.', 'err');
    const st = A().st, ps = sorted();
    const resumen = ps.map(p => ({ Periodo: p.period, 'Semestre cursado': p.nivel, 'Créditos matriculados': p.credMatric, 'Créditos aprobados': p.credAprob, 'Créditos acumulados': p.credNuevos, 'Promedio del semestre': p.promSem, 'Promedio acumulado (PPA)': p.ppaNuevo }));
    const materias = ps.flatMap(p => (p.courses || []).map(c => ({ Periodo: p.period, Código: c.code, Materia: c.name, Créditos: c.credits || '', Horas: c.hours, Semestre: c.sem ?? '', Definitiva: c.def, Aprobada: c.ok ? 'Sí' : 'No' })));
    const cortes = [];
    Object.keys(PENSUM).concat(A().sems().filter(n => n > 10).map(String)).forEach(s => A().coursesFor(+s).forEach(c => {
      const n = st.notes[c.id] || [];
      if (n.some(v => nv(v) !== '')) cortes.push({ Semestre: +s, Código: c.code || '', Materia: c.name, Créditos: c.credits, 'Corte 1': nv(n[0]), 'Corte 2': nv(n[1]), 'Corte 3': nv(n[2]) });
    }));
    const wb = XLSX.utils.book_new();
    [['Resumen', resumen], ['Materias', materias], ['Notas por corte', cortes]].forEach(([nm, rows]) => { if (rows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), nm); });
    if (!wb.SheetNames.length) return log('Todavía no hay datos para exportar.', 'warn');
    XLSX.writeFile(wb, 'mis_notas_udes.xlsx');
  });
  return { draw };
})();

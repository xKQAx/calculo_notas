// Carga de polígrafos en PDF, historial y exportación. Todo ocurre en el navegador.
const Hist = (() => {
  const $ = s => document.querySelector(s);
  const A = () => window.App;
  const fmt = (n, d = 2) => (isNaN(n) ? '-' : Number(n).toFixed(d).replace('.', ','));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sorted = () => Object.values(A().st.hist || {}).sort((a, b) => String(a.period).localeCompare(String(b.period)));
  const log = (msg, bad) => { const li = document.createElement('li'); li.textContent = msg; if (bad) li.className = 'bad'; $('#log').prepend(li); };
  if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

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
    if (last) st.sem = Math.min(last.nuevoNivel, Object.keys(PENSUM).length);
  }

  async function addFiles(files) {
    for (const f of files) {
      try {
        if (!window.pdfjsLib) throw new Error('No cargó el lector de PDF. Revisa tu conexión a internet.');
        const p = Poligrafo.parse(await pdfText(f));
        A().st.hist[p.period] = p;
        log(`${f.name}: periodo ${p.period}, ${p.courses.length} materias leídas.` + (p.warnings.length ? ' Revísalo: ' + p.warnings.join(' ') : ''), p.warnings.length > 0);
      } catch (e) { log(`${f.name}: ${e.message}`, true); }
    }
    applyPrev(); A().save(); A().render();
  }

  function draw() {
    const ps = sorted(), box = $('#hist');
    if (!ps.length) { box.innerHTML = '<p class="hint">Aún no hay polígrafos cargados. Cuando subas los PDF, aquí verás tu historial y la calculadora tomará tus acumulados sola.</p>'; return; }
    const last = ps[ps.length - 1];
    const stat = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
    box.innerHTML = `<div class="stats">${stat(last.credNuevos, 'créditos acumulados')}${stat(fmt(last.ppaNuevo), 'promedio acumulado (PPA)')}${stat(ps.length, 'periodos cargados')}</div>` +
      ps.map(p => `<details><summary>${esc(p.period)}: semestre ${p.nivel}, ${p.credMatric} créditos, promedio ${fmt(p.promSem)}</summary>
        <div class="scroll"><table class="mini"><thead><tr><th>Código</th><th>Materia</th><th>Créd.</th><th>Def.</th><th>Estado</th></tr></thead><tbody>` +
        (p.courses || []).map(c => `<tr><td>${esc(c.code)}</td><td>${esc(c.name)}</td><td>${c.credits || '-'}</td><td>${typeof c.def === 'number' ? fmt(c.def, 1) : esc(c.def)}</td><td>${c.ok ? 'Aprobada' : 'No aprobada'}</td></tr>`).join('') +
        `</tbody></table></div><button type="button" class="link" data-delp="${esc(p.period)}">Quitar este periodo</button></details>`).join('');
  }

  function download(name, blob) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const nv = v => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(x) ? '' : x; };

  $('#pdfs').addEventListener('change', async e => { const f = [...e.target.files]; e.target.value = ''; await addFiles(f); });
  $('#hist').addEventListener('click', e => { const p = e.target.dataset.delp; if (!p) return; delete A().st.hist[p]; A().save(); A().render(); });

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
      if (!PENSUM[st.sem]) st.sem = 1;
      A().st = st; A().save(); A().render(); log(`${f.name}: datos cargados.`);
    } catch (err) { log(`${f.name}: ${err.message}`, true); }
  });
  $('#expXlsx').addEventListener('click', () => {
    if (!window.XLSX) return log('No cargó el generador de Excel. Revisa tu conexión a internet.', true);
    const st = A().st, ps = sorted();
    const resumen = ps.map(p => ({ Periodo: p.period, 'Semestre cursado': p.nivel, 'Créditos matriculados': p.credMatric, 'Créditos aprobados': p.credAprob, 'Créditos acumulados': p.credNuevos, 'Promedio del semestre': p.promSem, 'Promedio acumulado (PPA)': p.ppaNuevo }));
    const materias = ps.flatMap(p => (p.courses || []).map(c => ({ Periodo: p.period, Código: c.code, Materia: c.name, Créditos: c.credits || '', Horas: c.hours, Semestre: c.sem ?? '', Definitiva: c.def, Aprobada: c.ok ? 'Sí' : 'No' })));
    const cortes = [];
    Object.keys(PENSUM).forEach(s => A().coursesFor(s).forEach(c => {
      const n = st.notes[c.id] || [];
      if (n.some(v => nv(v) !== '')) cortes.push({ Semestre: +s, Materia: c.name, Créditos: c.credits, 'Corte 1': nv(n[0]), 'Corte 2': nv(n[1]), 'Corte 3': nv(n[2]) });
    }));
    const wb = XLSX.utils.book_new();
    [['Resumen', resumen], ['Materias', materias], ['Notas por corte', cortes]].forEach(([nm, rows]) => { if (rows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), nm); });
    if (!wb.SheetNames.length) return log('Todavía no hay datos para exportar.', true);
    XLSX.writeFile(wb, 'mis_notas_udes.xlsx');
  });
  return { draw };
})();

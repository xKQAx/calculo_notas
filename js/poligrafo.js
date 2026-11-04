// Convierte el texto de un polígrafo de la UDES en datos. No guarda nombre ni código del estudiante.
const Poligrafo = (() => {
  const r2 = n => Math.round(n * 100 + 1e-9) / 100;
  function parse(raw) {
    const t = String(raw).replace(/\s+/g, ' ').trim();
    const per = t.match(/Per[ií]odo Acad[eé]mico:\s*(\d{4}[A-Z])/i);
    const cr = t.match(/NUEVOS CRED\. ACUM\.\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
    const av = t.match(/NUEVO PPA\s+(\d{4}[A-Z])\s+(\d+)\s+(\d+)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/);
    const a = t.indexOf('DEF. APR.'), b = t.indexOf('CRED. ACUM. ANT.');
    if (!per || !cr || !av || a < 0 || b < a) throw new Error('No parece un polígrafo de la UDES. Descárgalo de Génesis y vuelve a intentar.');
    const body = t.slice(a + 9, b);
    const re = /\s*([A-Z0-9]+(?:-\d+)?)\s+(.+?)\s+(\d+|-)\s+(\d+)\s+(\d+|-)\s+(\d\.\d|A|R)\s+(Si|No)\b/y;
    const courses = []; let m, pos = 0;
    while ((m = re.exec(body))) {
      pos = re.lastIndex;
      courses.push({ code: m[1], name: m[2].trim(), credits: m[3] === '-' ? 0 : +m[3], hours: +m[4], sem: m[5] === '-' ? null : +m[5], def: /\d/.test(m[6]) ? parseFloat(m[6]) : m[6], ok: m[7] === 'Si' });
    }
    const warnings = [];
    if (body.slice(pos).trim()) warnings.push('Hay filas de la tabla que no pude leer.');
    const cred = courses.reduce((s, c) => s + c.credits, 0);
    if (cred !== +cr[2]) warnings.push(`Los créditos leídos (${cred}) no coinciden con los matriculados (${cr[2]}).`);
    const num = courses.filter(c => c.credits && typeof c.def === 'number');
    const cc = num.reduce((s, c) => s + c.credits, 0);
    if (cc && Math.abs(r2(num.reduce((s, c) => s + c.credits * c.def, 0) / cc) - parseFloat(av[5])) > 0.011) warnings.push('El promedio que calculo no coincide con el del polígrafo.');
    return { period: per[1], nivel: +av[2], nuevoNivel: +av[3], credAnt: +cr[1], credMatric: +cr[2], credAprob: +cr[3], credNuevos: +cr[4], ppaAnt: parseFloat(av[4]), promSem: parseFloat(av[5]), ppaNuevo: parseFloat(av[6]), courses, warnings };
  }
  return { parse };
})();
if (typeof module !== 'undefined') module.exports = Poligrafo;

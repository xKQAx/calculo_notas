// Cálculos puros, sin tocar la pantalla.
const Calc = (() => {
  const r1 = n => Math.round(n * 10 + 1e-9) / 10;
  const r2 = n => Math.round(n * 100 + 1e-9) / 100;
  const ok = n => n !== null && n !== undefined && n !== '' && !isNaN(n);
  // w: pesos de los cortes, notes: notas (vacías = pendiente)
  function course(w, notes) {
    let known = 0, done = 0;
    w.forEach((x, i) => { if (ok(notes[i])) { known += notes[i] * x; done += x; } });
    const left = Math.max(0, +(1 - done).toFixed(6));
    return { known, left, final: left === 0 ? r1(known) : null };
  }
  // Promedio que necesitas en lo que falta para llegar a "target"
  const need = (r, target) => (r.left === 0 ? null : (target - r.known) / r.left);
  // Acumulado ponderado por créditos (así lo calcula el polígrafo)
  const accum = (prevAvg, prevCred, pts, cr) => (prevAvg * prevCred + pts) / (prevCred + cr);
  // Nota que entra al promedio: definitiva si la materia ya cerró; si no, el tramo de cortes ya escritos.
  // null cuando no hay ninguna nota (esa materia no suma créditos).
  function grade(result) {
    if (!result || !(result.left < 1)) return null;
    if (result.final !== null) return result.final;
    const done = 1 - result.left;
    return done > 0 ? result.known / done : null;
  }
  // Créditos y promedio del resumen. La base es el acumulado anterior (0 si no hay).
  // Créditos = base + créditos de materias con nota. Promedio = accum sobre esa suma.
  // Sin base y sin notas: 0 créditos y promedio 0.
  function ponderado(baseAvg, baseCred, items) {
    let pts = 0, cr = 0;
    (items || []).forEach(it => {
      if (!(it.credits > 0) || !ok(it.grade)) return;
      pts += it.credits * it.grade;
      cr += it.credits;
    });
    const baseC = baseCred > 0 ? baseCred : 0;
    const baseA = ok(baseAvg) ? baseAvg : 0;
    const total = baseC + cr;
    if (!(total > 0)) return { cred: 0, avg: 0 };
    return { cred: total, avg: r2(accum(baseA, baseC, pts, cr)) };
  }
  const discount = (avg, tiers) => tiers.filter(t => avg >= t.prom).pop() || null;
  return { r1, r2, course, need, accum, grade, ponderado, discount };
})();
if (typeof module !== 'undefined') module.exports = Calc;

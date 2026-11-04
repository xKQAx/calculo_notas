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
  const discount = (avg, tiers) => tiers.filter(t => avg >= t.prom).pop() || null;
  return { r1, r2, course, need, accum, discount };
})();
if (typeof module !== 'undefined') module.exports = Calc;

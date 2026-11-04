// Reglas y plan de estudios. Si algo cambia en la universidad, se edita solo este archivo.
const MIN_APROBAR = 3.0;            // mínimo general para aprobar (confirmar)
const CORTES = [0.3, 0.3, 0.4];     // peso de cada corte
const DESCUENTOS = [                // acuerdo 005
  { prom: 4.3, pct: 20 },
  { prom: 4.5, pct: 40 },
  { prom: 4.7, pct: 45 }
];
const P = (name, credits, o = {}) => ({ name, credits, ...o });
const PENSUM = {
  1: [P('Competencias comunicativas', 2), P('Socioantropología', 2), P('Constitución política y legislación ambiental', 2), P('Química general', 3), P('Introducción a la ingeniería de software', 3), P('Cálculo diferencial', 4)],
  2: [P('Dibujo de ingeniería', 1), P('Metodología de la investigación', 2), P('Ética y valores', 2), P('Física mecánica', 3), P('Cálculo integral', 4)],
  3: [P('Física eléctrica', 3), P('Álgebra lineal', 3), P('Fundamentos de programación', 3), P('Modelos de proceso de software', 3), P('Cálculo multivariable', 4)],
  4: [P('Herramientas de modelado de software', 1), P('Fundamentos de electrónica', 2), P('Estadística descriptiva', 3), P('Matemática discreta', 3), P('Programación de computadores I', 3), P('Ecuaciones diferenciales', 4)],
  5: [P('Herramientas de ingeniería de software', 1), P('Estructura de datos', 2), P('Métodos numéricos', 2), P('Fundamentos de bases de datos', 2), P('Emprendimiento empresarial', 3), P('Programación de computadores II', 3), P('Requisitos de software', 3)],
  6: [P('Administración para ingenieros', 2), P('Diseño y análisis de algoritmos', 2), P('Organización de computadores', 2), P('Gestores de bases de datos', 2), P('Diseño de software I', 3), P('Redes y comunicaciones de datos', 3)],
  7: [P('Ingeniería económica', 2), P('Calidad de software', 2), P('Sistemas operativos', 2), P('Desarrollo e innovación tecnológica', 2), P('Diseño de software II', 3), P('Lenguajes de programación', 3)],
  8: [P('Formulación y evaluación de proyectos', 2), P('Construcción e integración de software', 3), P('Prueba de software', 3), P('Práctica empresarial', 6, { min: 3.5 })],
  9: [P('Interacción hombre-computador', 2), P('Configuración y mantenimiento de software', 2), P('Mejores prácticas de ingeniería de software', 3), P('Anteproyecto', 3), P('Gestión de proyectos de software', 4)],
  10: [P('Auditoría de software', 3), P('Seminario de actualización', 3), P('Trabajo de grado', 6, { min: 3.8, w: [1] })]
};

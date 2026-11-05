// Reglas y plan de estudios. Si algo cambia en la universidad, se edita solo este archivo.
const MIN_APROBAR = 3.0;            // mínimo general para aprobar (confirmar)
const CORTES = [0.3, 0.3, 0.4];     // peso de cada corte
const CREDITOS_SEMESTRE = 16;       // meta mínima de créditos por semestre
const CREDITOS_TOTAL = 160;         // meta total del plan
const DESCUENTOS = [                // acuerdo 005
  { prom: 4.3, pct: 20 },
  { prom: 4.5, pct: 40 },
  { prom: 4.7, pct: 45 }
];
const P = (name, credits, o = {}) => ({ name, credits, ...o });
// Plan de estudios con el código de Génesis de cada materia.
const PENSUM = {
  1: [
    P('Competencias comunicativas', 2, { code: '11131' }),
    P('Socioantropología', 2, { code: '23311' }),
    P('Constitución política y legislación ambiental', 2, { code: '29407' }),
    P('Química general', 3, { code: '16405' }),
    P('Introducción a la ingeniería de software', 3, { code: '37421' }),
    P('Cálculo diferencial', 4, { code: '16101' })
  ],
  2: [
    P('Dibujo de ingeniería', 1, { code: '20141' }),
    P('Metodología de la investigación', 2, { code: '22223' }),
    P('Ética y valores', 2, { code: '23334' }),
    P('Física mecánica', 3, { code: '16122' }),
    P('Cálculo integral', 4, { code: '16112' })
  ],
  3: [
    P('Física eléctrica', 3, { code: '16123' }),
    P('Álgebra lineal', 3, { code: '16133' }),
    P('Fundamentos de programación', 3, { code: '372301' }),
    P('Modelos de proceso de software', 3, { code: '372302' }),
    P('Cálculo multivariable', 4, { code: '16113' })
  ],
  4: [
    P('Herramientas de modelado de software', 1, { code: '372402' }),
    P('Fundamentos de electrónica', 2, { code: '371401' }),
    P('Estadística descriptiva', 3, { code: '16117' }),
    P('Matemática discreta', 3, { code: '371402' }),
    P('Programación de computadores I', 3, { code: '372401' }),
    P('Ecuaciones diferenciales', 4, { code: '16104' })
  ],
  5: [
    P('Herramientas de ingeniería de software', 1, { code: '372504' }),
    P('Estructura de datos', 2, { code: '372503' }),
    P('Métodos numéricos', 2, { code: '372505' }),
    P('Fundamentos de bases de datos', 2, { code: '372506' }),
    P('Emprendimiento empresarial', 3, { code: '371501' }),
    P('Programación de computadores II', 3, { code: '372501' }),
    P('Requisitos de software', 3, { code: '372502' })
  ],
  6: [
    P('Administración para ingenieros', 2, { code: '312310' }),
    P('Diseño y análisis de algoritmos', 2, { code: '372602' }),
    P('Organización de computadores', 2, { code: '372603' }),
    P('Gestores de bases de datos', 2, { code: '372605' }),
    P('Diseño de software I', 3, { code: '372601' }),
    P('Redes y comunicaciones de datos', 3, { code: '372604' })
  ],
  7: [
    P('Ingeniería económica', 2, { code: '15808' }),
    P('Calidad de software', 2, { code: '372703' }),
    P('Sistemas operativos', 2, { code: '372704' }),
    P('Desarrollo e innovación tecnológica', 2, { code: '372706' }),
    P('Diseño de software II', 3, { code: '372701' }),
    P('Lenguajes de programación', 3, { code: '372702' })
  ],
  8: [
    P('Formulación y evaluación de proyectos', 2, { code: '372804' }),
    P('Construcción e integración de software', 3, { code: '372801' }),
    P('Prueba de software', 3, { code: '372802' }),
    P('Práctica empresarial', 6, { code: '372803', min: 3.5 })
  ],
  9: [
    P('Interacción hombre-computador', 2, { code: '372901' }),
    P('Configuración y mantenimiento de software', 2, { code: '372902' }),
    P('Mejores prácticas de ingeniería de software', 3, { code: '372903' }),
    P('Anteproyecto', 3, { code: '372905' }),
    P('Gestión de proyectos de software', 4, { code: '372904' })
  ],
  10: [P('Auditoría de software', 3), P('Seminario de actualización', 3), P('Trabajo de grado', 6, { min: 3.8, w: [1] })]
};

// Electivas del periodo (sin horarios ni fechas). El código distingue grupos de la misma materia.
const ELECTIVAS = [
  { code: '063601-A', name: 'Simulación empresarial', credits: 2 },
  { code: '1154201-A', name: 'Agentes IA y automatización', credits: 2 },
  { code: '15406-A', name: 'Gestión de la compensación del talento humano', credits: 3 },
  { code: '15892-ANA', name: 'Tecnologías de gestión I (C. electivo)', credits: 3 },
  { code: '15941-ANA', name: 'Energías alternativas (curso electivo)', credits: 2 },
  { code: '19408-A', name: 'Negocios internacionales', credits: 2 },
  { code: '204010-A', name: 'Coaching para ingenieros', credits: 1 },
  { code: '20930-A', name: 'Interpretación de planos', credits: 1 },
  { code: '20932-A', name: 'Excel para ingenieros', credits: 1 },
  { code: '20932-C', name: 'Excel para ingenieros', credits: 1 },
  { code: '20932-D', name: 'Excel para ingenieros', credits: 1 },
  { code: '23603-A', name: 'Cátedra de la paz', credits: 2 },
  { code: '26936-B', name: 'Modelado y simulación', credits: 1 },
  { code: '26936-C', name: 'Modelado y simulación', credits: 1 },
  { code: '31489-A', name: 'Gestión ambiental y tecnológica', credits: 2 },
  { code: '372606-A', name: 'Ingeniería de prompts', credits: 2 },
  { code: '372606-B', name: 'Ingeniería de prompts', credits: 2 },
  { code: '372607-A', name: 'Informática forense y análisis de incidentes', credits: 2 }
];

// Inglés e informática: no tienen créditos y no entran al promedio.
// Se guardan con su código para usarlos más adelante si hace falta.
const CURSOS_SIN_CREDITO = {
  ingles: [
    { code: '9311', name: 'Inglés I' },
    { code: '9312', name: 'Inglés II' },
    { code: '9313', name: 'Inglés III' },
    { code: '9314', name: 'Inglés IV' },
    { code: '9315', name: 'Inglés V' },
    { code: '9316', name: 'Inglés VI' },
    { code: '9317', name: 'Inglés VII' },
    { code: '9318', name: 'Inglés VIII' }
  ],
  informatica: [
    { code: '8220', name: 'Administración de recursos informáticos' },
    { code: '8106', name: 'Computación móvil' },
    { code: '8696', name: 'Diseño básico de aplicaciones en Java' },
    { code: '8204', name: "Mantenimiento básico PC's" },
    { code: '8673', name: 'Gestión de bases de datos' },
    { code: '8206', name: 'Excel básico' },
    { code: '8695', name: 'Tecnologías de la información' }
  ]
};

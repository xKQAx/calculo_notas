# Calculadora de notas UDES

Web estática (HTML, CSS y JS) para estudiantes de Ingeniería de Software. Sin base de datos: lo que se escribe solo se guarda en el navegador.

## Estructura

- index.html: la página
- css/styles.css: estilos
- js/data.js: reglas y plan de estudios (aquí se editan mínimos, descuentos y materias)
- js/calc.js: fórmulas
- js/app.js: pantalla

## Polígrafos y exportación

- js/poligrafo.js lee el texto de un polígrafo (PDF de Génesis). No guarda nombre ni código del estudiante.
- js/importar.js carga los PDF, arma el historial y exporta a Excel o JSON. El JSON se puede volver a cargar.
- Los PDF se leen en el navegador con pdf.js y el Excel se genera con SheetJS, ambos desde cdnjs (versiones fijas).

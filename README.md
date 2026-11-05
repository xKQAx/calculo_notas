# Calculadora de notas UDES

Web estática (HTML, CSS y JS) para estudiantes de Ingeniería de Software. Sin base de datos: lo que se escribe solo se guarda en el navegador.

## Estructura

- index.html: la página
- css/styles.css: estilos
- js/data.js: reglas y plan de estudios (aquí se editan mínimos, descuentos y materias)
- js/calc.js: fórmulas
- js/app.js: pantalla

## Semestres extra

Si el estudiante se atrasa, el botón `+` al final de la barra agrega semestres después del 10.º. En ellos las materias se agregan a mano (nombre y créditos) y el semestre se puede quitar con «Quitar este semestre».

## Electivas

- El catálogo está en `ELECTIVAS`, dentro de `js/data.js` (código, nombre y créditos del periodo; sin horarios ni fechas).
- En la calculadora se agregan con un clic. Si una electiva no está en la lista, se puede escribir a mano con su código.

## Códigos

- Cada materia de `PENSUM` tiene su código de Génesis en `code`; la tabla lo muestra junto al mínimo.
- Inglés e informática (sin créditos) quedaron guardados en `CURSOS_SIN_CREDITO`, dentro de `js/data.js`, para usarlos más adelante.

## Polígrafos y exportación

- js/poligrafo.js lee el texto de un polígrafo (PDF de Génesis). No guarda nombre ni código del estudiante.
- js/importar.js carga los PDF, arma el historial y exporta a Excel o JSON. El JSON se puede volver a cargar.
- Los PDF se leen en el navegador con pdf.js y el Excel se genera con SheetJS, ambos desde cdnjs (versiones fijas).

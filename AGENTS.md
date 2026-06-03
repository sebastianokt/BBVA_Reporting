# AGENTS.md

## Descripción del proyecto

Este proyecto se llama **GRAFICAS PROCESOS**. Su objetivo es mostrar datos relacionados con procesos de migración mediante dashboards, gráficas, tablas y validadores usando archivos Excel como fuente de datos.

El sistema carga archivos `.xlsx` desde `assets/data`, procesa la información en JavaScript y la presenta visualmente en páginas HTML.

## Stack

- HTML
- CSS
- JavaScript puro
- Archivos Excel `.xlsx` como fuente de datos
- Dashboard con gráficas, KPIs, tablas y validadores

## Estructura del proyecto

### assets/data/

Contiene los archivos Excel usados como fuente principal de información:

- procesos-migracion-propia.xlsx


### docs/

Documentación o referencias del proyecto.

- referencia.html

### src/app/

Lógica principal de las páginas.

- dashboard.js: inicializa y controla el dashboard principal.
- validador.js: controla la lógica del validador.

### src/components/

Componentes visuales reutilizables.

- charts.js: creación y actualización de gráficas.
- kpis.js: indicadores principales.
- schedule.js: cronogramas o planificación.
- sidebar.js: navegación lateral.
- tables.js: renderizado de tablas.
- ui-state.js: manejo de estado visual de la interfaz.

### src/config/

Configuración general.

- constants.js: constantes globales del proyecto.

### src/data/

Carga, lectura y transformación de datos.

- excel-loader.js: carga archivos Excel.
- migration-rules.js: reglas relacionadas con la migración.
- process-parser.js: parseo y normalización de procesos.

### src/services/

Servicios y lógica de negocio.

- filters.js: filtros de información.
- format.js: formateo de datos.
- metrics.js: cálculo de métricas y KPIs.
- storage.js: manejo de persistencia local.
- team-assignment.js: asignación o distribución por equipos/personas.

### styles/

Estilos del proyecto.

- base.css
- components.css
- dashboard.css
- layout.css
- validator.css

## Archivos principales

- index.html: entrada principal del dashboard.
- validador.html: página del validador.

## Reglas para trabajar en este proyecto

- Mantener JavaScript modular.
- No mezclar lógica de datos con lógica visual si ya existe una separación en `src/data`, `src/services` y `src/components`.
- Antes de modificar una función, revisar en qué archivo corresponde según su responsabilidad.
- No cambiar nombres de archivos Excel sin actualizar las referencias en el código.
- Mantener compatibilidad con ejecución local en navegador.
- Evitar dependencias innecesarias si el proyecto ya funciona con JavaScript puro.
- Cuando se agreguen nuevas métricas, ubicarlas preferiblemente en `src/services/metrics.js`.
- Cuando se agreguen nuevas gráficas, ubicarlas preferiblemente en `src/components/charts.js`.
- Cuando se agreguen nuevos filtros, ubicarlos en `src/services/filters.js`.
- Cuando se cambie la estructura de los Excel, revisar también:
  - excel-loader.js
  - process-parser.js
  - migration-rules.js
  - metrics.js

## Cómo debe responder Codex

Cuando se le pidan cambios en este proyecto:

1. Primero debe identificar qué parte del proyecto se ve afectada.
2. Debe respetar la estructura existente.
3. Debe entregar código completo del archivo modificado cuando sea necesario.
4. Debe evitar reescribir todo el proyecto si solo se necesita un cambio puntual.
5. Debe explicar brevemente qué archivo cambió y por qué.
6. Si necesita asumir columnas de Excel, debe indicarlo claramente.
7. Si una columna no está confirmada, debe pedir el nombre exacto antes de modificar la lógica.

## Objetivo funcional

El proyecto debe permitir visualizar el avance de migraciones, procesos, reparticiones, validaciones y métricas operativas usando los datos cargados desde Excel.

Las vistas principales deben enfocarse en:

- Avances de migración.
- Estado de procesos.
- KPIs generales.
- Tablas filtrables.
- Gráficas claras.
- Validación de datos.
- Distribución o asignación por equipo.

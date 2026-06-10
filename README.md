# GRAFICAS PROCESOS

Dashboard estatico para visualizar avance de migracion, procesos, cronograma, KPIs, graficas y validaciones usando Google Sheets como fuente principal.

## Publicacion

El proyecto esta pensado para publicarse en GitHub Pages. No requiere backend Python para el uso normal.

- Entrada principal: `index.html`
- Validador: `validator.html`
- Fuente principal: Google Sheets exportado como XLSX
- Fallback manual: boton `Cargar Excel`

## Fuente de datos

El dashboard carga el archivo desde la URL configurada en `src/config/constants.js`:

```js
export const GOOGLE_SHEET_ID = "ID_DEL_SHEET";
export const GOOGLE_SHEET_XLSX_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=xlsx`;
```

El Google Sheet debe mantener estas hojas:

- `Hoja 1`: procesos principales.
- `Cronograma`: planificacion semanal.
- `Comentarios`: novedades por proceso.

La hoja `Comentarios` debe tener estas columnas:

```text
ID_PROCESO | Comentarios | Fecha | Usuario
```

## Guardado de novedades

GitHub Pages puede leer el XLSX publicado, pero no puede escribir directamente en Google Sheets. Para guardar novedades se usa Google Apps Script.

1. Crear un Apps Script asociado al Google Sheet.
2. Copiar el contenido de `docs/google-apps-script-comentarios.js`.
3. Publicarlo como Web App.
4. Pegar la URL en `src/config/constants.js`:

```js
export const GOOGLE_APPS_SCRIPT_URL = "URL_DEL_WEB_APP";
```

El guardado reemplaza el comentario vigente por `ID_PROCESO`.

## Desarrollo local opcional

Se puede abrir `index.html` directamente o usar un servidor estatico local. `server.py` queda como herramienta opcional para pruebas locales antiguas, no como requisito para GitHub Pages.

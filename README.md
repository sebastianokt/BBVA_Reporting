# GRAFICAS PROCESOS
d
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
- `Fredy`: planificacion mensual de Migracion Fredy.
- `Comentarios`: novedades por proceso.

La hoja `Fredy` debe tener estas columnas:

```text
ID_PROCESO | Mes | Persona | Cliente | Proceso | Estado
```

La hoja `Comentarios` debe tener estas columnas:

```text
ID_PROCESO | Comentarios | Fecha | Usuario
```

## Guardado de novedades y estados

GitHub Pages puede leer el XLSX publicado, pero no puede escribir directamente en Google Sheets. Para guardar novedades y cambios de estado se usa Google Apps Script.

1. Crear un Apps Script asociado al Google Sheet.
2. Copiar el contenido de `docs/google-apps-script-comentarios.js`.
3. Publicarlo como Web App.
4. Pegar la URL en `src/config/constants.js`:

```js
export const GOOGLE_APPS_SCRIPT_URL = "URL_DEL_WEB_APP";
```

El guardado reemplaza el comentario vigente por `ID_PROCESO`.

Cuando se cambia el estado desde la tabla de procesos en Recoveries, el Apps Script limpia las columnas `Ya migrado`, `En proceso` y `Validando` del proceso correspondiente. Luego marca solo la columna del nuevo estado:

- `Falta migrar`: deja las tres columnas vacias.
- `Validando`: escribe `1` en `Validando`.
- `En proceso`: escribe `1` en `En proceso`.
- `Ya se migró`: escribe `ya` en `Ya migrado`.

Cuando se cambia el estado en Migracion Fredy, el Apps Script actualiza la columna `Estado` de la hoja `Fredy`. Los estados validos para esa vista son:

- `No ha iniciado la migracion`
- `Falta insumos`
- `Insumos entregados`
- `Comentarios insumos`
- `Falta VoBo de insumos`
- `VoBo de insumos`
- `Falta VoBo de procesos`
- `VoBo de proceso`
- `Ya migrado`

Si `Estado` viene vacio en la hoja `Fredy`, el dashboard lo muestra como `No ha iniciado la migracion`.

## Desarrollo local opcional

Se puede abrir `index.html` directamente o usar un servidor estatico local. `server.py` queda como herramienta opcional para pruebas locales antiguas, no como requisito para GitHub Pages.

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import argparse
import hashlib
import json
import mimetypes
from pathlib import Path
import sqlite3
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "data" / "migration_dashboard.sqlite"


def get_connection():
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS imports (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              file_name TEXT NOT NULL,
              file_hash TEXT NOT NULL,
              imported_by TEXT,
              imported_at TEXT DEFAULT CURRENT_TIMESTAMP,
              notes TEXT
            );

            CREATE TABLE IF NOT EXISTS processes (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              id_proceso TEXT UNIQUE,
              tipo_proceso TEXT,
              nombre_proceso TEXT,
              estado_actual TEXT,
              persona_actual TEXT,
              semana_planificada TEXT,
              fuente_excel TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS schedule_items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              id_proceso TEXT,
              semana TEXT,
              persona TEXT,
              actividad TEXT,
              fecha_importacion TEXT DEFAULT CURRENT_TIMESTAMP,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS process_status_snapshots (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              id_proceso TEXT,
              estado TEXT,
              columna_origen TEXT,
              valor_origen TEXT,
              fecha_importacion TEXT DEFAULT CURRENT_TIMESTAMP,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS history_events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              entity_type TEXT,
              entity_id TEXT,
              event_type TEXT,
              field_name TEXT,
              old_value TEXT,
              new_value TEXT,
              source TEXT,
              user_name TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS validation_runs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              validation_name TEXT,
              status TEXT,
              summary TEXT,
              executed_by TEXT,
              executed_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS validation_results (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              run_id INTEGER,
              item_reference TEXT,
              status TEXT,
              message TEXT,
              observations TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY(run_id) REFERENCES validation_runs(id)
            );
            """
        )


def rows_to_dicts(rows):
    return [dict(row) for row in rows]


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        clean_path = urlparse(path).path.lstrip("/")
        return str((ROOT / clean_path).resolve())

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def write_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            self.write_json({"ok": True})
            return
        if path == "/api/history":
            with get_connection() as conn:
                rows = conn.execute(
                    "SELECT * FROM history_events ORDER BY datetime(created_at) DESC, id DESC LIMIT 500"
                ).fetchall()
            self.write_json({"events": rows_to_dicts(rows)})
            return
        if path == "/api/validations":
            with get_connection() as conn:
                rows = conn.execute(
                    "SELECT * FROM validation_runs ORDER BY datetime(executed_at) DESC, id DESC LIMIT 100"
                ).fetchall()
            self.write_json({"runs": rows_to_dicts(rows)})
            return
        if path == "/":
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/history":
            payload = self.read_json()
            with get_connection() as conn:
                cursor = conn.execute(
                    """
                    INSERT INTO history_events
                      (entity_type, entity_id, event_type, field_name, old_value, new_value, source, user_name, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
                    """,
                    (
                        payload.get("entityType"),
                        payload.get("entityId"),
                        payload.get("eventType"),
                        payload.get("fieldName"),
                        payload.get("oldValue"),
                        payload.get("newValue"),
                        payload.get("source"),
                        payload.get("userName"),
                        payload.get("createdAt"),
                    ),
                )
                event = conn.execute("SELECT * FROM history_events WHERE id = ?", (cursor.lastrowid,)).fetchone()
            self.write_json({"event": dict(event)})
            return

        if path == "/api/imports":
            payload = self.read_json()
            snapshot = payload.get("snapshot") or {}
            snapshot_hash = hashlib.sha256(json.dumps(snapshot, sort_keys=True).encode("utf-8")).hexdigest()
            with get_connection() as conn:
                cursor = conn.execute(
                    "INSERT INTO imports (file_name, file_hash, imported_by, notes) VALUES (?, ?, ?, ?)",
                    (
                        payload.get("fileName"),
                        snapshot_hash,
                        payload.get("importedBy"),
                        payload.get("notes"),
                    ),
                )
                import_id = cursor.lastrowid
                conn.execute(
                    """
                    INSERT INTO history_events
                      (entity_type, entity_id, event_type, field_name, old_value, new_value, source, user_name)
                    VALUES ('import', ?, 'import', 'file', '', ?, 'excel', ?)
                    """,
                    (
                        str(import_id),
                        f"{payload.get('fileName')}: {payload.get('processCount', 0)} procesos, {payload.get('scheduleCount', 0)} cronograma",
                        payload.get("importedBy"),
                    ),
                )
                for process in snapshot.get("processes", []):
                    process_id = str(process.get("idProceso") or "")
                    old = conn.execute(
                        "SELECT estado_actual, persona_actual, semana_planificada FROM processes WHERE id_proceso = ?",
                        (process_id,),
                    ).fetchone()
                    values = {
                        "estado_actual": process.get("estadoActual"),
                        "persona_actual": process.get("personaActual"),
                        "semana_planificada": process.get("semanaPlanificada"),
                    }
                    if old:
                        for field, new_value in values.items():
                            old_value = old[field]
                            if str(old_value or "") != str(new_value or ""):
                                conn.execute(
                                    """
                                    INSERT INTO history_events
                                      (entity_type, entity_id, event_type, field_name, old_value, new_value, source, user_name)
                                    VALUES ('process', ?, 'change_detected', ?, ?, ?, 'excel', ?)
                                    """,
                                    (process_id, field, old_value, new_value, payload.get("importedBy")),
                                )
                    conn.execute(
                        """
                        INSERT INTO processes
                          (id_proceso, tipo_proceso, nombre_proceso, estado_actual, persona_actual, semana_planificada, fuente_excel)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(id_proceso) DO UPDATE SET
                          tipo_proceso = excluded.tipo_proceso,
                          nombre_proceso = excluded.nombre_proceso,
                          estado_actual = excluded.estado_actual,
                          persona_actual = excluded.persona_actual,
                          semana_planificada = excluded.semana_planificada,
                          fuente_excel = excluded.fuente_excel,
                          updated_at = CURRENT_TIMESTAMP
                        """,
                        (
                            process_id,
                            process.get("tipoProceso"),
                            process.get("nombreProceso"),
                            process.get("estadoActual"),
                            process.get("personaActual"),
                            process.get("semanaPlanificada"),
                            payload.get("fileName"),
                        ),
                    )
                    conn.execute(
                        """
                        INSERT INTO process_status_snapshots (id_proceso, estado, columna_origen, valor_origen)
                        VALUES (?, ?, ?, ?)
                        """,
                        (process_id, process.get("estadoActual"), "Hoja 1", process.get("estadoActual")),
                    )
                for item in snapshot.get("scheduleEntries", []):
                    conn.execute(
                        """
                        INSERT INTO schedule_items (id_proceso, semana, persona, actividad)
                        VALUES (?, ?, ?, ?)
                        """,
                        (item.get("idProceso"), item.get("semana"), item.get("persona"), item.get("actividad")),
                    )
                row = conn.execute("SELECT * FROM imports WHERE id = ?", (import_id,)).fetchone()
            self.write_json({"import": dict(row)})
            return

        if path == "/api/validations":
            payload = self.read_json()
            with get_connection() as conn:
                cursor = conn.execute(
                    """
                    INSERT INTO validation_runs (validation_name, status, summary, executed_by)
                    VALUES (?, ?, ?, ?)
                    """,
                    (
                        payload.get("validationName"),
                        payload.get("status"),
                        payload.get("summary"),
                        payload.get("executedBy"),
                    ),
                )
                run_id = cursor.lastrowid
                for result in payload.get("results", []):
                    conn.execute(
                        """
                        INSERT INTO validation_results
                          (run_id, item_reference, status, message, observations)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        (
                            run_id,
                            result.get("itemReference"),
                            result.get("status"),
                            result.get("message"),
                            result.get("observations"),
                        ),
                    )
                row = conn.execute("SELECT * FROM validation_runs WHERE id = ?", (run_id,)).fetchone()
            self.write_json({"run": dict(row)})
            return

        self.write_json({"error": "Not found"}, status=404)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Servidor local del dashboard de migracion.")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    mimetypes.add_type("text/javascript", ".js")
    init_db()
    server = ThreadingHTTPServer(("localhost", args.port), Handler)
    print(f"Dashboard disponible en http://localhost:{args.port}")
    print(f"SQLite: {DB_PATH}")
    server.serve_forever()

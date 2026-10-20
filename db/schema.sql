CREATE TABLE IF NOT EXISTS app_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL DEFAULT 0,
  database_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'seed',
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  floor INTEGER NOT NULL CHECK (floor BETWEEN 1 AND 3),
  rate INTEGER NOT NULL CHECK (rate BETWEEN 500 AND 100000),
  type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('normal', 'repair'))
) STRICT;
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT,
  room_id TEXT NOT NULL REFERENCES rooms(id),
  move_in TEXT NOT NULL,
  deposit INTEGER NOT NULL CHECK (deposit BETWEEN 0 AND 200000),
  active INTEGER NOT NULL CHECK (active IN (0, 1)),
  moved_out_at TEXT
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_active_room ON tenants(room_id) WHERE active = 1;
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY, month TEXT NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  room_id TEXT NOT NULL REFERENCES rooms(id), name TEXT NOT NULL,
  rent INTEGER NOT NULL CHECK (rent BETWEEN 0 AND 100000),
  water INTEGER NOT NULL CHECK (water BETWEEN 0 AND 100000),
  electric INTEGER NOT NULL CHECK (electric BETWEEN 0 AND 100000),
  paid INTEGER NOT NULL CHECK (paid IN (0, 1)), paid_at TEXT,
  method TEXT NOT NULL CHECK (method IN ('เงินสด', 'โอนเงิน')),
  due_at TEXT NOT NULL,
  CHECK ((paid = 1 AND paid_at IS NOT NULL) OR (paid = 0 AND paid_at IS NULL)),
  UNIQUE (tenant_id, month)
) STRICT;
CREATE INDEX IF NOT EXISTS idx_invoices_month_room ON invoices(month DESC, room_id);
CREATE TABLE IF NOT EXISTS mutations (id TEXT PRIMARY KEY, payload_hash TEXT NOT NULL, revision INTEGER NOT NULL) STRICT;
PRAGMA user_version = 1;

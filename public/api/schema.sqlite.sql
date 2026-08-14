PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  was_successful INTEGER NOT NULL DEFAULT 0,
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_login_guard ON admin_login_attempts (email, ip_address, attempted_at);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT 'code',
  short_description TEXT NULL,
  description TEXT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  seo_title TEXT NULL,
  seo_description TEXT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_categories_public ON categories (is_active, display_order, name);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  service_type TEXT NOT NULL DEFAULT 'custom_quote',
  icon TEXT NOT NULL DEFAULT 'code',
  short_description TEXT NULL,
  description TEXT NULL,
  price_type TEXT NOT NULL DEFAULT 'custom_quote',
  base_price REAL NULL,
  sale_price REAL NULL,
  pages_included INTEGER NULL,
  delivery_time TEXT NULL,
  revisions TEXT NULL,
  image TEXT NULL,
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  cta_text TEXT NOT NULL DEFAULT 'View Service',
  seo_title TEXT NULL,
  seo_description TEXT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
CREATE INDEX IF NOT EXISTS idx_services_public ON services (category_id, is_active, display_order);

CREATE TABLE IF NOT EXISTS service_features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_service_features_service ON service_features (service_id, display_order, id);

CREATE TABLE IF NOT EXISTS addons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT NULL,
  price REAL NULL,
  pricing_type TEXT NOT NULL DEFAULT 'fixed',
  pricing_unit TEXT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS addon_categories (
  addon_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (addon_id, category_id),
  FOREIGN KEY (addon_id) REFERENCES addons(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS service_addons (
  service_id INTEGER NOT NULL,
  addon_id INTEGER NOT NULL,
  PRIMARY KEY (service_id, addon_id),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (addon_id) REFERENCES addons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT NULL,
  country TEXT NULL,
  business_type TEXT NULL,
  project_description TEXT NOT NULL,
  preferred_contact TEXT NOT NULL DEFAULT 'whatsapp',
  total_amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'New',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_status_date ON orders (status, created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  service_id INTEGER NULL,
  service_name TEXT NOT NULL,
  service_slug TEXT NOT NULL,
  unit_price REAL NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  line_total REAL NOT NULL,
  service_snapshot TEXT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_addons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_item_id INTEGER NOT NULL,
  addon_id INTEGER NULL,
  addon_name TEXT NOT NULL,
  unit_price REAL NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  line_total REAL NOT NULL,
  addon_snapshot TEXT NULL,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  FOREIGN KEY (addon_id) REFERENCES addons(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id TEXT NOT NULL UNIQUE,
  visitor_token_hash TEXT NOT NULL UNIQUE,
  visitor_name TEXT NOT NULL,
  visitor_email TEXT NULL,
  visitor_ip TEXT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  unread_admin INTEGER NOT NULL DEFAULT 0,
  unread_visitor INTEGER NOT NULL DEFAULT 0,
  last_message_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chat_inbox ON chat_conversations (status, last_message_at);
CREATE INDEX IF NOT EXISTS idx_chat_ip ON chat_conversations (visitor_ip, created_at);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  sender TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_chat_messages ON chat_messages (conversation_id, id);

CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_hash TEXT NOT NULL,
  path TEXT NOT NULL,
  title TEXT NULL,
  referrer TEXT NULL,
  user_agent TEXT NULL,
  ip_hash TEXT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views (path, created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views (visitor_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views (created_at);

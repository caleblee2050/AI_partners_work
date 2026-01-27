import { getDb } from './db';

async function init() {
  const db = getDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT,
      doc_date TEXT,
      project_title TEXT,
      items TEXT, -- JSON string
      subtotal INTEGER,
      vat INTEGER,
      discount_name TEXT,
      discount_amount INTEGER,
      is_percent_discount INTEGER, -- 0 for false, 1 for true
      total INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Database initialized');
}

init().catch(console.error);

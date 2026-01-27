import { db } from './db';

async function init() {
    await db.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT,
      doc_date TEXT,
      project_title TEXT,
      items TEXT, -- JSON string
      subtotal INTEGER,
      vat INTEGER,
      total INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    console.log('Database initialized');
}

init().catch(console.error);

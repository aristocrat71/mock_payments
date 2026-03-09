const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'payments.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id          TEXT PRIMARY KEY,
    amount      INTEGER NOT NULL,
    currency    TEXT DEFAULT 'INR',
    description TEXT,
    status      TEXT DEFAULT 'pending',
    webhook_url TEXT,
    created_at  TEXT NOT NULL,
    settles_at  TEXT NOT NULL,
    settled_at  TEXT,
    type        TEXT DEFAULT 'vanilla',
    format      TEXT DEFAULT 'scheduled',
    card_last4        TEXT,
    card_expiry       TEXT,
    card_holder       TEXT,
    ach_routing       TEXT,
    ach_account_last4 TEXT,
    ach_account_type  TEXT
  )
`);

function createPayment(payment) {
  const stmt = db.prepare(`
    INSERT INTO payments (
      id, amount, currency, description, status, webhook_url, created_at, settles_at,
      type, format, card_last4, card_expiry, card_holder,
      ach_routing, ach_account_last4, ach_account_type
    )
    VALUES (
      @id, @amount, @currency, @description, @status, @webhook_url, @created_at, @settles_at,
      @type, @format, @card_last4, @card_expiry, @card_holder,
      @ach_routing, @ach_account_last4, @ach_account_type
    )
  `);
  stmt.run(payment);
  return getPayment(payment.id);
}

function getPayment(id) {
  return db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
}

function getPendingSettlements() {
  return db.prepare(`
    SELECT * FROM payments
    WHERE status = 'pending' AND datetime(settles_at) <= datetime('now')
  `).all();
}

function markSettled(id, settled_at) {
  db.prepare(`
    UPDATE payments SET status = 'settled', settled_at = ? WHERE id = ?
  `).run(settled_at, id);
  return getPayment(id);
}

function getPaymentStatus(id) {
  return db.prepare(`
    SELECT id, status, format, settles_at, settled_at FROM payments WHERE id = ?
  `).get(id) || null;
}

module.exports = { createPayment, getPayment, getPendingSettlements, markSettled, getPaymentStatus };

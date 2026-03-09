require('dotenv').config();
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { createPayment, getPayment } = require('./db');
const { startScheduler } = require('./scheduler');

const app = express();
app.use(express.json());

const VALID_TYPES = ['vanilla', 'card', 'ach'];
const VALID_FORMATS = ['instant', 'scheduled'];

function validateCard(card) {
  if (!card || typeof card !== 'object') return 'card object is required for type=card';
  if (!/^\d{13,19}$/.test(card.number)) return 'card.number must be 13-19 digits';
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry)) return 'card.expiry must be MM/YY';
  const [mm, yy] = card.expiry.split('/').map(Number);
  const exp = new Date(2000 + yy, mm - 1, 1);
  if (exp <= new Date()) return 'card.expiry is in the past';
  if (!/^\d{3,4}$/.test(card.cvv)) return 'card.cvv must be 3-4 digits';
  if (!card.holder_name || !card.holder_name.trim()) return 'card.holder_name is required';
  return null;
}

function validateAch(ach) {
  if (!ach || typeof ach !== 'object') return 'ach object is required for type=ach';
  if (!/^\d{9}$/.test(ach.routing_number)) return 'ach.routing_number must be exactly 9 digits';
  if (!/^\d{4,17}$/.test(ach.account_number)) return 'ach.account_number must be 4–17 digits';
  if (!['checking', 'savings'].includes(ach.account_type)) return 'ach.account_type must be checking or savings';
  return null;
}

app.post('/payments', (req, res) => {
  const { amount, currency, description, webhook_url, type = 'vanilla', format = 'scheduled', card, ach } = req.body;

  if (!amount || !webhook_url) {
    return res.status(400).json({ error: 'amount and webhook_url are required' });
  }
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
  }
  if (!VALID_FORMATS.includes(format)) {
    return res.status(400).json({ error: `format must be one of: ${VALID_FORMATS.join(', ')}` });
  }

  let card_last4 = null, card_expiry = null, card_holder = null;
  let ach_routing = null, ach_account_last4 = null, ach_account_type = null;

  if (type === 'card') {
    const err = validateCard(card);
    if (err) return res.status(400).json({ error: err });
    card_last4 = card.number.slice(-4);
    card_expiry = card.expiry;
    card_holder = card.holder_name.trim();
  }

  if (type === 'ach') {
    const err = validateAch(ach);
    if (err) return res.status(400).json({ error: err });
    ach_routing = ach.routing_number;
    ach_account_last4 = ach.account_number.slice(-4);
    ach_account_type = ach.account_type;
  }

  const now = new Date();
  const delay = format === 'instant'
    ? parseInt(process.env.INSTANT_SETTLE_DELAY_MS || '3000')
    : parseInt(process.env.SETTLEMENT_DELAY_MS);
  const settles_at = new Date(now.getTime() + delay).toISOString();

  const payment = createPayment({
    id: 'pay_' + uuidv4().replace(/-/g, '').slice(0, 10),
    amount,
    currency: currency || 'INR',
    description: description || null,
    status: 'pending',
    webhook_url,
    created_at: now.toISOString(),
    settles_at,
    type,
    format,
    card_last4,
    card_expiry,
    card_holder,
    ach_routing,
    ach_account_last4,
    ach_account_type,
  });

  res.status(201).json(payment);
});

app.get('/payments/:id', (req, res) => {
  const payment = getPayment(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  res.json(payment);
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`[server] Running on port ${PORT}`);
  startScheduler();
});

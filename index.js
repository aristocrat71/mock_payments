require('dotenv').config();
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { createPayment, getPayment } = require('./db');
const { startScheduler } = require('./scheduler');

const app = express();
app.use(express.json());

app.post('/payments', (req, res) => {
  const { amount, currency, description, webhook_url } = req.body;

  if (!amount || !webhook_url) {
    return res.status(400).json({ error: 'amount and webhook_url are required' });
  }

  const now = new Date();
  const delay = parseInt(process.env.SETTLEMENT_DELAY_MS);
  const settles_at = new Date(now.getTime() + delay).toISOString();

  const payment = createPayment({
    id: 'pay_' + uuidv4().replace(/-/g, '').slice(0, 10),
    amount,
    currency: currency,
    description: description || null,
    status: 'pending',
    webhook_url,
    created_at: now.toISOString(),
    settles_at,
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

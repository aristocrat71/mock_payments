const axios = require('axios');

async function sendWebhook(payment) {
  const payload = {
    event: 'payment.settled',
    payment_id: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    settled_at: payment.settled_at,
  };

  const attempt = async () => {
    await axios.post(payment.webhook_url, payload, { timeout: 5000 });
    console.log(`[webhook] Delivered to ${payment.webhook_url} for ${payment.id}`);
  };

  try {
    await attempt();
  } catch (err) {
    console.warn(`[webhook] First attempt failed for ${payment.id}, retrying...`);
    try {
      await attempt();
    } catch (retryErr) {
      console.error(`[webhook] Retry failed for ${payment.id}: ${retryErr.message}`);
    }
  }
}

module.exports = { sendWebhook };

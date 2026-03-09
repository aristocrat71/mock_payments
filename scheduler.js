const { getPendingSettlements, markSettled, getPaymentStatus } = require('./db');
const { sendWebhook } = require('./webhook');

function startScheduler() {
  const interval = parseInt(process.env.POLL_INTERVAL_MS);

  setInterval(async () => {
    const due = getPendingSettlements();
    if (due.length === 0) {
      console.log('[scheduler] No payments to settle');
      return;
    }

    console.log(`[scheduler] Settling ${due.length} payment(s)...`);

    for (const payment of due) {
      const statusCheck = getPaymentStatus(payment.id);
      if (!statusCheck || statusCheck.status !== 'pending') continue;
      const settled_at = new Date().toISOString();
      const settled = markSettled(payment.id, settled_at);
      await sendWebhook(settled);
    }
  }, interval);

  console.log(`[scheduler] Started, polling every ${interval}ms`);
}

module.exports = { startScheduler };

const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  console.log('[receiver] Webhook received:');
  console.log(JSON.stringify(req.body, null, 2));
  res.status(200).json({ received: true });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`[receiver] Listening on port ${PORT}`);
});

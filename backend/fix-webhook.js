const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

const oldWebhook = `app.post('/api/webhook/wasender', async (req, res) => {
      try {
          const data = req.body;
          console.log('Webhook WasenderAPI:', JSON.stringify(data).substring(0, 500));
          res.status(200).json({ success: true });
      } catch (error) { console.error('Erro webhook WasenderAPI:', error); res.status(200).json({ success: true }); }
  });`;

const newWebhook = `app.post('/api/webhook/wasender', async (req, res) => {
      try {
          const data = req.body;
          console.log('Webhook WasenderAPI:', JSON.stringify(data).substring(0, 500));
          
          // Atualizar status da mensagem (entregue/lida)
          if (data.event === 'message-receipt.update' || data.event === 'messages.update') {
              const msgId = data.data && data.data.id ? data.data.id : (data.id || data.msgId);
              const receipt = data.data && data.data.receipt ? data.data.receipt : data.receipt;
              if (msgId && receipt) {
                  let status = 'enviada';
                  if (receipt === 'delivered' || receipt === 'server') status = 'entregue';
                  if (receipt === 'read' || receipt === 'played') status = 'lida';
                  await pool.query("UPDATE whatsapp_mensagens SET status = $1 WHERE message_id = $2", [status, msgId.toString()]);
                  console.log('WasenderAPI Status atualizado:', msgId, '->', status);
              }
          }
          
          // Mensagem recebida
          if (data.event === 'messages.received' || data.event === 'message.received') {
              const msg = data.data || data;
              const telefone = msg.from || msg.phone || msg.sender;
              const texto = msg.text || msg.message || msg.body || '';
              const msgId = msg.id || msg.msgId || ('wasender_' + Date.now());
              if (telefone && texto) {
                  await pool.query(
                      "INSERT INTO whatsapp_mensagens (message_id, telefone, mensagem, tipo, direcao, status, instancia_id) VALUES ($1, $2, $3, 'text', 'recebida', 'recebida', 2) ON CONFLICT (message_id) DO NOTHING",
                      [msgId.toString(), telefone.replace('@s.whatsapp.net', ''), texto]
                  );
                  console.log('WasenderAPI Mensagem recebida:', telefone);
              }
          }
          
          res.status(200).json({ success: true });
      } catch (error) { console.error('Erro webhook WasenderAPI:', error); res.status(200).json({ success: true }); }
  });`;

content = content.replace(oldWebhook, newWebhook);
fs.writeFileSync('server.js', content);
console.log('Webhook WasenderAPI atualizado com status!');

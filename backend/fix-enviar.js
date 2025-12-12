const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

const oldEndpoint = `app.post('/api/whatsapp/enviar', auth, async (req, res) => {
    console.log('Enviando WhatsApp - Instance:', ZAPI_INSTANCE_ID, 'Token:', ZAPI_TOKEN ? 'OK' : 'VAZIO');
    try {
      const { telefone, mensagem, lead_id, vendedor_id, nome_contato } = req.body;
      if (!telefone || !mensagem) return res.status(400).json({ error: 'Telefone e mensagem obrigatorios' });

      let tel = telefone;
      // Se for grupo ou LID, manter original. Se for telefone normal, formatar
      if (tel.includes("@") || tel.includes("-group") || tel.length > 15) {
          // Grupo ou LID - manter original
      } else {
          tel = tel.replace(/\\D/g, "");
          if (tel.length > 0 && tel.substring(0,2) !== "55") tel = "55" + tel;
      }

      const fetch = require('node-fetch');
      const response = await fetch('https://api.z-api.io/instances/' + ZAPI_INSTANCE_ID + '/token/' + ZAPI_TOKEN + '/send-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Client-Token': 'F4cb60f10f1a94c1d999839ef72ca6f4bS' },
        body: JSON.stringify({ phone: tel, message: mensagem })
      });

      const result = await response.json();
      console.log('Resposta Z-API:', JSON.stringify(result));
      console.log('Telefone enviado:', tel);

      if (result.zapiId || result.messageId) {
        await pool.query(
          "INSERT INTO whatsapp_mensagens (message_id, telefone, nome_contato, mensagem, tipo, direcao, lead_id, vendedor_id, status) VALUES ($1, $2, $3, $4, 'text', 'enviada', $5, $6, 'enviada')",
          [result.zapiId || result.messageId, tel, nome_contato || "", mensagem, lead_id, vendedor_id]
        );
        if (lead_id) { await pool.query("UPDATE clientes_finais SET ultima_interacao = NOW() WHERE id = $1", [lead_id]); }
        res.json({ success: true, messageId: result.zapiId || result.messageId });
      } else {
        res.status(400).json({ error: 'Erro ao enviar', details: result });
      }`;

const newEndpoint = `app.post('/api/whatsapp/enviar', auth, async (req, res) => {
    try {
      const { telefone, mensagem, lead_id, vendedor_id, nome_contato, instancia_id } = req.body;
      if (!telefone || !mensagem) return res.status(400).json({ error: 'Telefone e mensagem obrigatorios' });

      let tel = telefone;
      if (tel.includes("@") || tel.includes("-group") || tel.length > 15) {
      } else {
          tel = tel.replace(/\\D/g, "");
          if (tel.length > 0 && tel.substring(0,2) !== "55") tel = "55" + tel;
      }

      const fetch = require('node-fetch');
      let result;
      let usedInstanciaId = instancia_id || 1;

      // Buscar instancia
      const instQuery = await pool.query('SELECT * FROM whatsapp_instancias WHERE id = $1', [usedInstanciaId]);
      const instancia = instQuery.rows[0];

      if (instancia && instancia.tipo_api === 'wasender') {
          // WasenderAPI
          console.log('Enviando via WasenderAPI - Instancia:', instancia.nome);
          const response = await fetch('https://wasenderapi.com/api/send-message', {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + instancia.token, 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: tel, message: mensagem })
          });
          result = await response.json();
          console.log('Resposta WasenderAPI:', JSON.stringify(result));
          if (result.success || result.messageId || result.id) {
              result.messageId = result.messageId || result.id || ('wasender_' + Date.now());
          }
      } else {
          // Z-API (padrao)
          console.log('Enviando via Z-API - Instance:', ZAPI_INSTANCE_ID);
          const response = await fetch('https://api.z-api.io/instances/' + ZAPI_INSTANCE_ID + '/token/' + ZAPI_TOKEN + '/send-text', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Client-Token': 'F4cb60f10f1a94c1d999839ef72ca6f4bS' },
              body: JSON.stringify({ phone: tel, message: mensagem })
          });
          result = await response.json();
          console.log('Resposta Z-API:', JSON.stringify(result));
          if (result.zapiId) result.messageId = result.zapiId;
      }

      if (result.messageId || result.zapiId || result.success) {
        await pool.query(
          "INSERT INTO whatsapp_mensagens (message_id, telefone, nome_contato, mensagem, tipo, direcao, lead_id, vendedor_id, status, instancia_id) VALUES ($1, $2, $3, $4, 'text', 'enviada', $5, $6, 'enviada', $7)",
          [result.messageId || result.zapiId, tel, nome_contato || "", mensagem, lead_id, vendedor_id, usedInstanciaId]
        );
        if (lead_id) { await pool.query("UPDATE clientes_finais SET ultima_interacao = NOW() WHERE id = $1", [lead_id]); }
        res.json({ success: true, messageId: result.messageId || result.zapiId });
      } else {
        res.status(400).json({ error: 'Erro ao enviar', details: result });
      }`;

content = content.replace(oldEndpoint, newEndpoint);
fs.writeFileSync('server.js', content);
console.log('Endpoint atualizado para suportar Z-API e WasenderAPI!');

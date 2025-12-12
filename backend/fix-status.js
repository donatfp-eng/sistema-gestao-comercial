const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

const oldStatus = `app.get('/api/whatsapp/instancias/:id/status', auth, async (req, res) => {
      try {
          const { id } = req.params;
          const inst = await pool.query('SELECT * FROM whatsapp_instancias WHERE id = $1', [id]);
          if (inst.rows.length === 0) return res.status(404).json({ error: 'Instância não encontrada' });
          const { instance_id, token, client_token } = inst.rows[0];
          const url = 'https://api.z-api.io/instances/' + instance_id + '/token/' + token + '/status';
          const response = await fetch(url, { method: 'GET', headers: { 'Client-Token': client_token } });
          const data = await response.json();
          // Atualizar status no banco
          const status = data.connected ? 'conectado' : 'desconectado';
          const telefone = data.phone || null;
          await pool.query('UPDATE whatsapp_instancias SET status = $1, telefone = $2, updated_at = NOW() WHERE id = $3', [status, telefone, id]);

          res.json({ ...data, id, nome: inst.rows[0].nome });
      } catch (error) {
          res.status(500).json({ error: error.message });
      }
  });`;

const newStatus = `app.get('/api/whatsapp/instancias/:id/status', auth, async (req, res) => {
      try {
          const { id } = req.params;
          const inst = await pool.query('SELECT * FROM whatsapp_instancias WHERE id = $1', [id]);
          if (inst.rows.length === 0) return res.status(404).json({ error: 'Instância não encontrada' });
          const instancia = inst.rows[0];
          const { instance_id, token, client_token, tipo_api } = instancia;
          let data;
          if (tipo_api === 'wasender') {
              const response = await fetch('https://api.wasenderapi.com/api/sessions/' + instance_id, { headers: { 'Authorization': 'Bearer ' + token } });
              data = await response.json();
              data.connected = data.status === 'connected';
              data.phone = data.phone || null;
          } else {
              const url = 'https://api.z-api.io/instances/' + instance_id + '/token/' + token + '/status';
              const response = await fetch(url, { method: 'GET', headers: { 'Client-Token': client_token } });
              data = await response.json();
          }
          const status = data.connected ? 'conectado' : 'desconectado';
          const telefone = data.phone || null;
          await pool.query('UPDATE whatsapp_instancias SET status = $1, telefone = $2, updated_at = NOW() WHERE id = $3', [status, telefone, id]);
          res.json({ ...data, id, nome: instancia.nome });
      } catch (error) {
          res.status(500).json({ error: error.message });
      }
  });`;

if (content.includes("app.get('/api/whatsapp/instancias/:id/status'")) {
    // Encontrar e substituir usando regex
    content = content.replace(/app\.get\('\/api\/whatsapp\/instancias\/:id\/status', auth, async \(req, res\) => \{[\s\S]*?const \{ instance_id, token, client_token \} = inst\.rows\[0\];[\s\S]*?res\.json\(\{ \.\.\.data, id, nome: inst\.rows\[0\]\.nome \}\);[\s\S]*?\}\s*\}\);/m, newStatus);
    fs.writeFileSync('server.js', content);
    console.log('Endpoint /status atualizado com suporte a WasenderAPI!');
} else {
    console.log('Endpoint não encontrado');
}

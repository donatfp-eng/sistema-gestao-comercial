const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

const newQrcode = `app.get('/api/whatsapp/instancias/:id/qrcode', auth, async (req, res) => {
      try {
          const { id } = req.params;
          const inst = await pool.query('SELECT * FROM whatsapp_instancias WHERE id = $1', [id]);
          if (inst.rows.length === 0) return res.status(404).json({ error: 'Instância não encontrada' });
          const instancia = inst.rows[0];
          const { instance_id, token, client_token, tipo_api } = instancia;
          let data;
          if (tipo_api === 'wasender') {
              const response = await fetch('https://api.wasenderapi.com/api/sessions/' + instance_id + '/qr', { headers: { 'Authorization': 'Bearer ' + token } });
              data = await response.json();
              data.value = data.qr || data.qrcode;
          } else {
              const url = 'https://api.z-api.io/instances/' + instance_id + '/token/' + token + '/qr-code/image';
              const response = await fetch(url, { method: 'GET', headers: { 'Client-Token': client_token } });
              data = await response.json();
          }
          res.json(data);
      } catch (error) {
          res.status(500).json({ error: error.message });
      }
  });`;

content = content.replace(/app\.get\('\/api\/whatsapp\/instancias\/:id\/qrcode', auth, async \(req, res\) => \{[\s\S]*?const \{ instance_id, token, client_token \} = inst\.rows\[0\];[\s\S]*?res\.json\(data\);[\s\S]*?\}\s*\}\);/m, newQrcode);
fs.writeFileSync('server.js', content);
console.log('Endpoint /qrcode atualizado!');

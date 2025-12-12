
// ==================== INTEGRACAO WASENDERAPI ====================

app.post('/api/webhook/wasender', async (req, res) => {
    try {
        const data = req.body;
        console.log('Webhook WasenderAPI:', JSON.stringify(data).substring(0, 500));
        res.status(200).json({ success: true });
    } catch (error) { console.error('Erro webhook WasenderAPI:', error); res.status(200).json({ success: true }); }
});

app.get('/api/whatsapp/instancias/:id/qrcode-auto', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const inst = await pool.query('SELECT * FROM whatsapp_instancias WHERE id = $1', [id]);
        if (inst.rows.length === 0) return res.status(404).json({ error: 'Instancia nao encontrada' });
        const instancia = inst.rows[0];
        const fetch = require('node-fetch');
        let data;
        if (instancia.tipo_api === 'wasender') {
            const response = await fetch('https://api.wasenderapi.com/api/sessions/' + instancia.instance_id + '/qr', { headers: { 'Authorization': 'Bearer ' + instancia.token } });
            data = await response.json();
            data.value = data.qr || data.qrcode;
        } else {
            const url = 'https://api.z-api.io/instances/' + instancia.instance_id + '/token/' + instancia.token + '/qr-code/image';
            const response = await fetch(url, { method: 'GET', headers: { 'Client-Token': instancia.client_token || '' } });
            data = await response.json();
        }
        res.json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/whatsapp/instancias/:id/status-auto', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const inst = await pool.query('SELECT * FROM whatsapp_instancias WHERE id = $1', [id]);
        if (inst.rows.length === 0) return res.status(404).json({ error: 'Instancia nao encontrada' });
        const instancia = inst.rows[0];
        const fetch = require('node-fetch');
        let connected = false, phone = null;
        if (instancia.tipo_api === 'wasender') {
            const response = await fetch('https://api.wasenderapi.com/api/sessions/' + instancia.instance_id, { headers: { 'Authorization': 'Bearer ' + instancia.token } });
            const d = await response.json();
            connected = d.status === 'connected';
            phone = d.phone;
        } else {
            const url = 'https://api.z-api.io/instances/' + instancia.instance_id + '/token/' + instancia.token + '/status';
            const response = await fetch(url, { headers: { 'Client-Token': instancia.client_token || '' } });
            const d = await response.json();
            connected = d.connected;
            phone = d.phone;
        }
        const status = connected ? 'conectado' : 'desconectado';
        await pool.query('UPDATE whatsapp_instancias SET status = $1, telefone = $2, updated_at = NOW() WHERE id = $3', [status, phone, id]);
        res.json({ connected, phone, status });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

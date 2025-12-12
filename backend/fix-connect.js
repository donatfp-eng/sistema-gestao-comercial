const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

const oldWasenderQR = `if (tipo_api === 'wasender') {
                const response = await fetch('https://wasenderapi.com/api/whatsapp-sessions/' + instance_id + '/qrcode', { headers: { 'Authorization': 'Bearer ' + token } });
                data = await response.json();
                data.value = data.qr || data.qrcode;
            }`;

const newWasenderQR = `if (tipo_api === 'wasender') {
                const response = await fetch('https://wasenderapi.com/api/whatsapp-sessions/' + instance_id + '/connect', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } });
                data = await response.json();
                if (data.success && data.data && data.data.qrCode) {
                    data.value = data.data.qrCode;
                }
            }`;

content = content.replace(oldWasenderQR, newWasenderQR);
fs.writeFileSync('server.js', content);
console.log('Endpoint QR Code atualizado para /connect!');

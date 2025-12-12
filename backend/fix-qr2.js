const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// Corrigir para usar /connect e extrair qrCode corretamente
content = content.replace(
    /if \(tipo_api === 'wasender'\) \{\s*const response = await fetch\('https:\/\/wasenderapi\.com\/api\/whatsapp-sessions\/' \+\s*instance_id \+ '\/qrcode', \{ headers: \{ 'Authorization': 'Bearer ' \+ token \} \}\);\s*data = await response\.json\(\);\s*data\.value = data\.qr \|\| data\.qrcode;\s*\}/,
    `if (tipo_api === 'wasender') {
                const response = await fetch('https://wasenderapi.com/api/whatsapp-sessions/' + instance_id + '/connect', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } });
                data = await response.json();
                if (data.success && data.data && data.data.qrCode) {
                    data.value = data.data.qrCode;
                }
            }`
);

fs.writeFileSync('server.js', content);
console.log('Corrigido para /connect!');

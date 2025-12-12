const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

content = content.replace(
    `if (tipo_api === 'wasender') {
                const response = await fetch('https://wasenderapi.com/api/whatsapp-sessions/' + instance_id, { headers: { 'Authorization': 'Bearer ' + token } });
                data = await response.json();
                data.connected = data.status === 'connected';
                data.phone = data.phone || null;
            }`,
    `if (tipo_api === 'wasender') {
                const response = await fetch('https://wasenderapi.com/api/whatsapp-sessions/' + instance_id, { headers: { 'Authorization': 'Bearer ' + token } });
                data = await response.json();
                if (data.success && data.data) {
                    data.connected = data.data.status === 'connected';
                    data.phone = data.data.phone_number || null;
                } else {
                    data.connected = false;
                }
            }`
);

fs.writeFileSync('server.js', content);
console.log('Status corrigido!');

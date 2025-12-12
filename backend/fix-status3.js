const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

content = content.replace(
    `data.connected = data.status === 'connected';
                data.phone = data.phone || null;`,
    `if (data.success && data.data) {
                    data.connected = data.data.status === 'connected';
                    data.phone = data.data.phone_number || null;
                } else {
                    data.connected = false;
                    data.phone = null;
                }`
);

fs.writeFileSync('server.js', content);
console.log('Status WasenderAPI corrigido!');

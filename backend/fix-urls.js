const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// Corrigir URL do QR Code
content = content.replace(
    "https://api.wasenderapi.com/api/sessions/' + instance_id + '/qr",
    "https://wasenderapi.com/api/whatsapp-sessions/' + instance_id + '/qrcode"
);

// Corrigir URL do Status
content = content.replace(
    "https://api.wasenderapi.com/api/sessions/' + instance_id",
    "https://wasenderapi.com/api/whatsapp-sessions/' + instance_id"
);

fs.writeFileSync('server.js', content);
console.log('URLs da WasenderAPI corrigidas!');

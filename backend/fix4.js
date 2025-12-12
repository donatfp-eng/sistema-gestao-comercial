const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

content = content.replace(
    "data.connected = data.status === 'connected';\n                data.phone = data.phone || null;",
    "data.connected = (data.data && data.data.status === 'connected');\n                data.phone = (data.data && data.data.phone_number) || null;"
);

fs.writeFileSync('server.js', content);
console.log('Corrigido!');

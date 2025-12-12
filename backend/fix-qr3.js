const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// Adicionar require do qrcode no topo
if (!content.includes("require('qrcode')")) {
    content = content.replace(
        "const express = require('express');",
        "const express = require('express');\nconst QRCode = require('qrcode');"
    );
}

// Corrigir o endpoint para gerar imagem base64
content = content.replace(
    /if \(tipo_api === 'wasender'\) \{\s*const response = await fetch\('https:\/\/wasenderapi\.com\/api\/whatsapp-sessions\/' \+ instance_id \+ '\/connect', \{ method: 'POST', headers: \{ 'Authorization': 'Bearer ' \+ token \} \}\);\s*data = await response\.json\(\);\s*if \(data\.success && data\.data && data\.data\.qrCode\) \{\s*data\.value = data\.data\.qrCode;\s*\}\s*\}/,
    `if (tipo_api === 'wasender') {
                const response = await fetch('https://wasenderapi.com/api/whatsapp-sessions/' + instance_id + '/connect', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } });
                data = await response.json();
                if (data.success && data.data && data.data.qrCode) {
                    const qrImage = await QRCode.toDataURL(data.data.qrCode);
                    data.value = qrImage;
                }
            }`
);

fs.writeFileSync('server.js', content);
console.log('QR Code com geracao de imagem!');

#!/bin/bash
echo "Enviando para producao..."
scp ~/Projetos/gsd-comercial/index.html root@138.68.8.209:/var/www/sistema-gestao/
scp ~/Projetos/gsd-comercial/backend/server.js root@138.68.8.209:/var/www/sistema-gestao/backend/
ssh root@138.68.8.209 "pm2 restart all"
echo "Deploy concluido! Sistema online atualizado."

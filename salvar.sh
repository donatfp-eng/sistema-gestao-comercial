#!/bin/bash
cd ~/Projetos/gsd-comercial
git add .
git commit -m "$1"
git push origin main
echo "Alteracoes salvas no GitHub!"

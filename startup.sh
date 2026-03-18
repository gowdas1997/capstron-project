#!/bin/bash
apt-get update -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git
npm install -g pm2
cd /home
git clone https://github.com/gowdas1997/capstron-project.git
cd capstron-project/backend
npm install
pm2 start server.js --name capstron-api
pm2 startup systemd -u root --hp /root
pm2 save
#!/bin/bash
sshpass -p "5d96Pk2R" ssh root@10.10.222.76 "cd /data/twhale && echo '{\"proxyUrl\": \"http://172.16.0.83:6419\"}' > xconfig.json"
sshpass -p "5d96Pk2R" ssh root@10.10.222.76 "cd /data && bash ./xen-update.sh"

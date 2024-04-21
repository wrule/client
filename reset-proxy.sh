#!/bin/bash
sshpass -p "5d96Pk2R" ssh root@10.10.222.76 "cd /data/twhale && echo '' > xconfig.json"
sshpass -p "5d96Pk2R" ssh root@10.10.222.76 "cd /data && bash ./xen-update.sh"

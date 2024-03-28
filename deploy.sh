#!/bin/bash
# perfma@888!
sshpass -p "perfma@888!" ssh root@10.10.222.240 "source ~/.nvm/nvm.sh && cd /data/wwwroot && bash ./sync.sh $1"
# zZVhsiWS
sshpass -p "zZVhsiWS" ssh root@10.10.222.154 "cd /data && bash ./xen-update.sh"

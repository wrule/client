#!/bin/bash
git pull
npm release --arch x64
cp ./bin/XEngine-linux-x64 /data/f/engine/0.0.45/

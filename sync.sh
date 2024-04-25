#!/bin/bash
git pull
if [ -n "$1" ]; then
  git reset --hard $1
  echo 😡 当前位于 $1
else
  git pull
  echo 😄 当前位于最新
fi
yarn release --arch x64
cp ./bin/XEngine-linux-x64 /data/f/engine/0.0.46/

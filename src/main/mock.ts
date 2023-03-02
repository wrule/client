/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import cluster from 'node:cluster';
import fs from 'node:fs';
import { startMockCluster } from '@mock/index';
import { opts } from '@/config';
import { ENGINE_VERSION } from '@/utils';
import Logger from '@/logger';

if (cluster.isPrimary) {
  process.stdout.write(`
 Welcome to XEngine Mock Server!

 ,ggg,          ,gg   ,ggggggg,
 dP"""Y8,      ,dP'  ,dP""""""Y8b
 Yb,_  "8b,   d8"    d8'    a  Y8
 \`""    Y8,,8P'     88     "Y8P'                            gg
          Y88"       \`8baaaa                                 ""
         ,888b      ,d8P""""       ,ggg,,ggg,     ,gggg,gg   gg    ,ggg,,ggg,    ,ggg,
        d8" "8b,    d8"           ,8" "8P" "8,   dP"  "Y8I   88   ,8" "8P" "8,  i8" "8i
      ,8P'    Y8,   Y8,           I8   8I   8I  i8'    ,8I   88   I8   8I   8I  I8, ,8I
     d8"       "Yb, \`Yba,,_____, ,dP   8I   Yb,,d8,   ,d8I _,88,_,dP   8I   Yb, \`YbadP'
   ,8P'          "Y8  \`"Y8888888 8P'   8I   \`Y8P"Y8888P"8888P""Y88P'   8I   \`Y8888P"Y888
                                                      ,d8I'
                                                    ,dP'8I
                                                   ,8"  8I
                                                   I8   8I
                                                   \`8, ,8I
                                                    \`Y8P"
 --------------------------------------------------------------------------------------
 XEngine ${ENGINE_VERSION} (git-${process.env.GIT_COMMIT}) BuildID ${process.env.BUILD_TIME}
 --------------------------------------------------------------------------------------
 \n`);
  Logger.mark(`[logger] log-level=${Logger.level}`);
  Logger.info(`cwd: ${process.cwd()}`);
}

if (opts.mockConfig) {
  startMockCluster(JSON.parse(fs.readFileSync(opts.mockConfig, 'utf8')));
} else {
  startMockCluster({
    control: {
      port: opts.mockControlPort,
      host: opts.mockControlHost,
    },
    http: {
      port: opts.mockHttpPort,
      host: opts.mockHttpHost,
      rules: {},
    },
  });
}

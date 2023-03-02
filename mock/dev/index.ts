/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

// import cluster from 'node:cluster';
// import os from 'node:os';
import fs from 'node:fs';
import yaml from 'yaml';
// import MockServer from '@mock/http/server';
import debugData from '@mock/dev/data';

// import logger from '@engine/logger';
// import { MockConfig } from '@mock/types';
import { startMockCluster } from '@mock/index';

// console.log(debugData);
startMockCluster(debugData);
// startMockCluster(yaml.parse(fs.readFileSync('./mock/dev/data.yaml', 'utf8')));

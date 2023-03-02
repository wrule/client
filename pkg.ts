/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { exec } from 'pkg-preview';
import os from 'node:os';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv)).parseSync();

const name = argv.platform ? argv.platform : ((): string => {
  const platform = os.platform();
  if (os.version().indexOf('Alpine') !== -1) {
    return 'alpine';
  }
  if (platform === 'darwin') {
    return 'macos';
  }
  if (platform === 'linux') {
    return 'linux';
  }
  if (platform === 'win32') {
    return 'win';
  }
  throw new Error('Unknown platform');
})();

const arch = argv.arch ? argv.arch : os.arch();

console.log(`> build platform: ${name}`);
console.log(`> build arch: ${arch}`);

const args = [
  'package.json',
  // '--debug',
  '--no-native-build',
  '--compress',
  'Brotli',
  '--targets',
  `node16-${name}-${arch}`,
  '--output',
  `bin/XEngine-${name}-${arch}`,
];
// if (name === 'darwin') {
//   args.push('--build');
// }
exec(args);

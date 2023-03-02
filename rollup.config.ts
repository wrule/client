/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import os from 'node:os';
// import { RollupOptions } from 'rollup';
import replace from '@rollup/plugin-replace';
import json from '@rollup/plugin-json';
import typescript from 'rollup-plugin-typescript2';
import { execSync } from 'child_process';
import moment from 'moment';
import obfuscatorPlugin from 'rollup-plugin-obfuscator';

// import path from 'path';

const commit = execSync('git rev-parse --short HEAD');

const createOptions = (name, input) => ({
  input,
  output: {
    format: 'cjs',
    file: `dist/${name}.js`,
  },
  // external: [/@engine\//],
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.GIT_COMMIT': JSON.stringify(commit.toString('utf-8').trim()),
      'process.env.BUILD_USER': JSON.stringify(os.userInfo().username),
      'process.env.BUILD_HOST': JSON.stringify(os.hostname()),
      'process.env.BUILD_TIME': JSON.stringify(`${moment().format('YYYYMMDDHHmm')}`),
      preventAssignment: true,
    }),
    json(),
    typescript({
      tsconfigOverride: {
        compilerOptions: {
          module: 'ESNext',
        },
      },
    }),
    // obfuscatorPlugin({
    //   fileOptions: {
    //     ignoreRequireImports: true,
    //   },
    // }),
  ],
});

export default [
  createOptions('index', 'src/index.ts'),
  createOptions('engine', 'src/main/engine.ts'),
  createOptions('worker', 'src/worker/worker.ts'),
  createOptions('mock', 'src/main/mock.ts'),
  // createOptions('addon/tzt', 'addon/tzt/index.ts'),
  // createOptions('plugin/http', 'plugin/http/index.ts'),
];

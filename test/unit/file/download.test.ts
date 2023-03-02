/* eslint-disable no-template-curly-in-string */
/* eslint-disable no-unused-expressions */
/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { expect } from 'chai';
import { downloadFile, getFullPath, isCompleteDownload } from '@/utils/file';

describe('test variable manager', () => {
  it('single file download', async () => {
    const file = {
      '@file': 'https://www.baidu.com/img/bd_logo1.png',
      '@fileKey': 'baidu.png',
      group: 'test',
      version: 1,
    };
    await downloadFile(file);
    const fullPath = getFullPath(file);
    expect(fs.existsSync(fullPath)).to.be.equal(true);
    expect(await isCompleteDownload(fullPath, file.version)).to.be.equal(true);
  });

  it('multi-process download lock', async () => {
    const file = {
      '@file': 'https://www.baidu.com/img/bd_logo1.png',
      '@fileKey': crypto.randomBytes(16).toString('hex'),
      // group: 'test',
      // version: 1,
    };
    await Promise.all([
      downloadFile(file),
      downloadFile(file),
      downloadFile(file),
      downloadFile(file),
      downloadFile(file),
    ]);
    const fullPath = getFullPath(file);
    expect(fs.existsSync(fullPath)).to.be.equal(true);
    expect(await isCompleteDownload(fullPath)).to.be.equal(true);
  });
});

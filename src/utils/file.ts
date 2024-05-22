/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import fs from 'node:fs/promises';
import fss, { createWriteStream } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import got from 'got';
import { lock, check, unlock } from 'proper-lockfile';
import { sleep } from '@/utils';
import Logger from '@/logger';
import { formatSize } from '@/utils/format';

// DO NOT USE fs.mkdtemp
export const FILE_CACHE_BASE_DIR = `${os.tmpdir()}/x-engine`;

class LockError extends Error {
  public code = 'ELOCKED';
}

export const getFullPath = (file: FileData): string => {
  if (file.group) {
    return path.resolve(`${FILE_CACHE_BASE_DIR}/${file.group}/${file['@fileKey']}`);
  }
  return path.resolve(`${FILE_CACHE_BASE_DIR}/${file['@fileKey']}`);
};

export const createReadStream = (file: FileData): fss.ReadStream => {
  const data = fss.createReadStream(getFullPath(file), 'utf-8');
  return data;
};

/**
 * 从本地磁盘读取文件（2GB内）
 * 由于有变量替换需要全部进内存
 * @param fileKey
 * @returns {Buffer}
 */
export const readFile = async (file: FileData): Promise<Buffer> => {
  const data = await fs.readFile(getFullPath(file));
  return data;
};

const isAccess = async (fullPath: string): Promise<boolean> => {
  try {
    await fs.access(fullPath);
    return true;
  } catch (e) {
    if (e.code === 'ENOENT') {
      return false;
    }
    throw e;
  }
};

const resolveGroupDownPath = (fullPath: string, version?: number): string => {
  if (version !== undefined) {
    return `${fullPath}.done.${version}`;
  }
  return `${fullPath}.done`;
};

/**
 * CompleteDownload
 * @param fileKey
 * @returns {Buffer}
 */
export const isCompleteDownload = async (fullPath: string, version?: number): Promise<boolean> => {
  const ret = await isAccess(resolveGroupDownPath(fullPath, version)) && await isAccess(fullPath);
  return ret;
};

const checkLocked = async (fullPath: string): Promise<boolean> => {
  try {
    const isLocked = await check(fullPath, {
      stale: 5000,
      realpath: false,
    });
    return isLocked;
  } catch (e) {
    return false;
  }
};

const download = async (file: FileData, fullPath: string): Promise<void> => new Promise((res, reject) => {
  Logger.info('[file] start downloading, url = %s, fileKey = %s', file['@file'], file['@fileKey']);
  const stream = got.stream(file['@file'], { retry: 0 });
  const fileStream = createWriteStream(fullPath, { flags: 'w' });
  const baseName = path.basename(file['@file']);
  let eNum = 0;
  stream.on('downloadProgress', (data) => {
    if (eNum % 500 === 1 || data.percent === 1) {
      const length = 30;
      if (data.total && data.total > 0) {
        const left = Math.ceil(length * data.percent);
        const dots = '='.repeat(left);
        const empty = ' '.repeat(length - left);
        process.stdout.write(`\r downloading ${baseName} ${formatSize(data.total)} [${dots}${empty}] ${formatSize(data.transferred)} ${Math.floor(data.percent * 100)}%`);
      } else { // 服务器没给长度
        process.stdout.write(`\r downloading ${baseName} [${'-'.repeat(length)}] ${formatSize(data.transferred)}`);
      }
    }
    if (eNum >= Number.MAX_VALUE) {
      eNum = 0;
    } else {
      eNum++;
    }
  });
  stream.once('end', async () => {
    process.stdout.write('\n');
    await fs.mkdir(resolveGroupDownPath(fullPath, file.version), { recursive: true });
    res();
  });
  stream.once('error', async (err) => {
    process.stdout.write('\n');
    fileStream.close();
    try {
      await fs.unlink(fullPath);
    } catch (e) {
      // 都到绝境了 还有ERR? IO wait 了吧 要么掉盘了
    }
    reject(err);
  });
  stream.pipe(fileStream);
});

const saveFileFromHTTPStream = async (file: FileData, fullPath: string): Promise<string> => {
  if (file.group) {
    await fs.mkdir(`${FILE_CACHE_BASE_DIR}/${file.group}`, { recursive: true });
  } else {
    await fs.mkdir(FILE_CACHE_BASE_DIR, { recursive: true });
  }
  const isLocked = await checkLocked(fullPath);
  if (await isCompleteDownload(fullPath, file.version) && !isLocked) {
    Logger.debug('[file] download finish. \nURL: %s\nPath: %s', file['@file'], fullPath);
    return file['@fileKey'] as string;
  }
  if (isLocked) throw new LockError();
  // check
  const release = await lock(fullPath, {
    realpath: false,
    stale: 5000,
  });
  await download(file, fullPath);
  await release();
  return file['@fileKey'] as string;
};

export interface FileData {
  /** 文件路径 */
  '@file': string;
  /** 文件保存后的名字 */
  '@fileKey'?: string;
  /** 文件后缀名 */
  ext?: string;
  /** 文件群组 谨慎设置 */
  group?: string;
  /** 文件版本 谨慎设置 */
  version?: number;
}

/**
 * 从 HTTP 下载文件存储到本地磁盘 防竞争关系（支持多线程/进程锁）
 * @notice 在不依赖任何中间件的情况下，原子操作几乎只能依靠文件系统
 * 由于文件系统差异 nodejs 和 libuv 都没有实现 flock 所以需要依赖其他方式实现
 * 可以写一个 addon 实现 flock 需要多线程支持 想想没必要 算了
 * @see https://github.com/nodejs/node/issues/122
 * @see https://github.com/joyent/libuv/issues/1533
 * @see https://en.wikipedia.org/wiki/Comparison_of_file_systems
 * @param url
 * @param fileKey
 * @return {string} key
 */
export const downloadFile = async (file: FileData): Promise<string> => {
  const url = file['@file'];
  let key = file['@fileKey'] || crypto.createHash('md5').update(url).digest('hex');
  if (file.ext && !key.endsWith(`.${file.ext}`)) {
    key = `${key}.${file.ext}`;
  }
  // eslint-disable-next-line no-param-reassign
  file['@fileKey'] = key;
  const fullPath = getFullPath(file);
  for (let index = 0; index < 500; index++) {
    try {
      return await saveFileFromHTTPStream(file, fullPath);
    } catch (e) {
      if (e.code === 'ELOCKED') {
        Logger.debug('[file] downloading, wait 1000ms ..., url = %s, fileKey = %s', url, key);
        await sleep(1000);
      } else {
        await unlock(fullPath, { realpath: false });
        throw e;
      }
    }
  }
  throw new Error('[file] Long waiting time, download failed.');
};

/**
 * 下载内容
 * @param url
 */
export const downloadContent = async (url: string): Promise<Buffer> => {
  const ret = await got(url, { retry: 0,
    timeout: {
      lookup: 5000,
      connect: 5000,
      secureConnect: 5000,
      request: 1000 * 30,
    } });
  return ret.rawBody;
};

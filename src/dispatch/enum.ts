/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

// 这里有个设计失误 所以导致会有两个一样的概念
export enum EXECUTE_MODE {
  SYNC = 0,
  ASYNC = 1,
}
export enum EXECUTE_OPTIONS {
  SYNC = 1 << 0,
  ASYNC = 1 << 1,
}

export enum PROTOCOL_OPTIONS {
  BROTLI = 1 << 0,
  GZIP = 1 << 1,
}

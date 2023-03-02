/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import { isObject, isArray } from '@/utils';
import { ContentType, CONTENT_TYPE } from '@/utils/serialize/types';

export { ContentType, CONTENT_TYPE };

/**
 * Convert to content type format
 * @param content
 * @returns {ContentType}
 */
export const encodeContentType = (content: any): ContentType => {
  if (content === undefined) {
    return { type: CONTENT_TYPE.UNDEFINED, content: 'undefined' };
  }
  if (content === null) {
    return { type: CONTENT_TYPE.NULL, content: null };
  }
  if (typeof content === 'string') {
    return { type: CONTENT_TYPE.STRING, content };
  }
  if (typeof content === 'number') {
    return { type: CONTENT_TYPE.NUMBER, content };
  }
  if (typeof content === 'boolean') {
    return { type: CONTENT_TYPE.BOOLEAN, content };
  }
  if (typeof content === 'symbol') {
    return { type: CONTENT_TYPE.SYMBOL, content: content.toString() };
  }
  if (typeof content === 'bigint') {
    return { type: CONTENT_TYPE.BIGINT, content: content.toString() };
  }
  if (typeof content === 'function') {
    return { type: CONTENT_TYPE.FUNCTION, content };
  }
  const name = toString.call(content);
  // [object Object]
  if (content instanceof ArrayBuffer || ArrayBuffer.isView(content) || name === '[object ArrayBuffer]') {
    if (Buffer.isBuffer(content)) {
      return { type: CONTENT_TYPE.BUFFER, content };
    }
    if (content instanceof ArrayBuffer || name === '[object ArrayBuffer]') {
      return { type: CONTENT_TYPE.BUFFER, content: Buffer.from(content) };
    }
    // 这里可以区分几个 ArrayBuffer 类型 后面再说吧
    return { type: CONTENT_TYPE.BUFFER, content: Buffer.from(content.buffer) };
  }
  if (content instanceof Error || name === '[object Error]') {
    return {
      type: CONTENT_TYPE.ERROR,
      content: {
        message: content.message,
        stack: content.stack,
        name: content.name,
      },
    };
  }
  if (isObject(content) || isArray(content)) {
    return { type: CONTENT_TYPE.OBJECT, content };
  }
  try {
    return { type: CONTENT_TYPE.TEXT, content: content.toString() };
  } catch (e) {
    return { type: CONTENT_TYPE.TEXT, content };
  }
};

/**
 * Convert to normal type
 * @param ContentType
 * @returns {any}
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const decodeContentType = (content: ContentType): any => {
  switch (content.type) {
    case CONTENT_TYPE.UNDEFINED:
      return undefined;
    case CONTENT_TYPE.NULL:
      return null;
    // case CONTENT_TYPE.SYMBOL: // 解出来也没意义
    case CONTENT_TYPE.BIGINT:
      return BigInt(content.content);
    case CONTENT_TYPE.BUFFER:
      return Buffer.from(content.content);
    case CONTENT_TYPE.ERROR: {
      const e = new Error(content.content.message);
      e.name = content.content.name;
      delete e.stack;
      return e;
    }
    default:
      return content.content;
  }
};

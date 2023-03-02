/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import {
  Binary,
  Timestamp,
  Long,
  Code,
  Decimal128,
  DBRef,
  Double,
  Int32,
  ObjectId,
  MaxKey,
  MinKey,
} from 'mongodb';
import logger from '@engine/logger';
import { isObject } from '@engine/utils';

/**
 * MongoDB MD5 和 UUID 格式化
 * @param data
 * @returns
 */
export const deserializeBSON = (data: unknown): any => {
  if (Array.isArray(data)) {
    return data.map((item) => deserializeBSON(item));
  }
  // BSON_BINARY_SUBTYPE_DEFAULT, default BSON type.
  // BSON_BINARY_SUBTYPE_FUNCTION, BSON function type.
  // BSON_BINARY_SUBTYPE_BYTE_ARRAY, BSON byte array type.
  // BSON_BINARY_SUBTYPE_UUID, BSON uuid type.
  // BSON_BINARY_SUBTYPE_MD5, BSON md5 type.
  // BSON_BINARY_SUBTYPE_USER_DEFINED, BSON user defined type.
  if (data instanceof Binary) {
    try {
      if (data.sub_type === Binary.SUBTYPE_DEFAULT) {
        return data.buffer.toString('hex');
      }
      if (data.sub_type === Binary.SUBTYPE_FUNCTION) {
        return data.buffer.toString('hex');
      }
      if (data.sub_type === Binary.SUBTYPE_BYTE_ARRAY) {
        return data.buffer.toString('hex');
      }
      // inspect
      if (data.sub_type === Binary.SUBTYPE_UUID_OLD) {
        return data.toUUID().toString();
      }
      if (data.sub_type === Binary.SUBTYPE_UUID) {
        return data.toUUID().toString();
      }
      if (data.sub_type === Binary.SUBTYPE_MD5) {
        return data.buffer.toString('utf-8');
      }
      // if (data.sub_type === Binary.SUBTYPE_USER_DEFINED) {
      //   return data.buffer.buffer;
      // }
    } catch (e) {
      logger.warn(`[bson] ${e.message}`);
      logger.debug(`[bson] ${e.stack}`);
    }
    return data.buffer;
  }
  if (data instanceof Timestamp) {
    return data.toNumber() / 2 ** 32;
  }
  if (
    data instanceof RegExp
    || data instanceof Long
    || data instanceof Decimal128
    || data instanceof Double
    || data instanceof Int32
    || data instanceof ObjectId
  ) {
    return data.toString();
  }
  if (data instanceof Code) {
    return data.code;
  }
  if (data instanceof DBRef) {
    return data.toJSON();
  }
  if (data instanceof MaxKey || data instanceof MinKey) {
    return data.inspect();
  }
  if (isObject(data)) {
    const obj: Record<string, unknown> = {};
    Object.keys(data).forEach((key) => {
      const item = (data as Record<string, unknown>)[key];
      obj[key] = deserializeBSON(item);
    });
    return obj;
  }
  return data;
};

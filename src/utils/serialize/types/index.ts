/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

export enum CONTENT_TYPE {
  STRING = 1,
  NUMBER = 2,
  OBJECT = 3,
  BOOLEAN = 4,
  UNDEFINED = 5,
  NULL = 6,
  TEXT = 7,
  BUFFER = 8,
  ERROR = 9,
  FUNCTION = 10,
  SYMBOL = 11,
  BIGINT = 12,
}

interface ContentTypeString {
  type: CONTENT_TYPE.STRING;
  content: string;
}

interface ContentTypeNumber {
  type: CONTENT_TYPE.NUMBER;
  content: number;
}

interface ContentTypeObject {
  type: CONTENT_TYPE.OBJECT;
  content: any;
}

interface ContentTypeBoolean {
  type: CONTENT_TYPE.BOOLEAN;
  content: boolean;
}

interface ContentTypeUndefined {
  type: CONTENT_TYPE.UNDEFINED;
  content: string;
}

interface ContentTypeNull {
  type: CONTENT_TYPE.NULL;
  content: null;
}

interface ContentTypeText {
  type: CONTENT_TYPE.TEXT;
  content: string;
}

interface ContentTypeBuffer {
  type: CONTENT_TYPE.BUFFER;
  content: Buffer;
}

interface ContentTypeError{
  type: CONTENT_TYPE.ERROR;
  content: {
    message: string;
    stack?: string;
    name: string;
  };
}
interface ContentTypeFunction {
  type: CONTENT_TYPE.FUNCTION;
  content: string;
}
interface ContentTypeSymbol {
  type: CONTENT_TYPE.SYMBOL;
  content: string;
}
interface ContentTypeBigInt {
  type: CONTENT_TYPE.BIGINT;
  content: string;
}
export type ContentType =
ContentTypeString | ContentTypeNumber | ContentTypeObject |
ContentTypeBoolean | ContentTypeUndefined | ContentTypeNull |
ContentTypeText | ContentTypeBuffer | ContentTypeError |
ContentTypeFunction | ContentTypeSymbol | ContentTypeBigInt;

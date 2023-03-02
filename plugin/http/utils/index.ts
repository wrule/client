/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import iconv from 'iconv-lite';
import { HTTPControllerData } from '@plugin/http/types/data';
import { downloadFile, FileData } from '@engine/utils/file';

/**
 * urlEncode
 * RFC 3986 RFC 5987
 * There are many RFC standards, Use the safest way
 * @param string
 * @returns
 */
export const urlEncode = (string = ''): string => encodeURIComponent(string)
  .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16)}`);
// .replace(/%20/g, '+');

const URL_ENCODE_ASCII = {
  32: true, //   %20
  33: true, // !
  39: true, // '
  34: true, // " %22
  35: true, // # %23
  36: true, // $ %24
  37: true, // % %25
  38: true, // & %26
  40: true, // (
  41: true, // )
  42: true, // *
  43: true, // + %2B
  44: true, // , %2C
  47: true, // / %2F
  58: true, // : %3A
  59: true, // ; %3B
  60: true, // < %3C
  61: true, // = %3D
  62: true, // > %3E
  63: true, // ? %3F
  64: true, // @ %40
  91: true, // [ %5B
  92: true, // \ %5C
  93: true, // ] %5D
  94: true, // ^ %5E
  96: true, // ` %60
  123: true, // { %7B
  124: true, // | %7C
  125: true, // } %7D
} as Record<number, true>;

/**
 * urlEncodeFromEncoding
 * supported encoding
 * @param string
 * @returns {string}
 */
export const urlEncodeFromEncoding = (string: string, encoding = 'utf-8'): string => {
  if (encoding.toLowerCase() === 'utf-8') {
    return urlEncode(string);
  }
  const buf = iconv.encode(string, encoding);
  let ret = '';
  for (let index = 0; index < buf.length; index++) {
    const ascii = buf[index];
    // ASCII control characters 0x00 ~ 0x1f
    if (ascii <= 0x1f || ascii >= 0x80 || URL_ENCODE_ASCII[ascii]) {
      ret += `%${ascii.toString(16).toUpperCase()}`;
    } else {
      ret += String.fromCharCode(ascii);
    }
  }

  return ret;
};

/**
 * urlDecodeFromEncode
 * @param string
 * @param encoding
 * @returns {string}
 */
export const urlDecodeFromEncode = (string: string, encoding = 'utf-8'): string => {
  if (encoding.toLowerCase() === 'utf-8') {
    return decodeURIComponent(string);
  }
  let hex = '';
  for (let index = 0; index < string.length; index++) {
    const char = string[index];
    if (char === '%') {
      if (index + 2 <= string.length) {
        const code = `${string[index + 1]}${string[index + 2]}`;
        // try convert hex
        const num = parseInt(`0x${code}`, 16);
        if (num <= 0xff) {
          index += 2;
          hex += code;
          continue;
        }
      }
    }
    hex += char.charCodeAt(0).toString(16);
  }
  return iconv.decode(Buffer.from(hex, 'hex'), encoding);
};

/**
 * Download HTTP Upload File
 * @param data
 */
export const downloadHTTPUploadFile = async (data: HTTPControllerData): Promise<void> => {
  if (data.formData) {
    for (let idx = 0; idx < data.formData.length; idx++) {
      const form = data.formData[idx];
      if (form['@file']) {
        // logger.info('[file] downloading HTTP upload file');
        await downloadFile(form as FileData);
      }
    }
  }
};

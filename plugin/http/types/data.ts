/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { Method } from 'got';
import { SingleControllerData } from '@engine/core/types/data';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { JSONSchema } from '@engine/utils/json-schema';
import { HTTPProxyServer } from '@engine/dispatch/types/server';
import { FileData } from '@engine/utils/file';

/**
 * @example key: value
 */
export interface HTTPHeadersData {
  key: string;
  value: string;
}
/**
 * @example /api?key=value
 */
export interface HTTPParamsData {
  key: string;
  value: string;
}
/**
 * @example /api/{key} -> /api/value
 */
export interface HTTPPathInfo {
  key: string;
  value: string;
}
/**
 * BodyData
 * @example key=value
 */
export interface HTTPFormData {
  key: string;
  value: string;
}
/**
 * [name, content or @fileKey, ContentType, filename]
 * @example
 * [Content-Type] => multipart/form-data; boundary=--------------------------242899882583142432808774
 * ----------------------------242899882583142432808774
 * Content-Disposition: form-data; name="name"; filename="unicycle.png"
 * Content-Type: contentType;
 *
 * <content>
 * --------------------------242899882583142432808774--
 */
export interface HTTPMultipartFormData extends Partial<FileData> {
  /** 字段name 必填 */
  name: string;
  /** 内容 如果有 以内容为准 */
  content?: string | Buffer;
  /** 文件的 Content Type 如果没有 会用扩展名计算 */
  contentType?: string;
  /** 文件名 协议上可不填 */
  filename?: string;
}

export interface HTTPConfig {
  /**
   * 重定向最大次数
   * @default 10
   */
  maxRedirects?: number;
  /**
   * 发送请求与接收响应超时（不是连接超时）
   * @default 5000
   */
  timeout?: number;
  /**
   * 启用重定向
   * @default true
   */
  followRedirect?: boolean;
  /**
   * 重写重定向方法 POST 重写为 POST
   * @default true
   */
  methodRewriting?: boolean;
  /**
   * use http/2
   * @default false
   */
  http2?: boolean;
  /**
   * retry count
   * @default 1
   */
  retry?: number;
  /**
   * 拒绝不受信任的证书
   * @default true
   */
  rejectUnauthorized?: boolean;
  /**
   * encoding
   * 如果是其他编码 会对发送和结果都进行转码处理
   * 发送编码：会转换为所填写的编码，并且在 contentType 智能判断加入对应的 charset
   * 结果编码：会自动识别网站对应的 charset 转换为 UTF-8 提供输出 如果发现填写的编码与结果 charset 不匹配 会输出警告
   * 结果编码 urlencode 部分不会解码，需要前端自行解码
   *
   * Native encodings: utf8, cesu8, ucs2 / utf16le, ascii, binary, base64, hex
   * Unicode: UTF7, UTF7-IMAP, UTF-16BE, UTF-16 (with BOM), UCS-4/UTF-32 (with BOM), UTF-32LE, UTF-32BE
   * Single-byte:
   *   Windows codepages: 874, 1250-1258 (aliases: cpXXX, winXXX, windowsXXX)
   *   ISO codepages: ISO-8859-1 - ISO-8859-16
   *   IBM codepages: 437, 720, 737, 775, 808, 850, 852, 855-858, 860-866, 869, 922, 1046, 1124, 1125, 1129, 1133, 1161-1163 (aliases cpXXX, ibmXXX)
   *   Mac codepages: maccroatian, maccyrillic, macgreek, maciceland, macroman, macromania, macthai, macturkish, macukraine, maccenteuro, macintosh
   *   KOI8 codepages: koi8-r, koi8-u, koi8-ru, koi8-t
   *   Miscellaneous: armscii8, rk1048, tcvn, georgianacademy, georgianps, pt154, viscii, iso646cn, iso646jp, hproman8, tis620
   * Multi-byte:
   *   Japanese: Shift_JIS, Windows-31j, Windows932, EUC-JP
   *   Chinese: GB2312, GBK, GB18030, Windows936, EUC-CN
   *   Korean: KS_C_5601, Windows949, EUC-KR
   *   Taiwan/Hong Kong: Big5, Big5-HKSCS, Windows950
   * @default utf-8
   */
  encoding?: string;
  proxy?: HTTPProxyServer;
}

interface HTTPMockConfig {
  hostname: string;
  path: string;
  protocol: 'http' | 'https';
  port?: number;
}

export interface HTTPControllerData extends SingleControllerData {
  type: CONTROLLER_TYPE.HTTP;
  method: Method;
  path: string;
  protocol?: 'http' | 'https';
  /** default HTTP 80 HTTP 443 */
  port?: number | string;
  hostname?: string;
  /** 使用的服务器名称 */
  serverId?: string;
  // 请求参数
  headers?: HTTPHeadersData[];
  params?: HTTPParamsData[];
  /** 可以是对象 一般情况下前端保存下来都是字符串了 */
  body?: unknown;
  form?: HTTPFormData[];
  formData?: HTTPMultipartFormData[];
  pathInfo?: HTTPPathInfo[];
  // 配置
  config?: HTTPConfig;
  /** mock */
  mock?: HTTPMockConfig;
}

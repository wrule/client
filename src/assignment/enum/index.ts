/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

export enum ASSIGNMENT {
  /** 全量提取 */
  GET = 0,
  /** JSON提取 */
  JSON = 1,
  /** 正则提取 */
  REGEXP = 3,
  /** XML提取 */
  XML = 4,
  /** JSON_PATH提取 */
  JSON_PATH = 6,
  /** HTML提取 */
  HTML = 7,
}

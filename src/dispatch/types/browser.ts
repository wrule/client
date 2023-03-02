/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

export interface Browser {
  /** 唯一ID */
  id: string;
  /** 引擎无用 用户自定义 方便用户查看 */
  name?: string;
  /** 浏览器名称 */
  browserName: 'chrome' | 'firefox' | 'edge' | 'ie' | 'opera' | 'safari';
  /** 默认 webdriver 只有 chrome 支持 devtools */
  protocol: 'webdriver' | 'devtools';
  /** webdriver 部署地址 如果是 devtools 会忽略 */
  hostname?: string;
  /** webdriver 部署端口 如果是 devtools 会忽略 */
  port?: number;
}

export interface BrowserOptions {
  /** 唯一ID 对应上方的唯一ID */
  id: string;
  /** 引擎无用 用户自定义 方便用户查看 */
  name?: string;
  /** 如果用户需要单独控制这个浏览器 需要设置一个别名 否则使用随机ID创建 */
  alias?: string;
  /** 分辨率 不写就是 1920x1080 */
  width?: number;
  height?: number;
}

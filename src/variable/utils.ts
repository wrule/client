/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 *
 * 变量替换 状态机实现 需要保证 100% 性能
 */

enum STATE {
  SEARCH_VARIABLE, // $
  SEARCH_VARIABLE2, // { -> 2
  SEARCH_VARIABLE3, // {@ -> }
  SEARCH_VARIABLE_CLOSE, // } -> 0, . or [ -> 3
  SEARCH_VARIABLE_PATH, // " -> 4, } -> 0
  SEARCH_VARIABLE_PATH_QUOTE_CLOSE, // " -> 3
}
// 变量中允许的字符
const ALLOW_CHAR = {
  0: true,
  1: true,
  2: true,
  3: true,
  4: true,
  5: true,
  6: true,
  7: true,
  8: true,
  9: true,
  a: true,
  b: true,
  c: true,
  d: true,
  e: true,
  f: true,
  g: true,
  h: true,
  i: true,
  j: true,
  k: true,
  l: true,
  m: true,
  n: true,
  o: true,
  p: true,
  q: true,
  r: true,
  s: true,
  t: true,
  u: true,
  v: true,
  w: true,
  x: true,
  y: true,
  z: true,
  A: true,
  B: true,
  C: true,
  D: true,
  E: true,
  F: true,
  G: true,
  H: true,
  I: true,
  J: true,
  K: true,
  L: true,
  M: true,
  N: true,
  O: true,
  P: true,
  Q: true,
  R: true,
  S: true,
  T: true,
  U: true,
  V: true,
  W: true,
  X: true,
  Y: true,
  Z: true,
  _: true,
};

export const VARIABLE_TAG = '$';
export const VARIABLE_TAG_FUNCTION = '@';
export const VARIABLE_TAG_LEFT = '{';
export const VARIABLE_TAG_RIGHT = '}';
export const VARIABLE_OBJECT_DOT = '.';
export const VARIABLE_OBJECT_BRACKETS = '[';
export const VARIABLE_OBJECT_QUOTE = '"';
export const VARIABLE_OBJECT_SINGLE_QUOTE = '\'';

export interface Tokens {
  0: string; // var
  1: string; // key
  2?: string; // path
}

/**
 * 状态机搜索文本中的变量
 *
 * 有一种情况无法兼容 ${var["\"}"]}
 * 这种情况放弃了 没必要支持 性能和成本都太大 不会有这种极端 key 的例子
 * 后期替换为C来实现这部分能力，性能会有保证
 * @param {string} str
 * @returns {Tokens}
 */
export const tokenization = (str = ''): Tokens[] => {
  // 节约性能，没有替换直接返回
  if (str === '' || str.indexOf(VARIABLE_TAG) === -1) {
    return [];
  }
  const data: Tokens[] = [];
  let keyPosStart = -1;
  let keyPosEnd = -1;
  let pathPosStart = -1;
  let lastQuote = '';
  let state = STATE.SEARCH_VARIABLE;
  for (let index = 0; index < str.length; index++) {
    const char = str[index];
    switch (state) {
      case STATE.SEARCH_VARIABLE:
        if (char === VARIABLE_TAG) state = STATE.SEARCH_VARIABLE2;
        break;
      case STATE.SEARCH_VARIABLE2:
        if (char === VARIABLE_TAG_LEFT) {
          state = STATE.SEARCH_VARIABLE_CLOSE;
          keyPosStart = index + 1;
        } else {
          state = STATE.SEARCH_VARIABLE;
        }
        break;
      case STATE.SEARCH_VARIABLE_CLOSE:
        if (char === VARIABLE_TAG_RIGHT) {
          state = STATE.SEARCH_VARIABLE;
          if (index - keyPosStart !== 0) {
            const key = str.slice(keyPosStart, index);
            // [${key}, key]
            data.push([`${VARIABLE_TAG}${VARIABLE_TAG_LEFT}${key}${VARIABLE_TAG_RIGHT}`, key]);
          }
        } else if (char === VARIABLE_OBJECT_DOT || char === VARIABLE_OBJECT_BRACKETS) { // 有路径
          state = STATE.SEARCH_VARIABLE_PATH;
          keyPosEnd = index;
          pathPosStart = char === VARIABLE_OBJECT_DOT ? index + 1 : index;
        } else if (char === VARIABLE_TAG_FUNCTION && index === keyPosStart) {
          state = STATE.SEARCH_VARIABLE3;
        } else if (!(char in ALLOW_CHAR)) { // 只允许的变量字符
          state = STATE.SEARCH_VARIABLE;
        }
        break;
      case STATE.SEARCH_VARIABLE3:
        if (char === VARIABLE_TAG_RIGHT) {
          state = STATE.SEARCH_VARIABLE;
          if (index - keyPosStart !== 0) {
            const key = str.slice(keyPosStart, index);
            // [${@key}, key]
            data.push([`${VARIABLE_TAG}${VARIABLE_TAG_LEFT}${key}${VARIABLE_TAG_RIGHT}`, key]);
          }
        }
        break;
      case STATE.SEARCH_VARIABLE_PATH:
        if (char === VARIABLE_OBJECT_QUOTE || char === VARIABLE_OBJECT_SINGLE_QUOTE) {
          state = STATE.SEARCH_VARIABLE_PATH_QUOTE_CLOSE;
          lastQuote = char;
        } else if (char === VARIABLE_TAG_RIGHT) {
          state = STATE.SEARCH_VARIABLE;
          const key = str.slice(keyPosStart, keyPosEnd);
          const path = str.slice(pathPosStart, index);
          const varStr = `${VARIABLE_TAG}${VARIABLE_TAG_LEFT}${key}${path[0] === VARIABLE_OBJECT_BRACKETS ? '' : VARIABLE_OBJECT_DOT}${path}${VARIABLE_TAG_RIGHT}`;
          // [${key}, key, 'a.b.c.d] or [${key}, key, '[0].a.b.c]
          data.push([varStr, key, path]);
        }
        break;
      case STATE.SEARCH_VARIABLE_PATH_QUOTE_CLOSE:
        if (char === lastQuote) {
          state = STATE.SEARCH_VARIABLE_PATH;
        }
        break;
      // no default
    }
  }
  return data;
};

/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import get from 'lodash/get';
import Mock from 'better-mock';
import { tokenization, Tokens, VARIABLE_TAG, VARIABLE_TAG_FUNCTION, VARIABLE_TAG_RIGHT } from '@/variable/utils';
import { isObject } from '@/utils/index';

export enum REPLACE_MODE {
  AUTO, // 如果是单个变量就输出对象, 如果没有变量则输出原始字符串
  STRING, // 全部做 toString 处理 (普通单元格使用)
  SYNTAX, // 变量是字符串自动加上双引号 (if条件使用，直接交给虚拟机识别使用)
}

export enum VARIABLE_TYPE {
  /**
   * 暂时还没用上 根据设计来看 可能要麻烦后端做合并
   * 引擎做也行 传输的数据量太大可能
   */
  GLOBAL = 0x01,
  /** 环境变量 */
  ENV = 0x02,
  /** 用例变量 */
  EXECUTE = 0x10,
  /** 上下文变量 */
  CONTEXT = 0x20,
}

export interface Variable {
  // Record<string, unknown>
  [key: string]: unknown; // 变量类型可以是任意
}

type VariableData = {
  [key in VARIABLE_TYPE]: Variable;
}

/**
 * @notice 涉及到变量获取优先级，不要修改顺序
 */
const VARIABLE_TYPE_ALL = [
  VARIABLE_TYPE.CONTEXT,
  VARIABLE_TYPE.EXECUTE,
  VARIABLE_TYPE.ENV,
  VARIABLE_TYPE.GLOBAL,
];

interface GetVariableConfig {
  string?: boolean;
  syntax?: boolean;
  variable?: Variable;
}

export interface VariableManagerProxy extends VariableManager {
  get<T = unknown>(key: string): T;
  /** 重写了 同时会设置两层 具体看下方 VariableManagerProxy 实现 */
  set(key: string, value?: unknown): unknown;
  /** 将变量设置在当前空间内 */
  setLocal(key: string, value?: unknown): void;
  /** 清理local，目前主要提供给元件步骤执行子步骤时使用 */
  reset(): void;
  replace(content?: unknown, mode?: REPLACE_MODE.SYNTAX): string;
  replace(content?: unknown, mode?: REPLACE_MODE.STRING): string;
  replace(content?: unknown, mode?: REPLACE_MODE.AUTO): string | any;
  replace(content: unknown, mode?: REPLACE_MODE): unknown | any;
  /** 获取原始变量空间 */
  local: Variable;
}

const kUndefined = Symbol('kUndefined');

/**
 * Global Variable Manager
 * @author William Chan <root@williamchan.me>
 */
export default class VariableManager {
  private readonly variable!: VariableData;

  /**
   * 构造函数
   * @param variable
   * @param types
   */
  public constructor(variable?: VariableManager | { [key in VARIABLE_TYPE]?: Variable; }, types?: VARIABLE_TYPE[]) {
    const vars = {
      [VARIABLE_TYPE.EXECUTE]: {},
      [VARIABLE_TYPE.CONTEXT]: {},
      [VARIABLE_TYPE.ENV]: {},
      [VARIABLE_TYPE.GLOBAL]: {},
    };
    if (variable) {
      if (variable instanceof VariableManager) {
        // 基于现有的变量管理器，构造新的变量管理器实例时，针对上下文变量，进行浅拷贝，其他的变量类型，直接引用
        // 如果指定了types，那么只会针对types的类型进行初始化
        const map = types || Object.keys(variable.getVariables()) as unknown as VARIABLE_TYPE[];
        map.forEach((type) => {
          if (type === VARIABLE_TYPE.CONTEXT) {
            vars[type] = { ...variable.getVariables(type) };
          } else {
            vars[type] = variable.getVariables(type);
          }
        });
      } else {
        const map = Object.keys(variable) as unknown as VARIABLE_TYPE[];
        map.forEach((key) => {
          const item = variable[key];
          if (item && isObject(item)) {
            vars[key] = item;
          }
        });
      }
    }
    this.variable = vars;
  }

  /**
   * 获取所有变量，不提供给用户在业务中使用
   * @param type
   * @returns {Variable}
   */
  public getVariables(type?: VARIABLE_TYPE): VariableData
  public getVariables(type: VARIABLE_TYPE): Variable {
    if (type === undefined) return this.variable;
    return this.variable[type];
  }

  /**
   * 设置整个区域的变量
   * @param type
   * @param variable
   */
  public setVariables(type: VARIABLE_TYPE, variable: Variable): void {
    this.variable[type] = variable;
  }

  /**
   * 通用的变量获取方法，根据传入的变量类型、变量key的规范确定以何种形式获取变量值，如：mock、变量替换、直接返回变量值等，内部方法
   * @param type
   * @param key
   * @param toString
   * @param syntax auto append string quote
   * @returns {unknown}
   */
  private getVariable(
    type: VARIABLE_TYPE | Variable,
    key: string | Tokens,
    toString = false,
    syntax = false,
  ): unknown {
    const variable = typeof type !== 'object' ? this.variable[type] : type;
    if (variable) {
      let value: unknown;
      if (typeof key === 'string') {
        if (key[0] === VARIABLE_TAG_FUNCTION) {
          return Mock.mock(key);
        }
        if (variable[key] !== undefined) {
          value = variable[key];
        }
      } else if (key[1][0] === VARIABLE_TAG_FUNCTION) {
        return Mock.mock(key[1]);
      } else if (key[2] === undefined) {
        if (variable[key[1]] !== undefined) {
          value = variable[key[1]];
        }
      } else {
        /**
         * support path
         * e.g ${test.test}
         */
        let obj = variable[key[1]];
        // is string, try to serialize.
        if (typeof obj === 'string') {
          try {
            obj = JSON.parse(obj);
          } catch (e) {}
        }
        if (obj) {
          const val = get(obj, key[2]);
          if (val !== undefined) {
            value = val;
          } else {
            // 路径搜索模式下 特殊补偿
            value = kUndefined;
          }
        }
      }
      if (toString !== false) {
        return this.toString(value, syntax);
      }
      return value;
    }
    return undefined;
  }

  /**
   * 设置对应类型的某变量值
   * @param type
   * @param key
   * @param value
   */
  private setVariable(type: VARIABLE_TYPE, key: string, value?: unknown): void {
    if (key[0] !== VARIABLE_TAG_FUNCTION) {
      if (value === undefined) {
        this.variable[type][key] = kUndefined;
      } else {
        this.variable[type][key] = value;
      }
    }
  }

  /**
   * 删除对应类型的某个变量
   * @param type
   * @param key
   */
  private delVariable(type: VARIABLE_TYPE, key: string): void {
    delete this.variable[type][key];
  }

  private searchPath(variable: Variable, key: string | Tokens): boolean {
    if (typeof key !== 'string' && key[2] !== undefined) {
      return variable[key[1]] !== undefined;
    }
    return false;
  }

  /**
   * 根据优先级获取变量
   * @param {string} key
   * @param {boolean} toString
   * @param {boolean} syntax auto append string quote
   * @param {string} local get variables in unique local
   */
  private search(key: string | Tokens, config: GetVariableConfig = {}): unknown {
    if (config.variable !== undefined) {
      const val = this.getVariable(config.variable, key, config.string, config.syntax);
      // 非路径变量 如果遇到是 undefined 原样输出 不在搜索
      if (val !== undefined || this.searchPath(config.variable, key)) {
        return val;
      }
    }
    for (let index = 0; index < VARIABLE_TYPE_ALL.length; index++) {
      const type = VARIABLE_TYPE_ALL[index];
      const val = this.getVariable(type, key, config.string, config.syntax);
      // 非路径变量 如果遇到是 undefined 原样输出 不在搜索
      if (val !== undefined || this.searchPath(this.variable[type], key)) {
        return val;
      }
    }
  }

  /**
   * 暴露给用户的方法
   * 设置变量默认仅允许设置 context 级别的变量
   * 其他请调用别的方法
   */
  public get<T = unknown>(key: string, toString = false): T {
    const value = this.search(key, { string: toString });
    return (value === kUndefined ? undefined : value) as T;
  }

  public set = this.setContext;
  public del = this.delContext;

  // 环境变量
  public getEnv<T = unknown>(key: string, toString = false): T {
    const value = this.getVariable(VARIABLE_TYPE.ENV, key, toString);
    return (value === kUndefined ? undefined : value) as T;
  }

  public setEnv(key: string, value?: unknown): void {
    this.setVariable(VARIABLE_TYPE.ENV, key, value);
  }

  public delEnv(key: string): void {
    this.delVariable(VARIABLE_TYPE.ENV, key);
  }

  // 用例变量 or 上下文两
  public getContext<T = unknown>(key: string, toString = false): T {
    const value = this.getVariable(VARIABLE_TYPE.CONTEXT, key, toString);
    return (value === kUndefined ? undefined : value) as T;
  }

  public setContext(key: string, value?: unknown): void {
    this.setVariable(VARIABLE_TYPE.CONTEXT, key, value);
  }

  public delContext(key: string): void {
    this.delVariable(VARIABLE_TYPE.CONTEXT, key);
  }

  // 本地变量（用例级别）
  public getExecute<T = unknown>(key: string, toString = false): T {
    const value = this.getVariable(VARIABLE_TYPE.EXECUTE, key, toString);
    return (value === kUndefined ? undefined : value) as T;
  }

  public setExecute(key: string, value?: unknown): void {
    this.setVariable(VARIABLE_TYPE.EXECUTE, key, value);
  }

  public delExecute(key: string): void {
    this.delVariable(VARIABLE_TYPE.EXECUTE, key);
  }

  /**
   * create unique local
   * @returns {VariableManagerProxy}
   */
  public createLocal(): VariableManagerProxy {
    // 闭包维护local，针对每个步骤独立维护
    // 主要用于存储如每个步骤的执行结果类数据以及每个步骤开始前的独享数据，如数据集的行数据和行索引
    const local: Variable = {};
    // 代理整个变量管理器实例
    const proxy = new Proxy(this, {
      get: (target, prop, receiver) => {
        if (prop === 'get') {
          return (key: string | Tokens, config: GetVariableConfig = {}): unknown => {
            const val = this.search(key, { ...config, variable: local });
            return val === kUndefined ? undefined : val;
          };
        }
        if (prop === 'replace') {
          return (content: string | number | Buffer = '', mode: REPLACE_MODE = REPLACE_MODE.STRING): unknown => this.replace(content, mode, local);
        }
        if (prop === 'setLocal') {
          return (key: string, value?: unknown): void => {
            if (value !== undefined) {
              local[key] = value;
            } else {
              delete local[key];
            }
          };
        }
        if (prop === 'local') {
          return local;
        }
        // 设置变量时同步上下文
        if (prop === 'set') {
          return (key: string, value?: unknown): void => {
            if (value !== undefined) {
              local[key] = value;
            } else {
              delete local[key];
            }
            const set = Reflect.get(target, prop, receiver);
            return set.call(this, key, value);
          };
        }
        if (prop === 'del') {
          return (key: string): void => {
            delete local[key];
            const del = Reflect.get(target, prop, receiver);
            return del.call(this, key);
          };
        }

        if (prop === 'reset') {
          return (): void => {
            Object.keys(local).forEach((key) => {
              delete local[key];
            });
          };
        }

        // 其余实例方法使用Reflect.get直接调用原始方法
        return Reflect.get(target, prop, receiver);
      },
    }) as unknown as VariableManagerProxy;

    return proxy;
  }

  /**
   * 变量 toString 逻辑
   * 只会输出 undefined 或者 string
   * @param value
   * @param syntax auto append string quote
   * @returns
   */
  private toString(value: any, syntax = false): string | undefined {
    if (value !== undefined) {
      if (value === null) {
        return 'null';
      }
      if (value === kUndefined) {
        return 'undefined';
      }
      if (syntax === true) {
      // if (typeof value === 'object') {
      //   return JSON.stringify(JSON.stringify(value));
      // }
        if (typeof value === 'string') {
          return JSON.stringify(value.toString());
        }
      }
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value);
        } catch (e) {
          return value.toString();
        }
      }
      return value.toString();
    }
  }

  /**
   * replace
   * @param {string | number | Buffer} content content
   * @param {REPLACE_MODE} mode
   * @param {string} variable local variable
   * @returns
   */
  public replace(content?: unknown, mode?: REPLACE_MODE.SYNTAX, variable?: Variable): string;
  public replace(content?: unknown, mode?: REPLACE_MODE.STRING, variable?: Variable): string;
  public replace(content?: unknown, mode?: REPLACE_MODE.AUTO, variable?: Variable): string | any;
  public replace(content?: unknown, mode?: REPLACE_MODE, variable?: Variable): any;
  public replace(content: unknown, mode: REPLACE_MODE = REPLACE_MODE.STRING, variable?: Variable): unknown {
    if (Buffer.isBuffer(content)) {
      return content; // buffer 不作处理
    }
    if (content === undefined || content === null) {
      if (mode === REPLACE_MODE.STRING) {
        return this.toString(content);
      }
      return content;
    }
    const string: string = typeof content === 'string' ? content : (content as any).toString();
    const tokens = tokenization(string);

    if (tokens.length === 0) {
      return string;
    }

    // single
    if (tokens.length === 1 && string[0] === VARIABLE_TAG && string[string.length - 1] === VARIABLE_TAG_RIGHT) {
      // if string === val, return val type
      if (string === tokens[0][0]) {
        const ret = this.search(tokens[0], {
          string: REPLACE_MODE.AUTO !== mode,
          syntax: REPLACE_MODE.SYNTAX === mode,
          variable,
        });
        // console.log(ret);
        if (ret === kUndefined) {
          return undefined;
        }
        if (ret !== undefined) {
          return ret;
        }
        // if (mode === REPLACE_MODE.ORIGIN) {
        //   return undefined;
        // }
        return string;
      }
    }
    // multiple replace
    const vars: Record<string, any> = {};
    const replace: string[] = [];
    tokens.forEach((item) => {
      if (vars[item[0]] === undefined) {
        const val = this.search(item, {
          string: true,
          syntax: mode === REPLACE_MODE.SYNTAX,
          variable,
        });
        if (val !== undefined) {
          vars[item[0]] = val;
          replace.push(item[0]);
        }
      }
    });

    if (replace.length > 0) {
      let result = string;
      replace.forEach((key) => {
        const value = vars[key];
        let startPos = 0; // 简单优化 也防止死循环
        while (true) {
          const idx = result.indexOf(key, startPos);
          if (idx !== -1) {
            const start = result.substring(0, idx);
            const end = result.substring(idx + key.length);
            startPos = idx + value.length;
            result = start + value + end;
          } else {
            break;
          }
        }
      });
      return result;
    }

    return string;
  }
}

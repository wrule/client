/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { executeScript, ProcessScriptResult } from '@/core/script';
import { PreScriptError, PostScriptError, AssertError, AssignmentError, SystemError, BaseError } from '@/core/error';
import { ASSIGNMENT_FUNCTION, AssignmentOptions } from '@/assignment';
import { ASSERT_FUNCTION } from '@/assert';
import { REPLACE_MODE } from '@/variable';
import BaseController from '@/core/base';
import { SingleControllerData } from '@/core/types/data';
import { PreContext, PostContext } from '@/core/types/vm';
import { CONTROLLER_STATE } from '@/core/enum';
import { SingleControllerDetailResult, AssignmentResult, AssertResult } from '@/core/types/result/single';
import { encodeContentType } from '@/utils/serialize/type';
import { toString } from '@/utils/string';
import Logger from '@/logger';
import flog from '@/utils/jmlog';

/**
 * Abstract Single Controller
 * @author William Chan <root@williamchan.me>
 */
export default abstract class SingleController<T extends SingleControllerData> extends BaseController<T> {
  // 当前执行状态标记
  private state: CONTROLLER_STATE = CONTROLLER_STATE.INIT;

  private readonly singleDetailResult: SingleControllerDetailResult = {};

  protected abstract createPreVMContext(): PreContext;
  protected abstract createPostVMContext(): PostContext;

  /**
   * @inheritdoc
   */
  protected async beforeExecute(): Promise<boolean> {
    return true;
  }

  /**
   * @inheritdoc
   */
  protected async afterExecute(): Promise<boolean> {
    return true;
  }

  /**
   * get single detail result
   * @returns {Promise<SingleControllerDetailResult>}
   */
  public async getDetailResult(): Promise<SingleControllerDetailResult> {
    return this.singleDetailResult;
  }

  /**
   * Pre-execution
   * @inheritdoc
   * @returns {Promise<ScriptResult[]>}
   */
  private async preExec(): Promise<ProcessScriptResult[] | undefined> {
    if (this.data.preScript && this.data.preScript.length) {
      const ret = await executeScript(this.data.preScript, {
        context: { ...this.createGlobalVMContext(), ...this.createPreVMContext() },
        commonScript: this.context.env.script,
      });
      return ret;
    }
  }

  /**
   * Post-execution
   * @inheritdoc
   * @returns {Promise<ScriptResult[]>}
   */
  private async postExec(): Promise<ProcessScriptResult[] | undefined> {
    if (this.data.postScript && this.data.postScript.length) {
      const ret = await executeScript(this.data.postScript, {
        context: { ...this.createGlobalVMContext(), ...this.createPostVMContext() },
        commonScript: this.context.env.script,
      });
      return ret;
    }
  }

  /**
   * variable assignment
   * @returns {AssignmentResult[]}
   */
  private assignment(): AssignmentResult[] | undefined {
    if (this.data.assignment?.length) {
      // const result: AssignmentResult[] = [];

      return this.data.assignment.map((item, index): AssignmentResult => {
        const fn = ASSIGNMENT_FUNCTION[item.method];
        if (fn) {
          try {
            /** @notice 只有 content 参数处理 */
            const args: AssignmentOptions = { ...item.params };
            if (args.content) args.content = this.variable.replace(args.content, REPLACE_MODE.AUTO);
            // @ts-ignore
            let ret = fn(args);
            if (ret === undefined) {
              ret = null;
            }
            // 用户提取变量 同时也会设置到上下文
            this.variable.set(item.var, ret);
            return { ...item, result: encodeContentType(ret) };
          } catch (e) {
            return { ...item, error: e.message };
          }
        } else {
          throw new Error(`Assignment#${index} method#${item.method} does not exist, Please check it.`);
        }
      });
      // return result;
    }
  }

  /**
   * assert
   * @returns {AssertResult[]}
   */
  private assert(): AssertResult[] | undefined {
    if (this.data.assert?.length) {
      // const result: AssertResult[] = [];

      return this.data.assert.map((item, index): AssertResult => {
        const name = item.name;
        if (typeof item.fn === 'function') {
          try {
            let ret = item.fn.apply(undefined);
            // 明确返回 boolean 或直接成功
            ret = typeof ret === 'boolean' ? ret : true;
            return { name, result: ret };
          } catch (e) {
            // 断言的情况下直接错误
            return { name, error: e.message, result: false };
          }
        }
        const fn = ASSERT_FUNCTION[item.fn];
        if (fn) {
          const mode = REPLACE_MODE.AUTO;
          // const mode = item.fn === ASSERT.EXIST || item.fn === ASSERT.NOT_EXIST ? REPLACE_MODE.ORIGIN : REPLACE_MODE.AUTO;
          const source = this.variable.replace(item.source, mode);
          const target = this.variable.replace(item.target, mode);
          const assertResult = {
            name,
            fn: item.fn,
            source: toString(source),
            sourceOrigin: item.source,
            target: toString(target),
            targetOrigin: item.target,
          } as AssertResult;
          try {
            const ret = fn(source as never, target as never);
            assertResult.result = ret;
            return assertResult;
          } catch (e) {
            assertResult.result = false;
            assertResult.error = e.message;
            return assertResult;
          }
        } else {
          throw new Error(`Assert#${index} method#${item.fn} does not exist, Please check it.`);
        }
      });
      // return result;
    }
  }

  /**
   * execute
   * @process
   * pre script
   *  -> exec
   *    -> post script
   *      -> assignment -> assert
   */
  public async action(): Promise<void> {
    const result = this.singleDetailResult;
    // beforeExecute
    try {
      await this.beforeExecute();
      this.state = CONTROLLER_STATE.PRE;
    } catch (e) {
      this.setError(new SystemError(e));
      this.state = CONTROLLER_STATE.DONE;
    }

    // --------------- pre exec ---------------
    if (this.state === CONTROLLER_STATE.PRE && !this.hasError()) {
      try {
        result.preScript = await this.preExec();
        const index = result.preScript?.findIndex((item) => item.error);
        if (index !== undefined && index !== -1 && result.preScript) {
          const ret = result.preScript[index];
          this.setError(new PreScriptError(index, ret.error?.message));
          this.state = CONTROLLER_STATE.DONE;
        } else {
          this.state = CONTROLLER_STATE.EXECUTE;
        }
      } catch (e) {
        this.setError(new SystemError(e));
        this.state = CONTROLLER_STATE.DONE;
      }
    }

    // --------------- exec ---------------
    if (this.state === CONTROLLER_STATE.EXECUTE && !this.hasError()) {
      try {
        await this.execute();
        this.state = CONTROLLER_STATE.POST;
      } catch (e) {
        if (e instanceof BaseError) {
          this.setError(e);
        } else {
          this.setError(new SystemError(e));
        }
        this.state = CONTROLLER_STATE.DONE;
      }
    }
    // --------------- post exec ---------------
    if (this.state === CONTROLLER_STATE.POST && !this.hasError()) {
      try {
        result.postScript = await this.postExec();
        const index = result.postScript?.findIndex((item) => item.error);
        if (index !== undefined && index !== -1 && result.postScript) {
          const ret = result.postScript[index];
          this.setError(new PostScriptError(index, ret.error?.message));
          this.state = CONTROLLER_STATE.DONE;
        } else {
          this.state = CONTROLLER_STATE.ASSIGNMENT;
        }
      } catch (e) {
        this.setError(new SystemError(e));
        this.state = CONTROLLER_STATE.DONE;
      }
    }

    // --------------- assignment exec ---------------
    if (this.state === CONTROLLER_STATE.ASSIGNMENT && !this.hasError()) {
      try {
        result.assignment = await this.assignment();
        const index = result.assignment?.findIndex((item) => item.error);
        if (index !== undefined && index !== -1) {
          this.setError(new AssignmentError(index));
          this.state = CONTROLLER_STATE.DONE;
        } else {
          this.state = CONTROLLER_STATE.ASSERT;
        }
      } catch (e) {
        this.setError(new SystemError(e));
        this.state = CONTROLLER_STATE.DONE;
      }
    }

    // --------------- assert exec ---------------
    if (this.state === CONTROLLER_STATE.ASSERT) {
      try {
        result.assert = await this.assert();
        const index = result.assert?.findIndex((item) => item.result === false);
        if (index !== undefined && index !== -1) {
          this.setError(new AssertError(result.assert || []));
        }
      } catch (e) {
        this.setError(new SystemError(e));
      }
      this.state = CONTROLLER_STATE.DONE;
    }
    // afterExecute
    try {
      await this.afterExecute();
    } catch (e) {
      this.setError(new SystemError(e));
    }
  }
}

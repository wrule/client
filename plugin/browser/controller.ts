/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
// @ts-nocheck
import { multiremote, RemoteOptions } from 'webdriverio';
import { BrowserControllerData } from '@plugin/browser/types/data';
// import { BrowserDetailResult, BrowserResult } from '@plugin/browser/types/result';
import { ExecuteError, SystemError, BaseError } from '@engine/core/error';
import { executeScript, ProcessScript } from '@engine/core/script';
import SingleController from '@engine/core/single';
import { PreContext, PostContext } from '@engine/core/types/vm';
import { BaseResult } from '@engine/core/types/result';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { Context, ControllerExtraConfig } from '@engine/core/execute';
import { Browser, BrowserOptions } from '@engine/dispatch/types/browser';
import { CONFIG } from '@engine/config';

interface BrowserInfo extends BrowserOptions {
  browser: Browser;
  name: string;
}

/**
 * Browser 步骤
 * @author William Chan <root@williamchan.me>
 */
export default class BrowserController extends SingleController<BrowserControllerData> {
  private result!: BrowserDetailResult;

  /**
   * @inheritdoc
   */
  public constructor(data: BrowserControllerData, context: Context, extra?: ControllerExtraConfig) {
    super(data, context, extra);
    if (!this.context.browsers || !this.context.browsers?.length) {
      this.setError(new SystemError('please select a browser or device'));
    }
  }

  /**
   * create pre script context & method
   */
  protected createPreVMContext(): PreContext {
    return { pre: {} };
  }

  /**
   * create post script context & method
   * @returns
   */
  protected createPostVMContext(): PostContext {
    return { post: {} };
  }

  private async createBrowserProxy(): Promise<MultiRemoteBrowserAsync> {
    if (!this.context.browser) {
      // browser = new Proxy()
      const params: Record<string, RemoteOptions> = {};
      const info: BrowserInfo[] = [];
      this.context.browsers?.forEach((options, index) => {
        const browser = this.context.env.browser?.find((item) => item.id === options.id);
        if (browser) {
          const name = index;// options.alias || `$$${index}`;
          params[index] = {
            connectionRetryTimeout: 20000,
            capabilities: {
              browserName: browser.browserName,
              'goog:chromeOptions': {
                args: ['--no-sandbox'],
              },
            },
            automationProtocol: browser.protocol,
            hostname: browser.hostname,
            port: browser.port,
          };
          info.push({ ...options, browser, name });
        } else {
          throw new SystemError(`browser not found, option = ${JSON.stringify(options)}`);
        }
      });
      // info.sort((item) => item.name);
      // eslint-disable-next-line no-async-promise-executor
      this.context.browser = new Promise(async (resolve, reject) => {
        let browser!: MultiRemoteBrowserAsync;
        try {
          browser = await multiremote(params);
          await Promise.all(info.map((item) => browser[item.name]?.setWindowRect(0, 0, item.width || 1920, item.height || 1080)));
        } catch (e) {
          reject(e);
        }
        if (browser) {
          const browserProxy = new Proxy(browser, {
            get: (target, prop, receiver) => {
              if (prop === '__info__') {
                return info;
              }
              return Reflect.get(target, prop, receiver);
            },
          });
          resolve(browserProxy);
        }
      });

      this.context.browser.then((browserProxy) => {
        this.context.browser = browserProxy;
        return browserProxy;
      }).catch(() => {
        delete this.context.browser;
      });

      return await this.context.browser as MultiRemoteBrowserAsync;
    } if (this.context.browser instanceof Promise) {
      return await this.context.browser as MultiRemoteBrowserAsync;
    }
    return this.context.browser as MultiRemoteBrowserAsync;
  }

  /**
   * @inheritdoc
   */
  protected async execute(): Promise<boolean> {
    const browser = await this.createBrowserProxy();

    try {
      this.result = {
        command: this.data.command,
        screenshot: [],
      };
      const processScript: ProcessScript = {
        type: -1,
        script: this.data.command,
        // timeout: this.data.config?.timeout || CONFIG.BROWSER_DEFAULT_TIMEOUT,
        timeout: 60000 * 60,
      };
      // console.log(await browser.session);
      const result = (await executeScript([processScript], {
        commonScript: this.context.env.script,
        context: { ...this.createGlobalVMContext(), browser },
      }))[0];

      this.result.logs = result.logs;
      this.result.error = result.error;
      this.totalTime = result.totalTime;

      // 每个步骤结束后截屏
      await browser.pause(500);
      const screenshot = await browser.takeScreenshot();

      screenshot.forEach((item) => {
        this.result.screenshot.push(Buffer.from(item, 'base64'));
      });
      this.result.browserInfo = browser.__info__ as unknown as BrowserInfo[];
      if (result.error) {
        throw new ExecuteError(result.error);
      }
    } catch (e) {
      if (e instanceof BaseError) {
        throw e;
      }
      throw new ExecuteError(e);
    }
    return true;
  }

  //  -------------------------------- 结果相关 --------------------------------

  /**
   * @inheritdoc
   */
  public async getDetailResult(): Promise<BrowserDetailResult> {
    const base = await super.getDetailResult();
    return {
      ...base,
      ...this.result,
    };
  }

  /**
   * Create Init Result
   * @param base
   * @param data
   * @returns {ScriptResult}
   */
  public static createInitResult(base: BaseResult, data: BrowserControllerData): BrowserResult {
    const result: BrowserResult = {
      ...base,
      type: CONTROLLER_TYPE.SCRIPT,
      extra: {},
    };
    return result;
  }
}

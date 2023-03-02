/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import timers from 'node:timers';

const TIMER_FUNCTION = ['Timeout', 'Interval', 'Immediate'];

interface Timers {
  [key: string]: (callback: (...args: any[]) => void, ms: number) => NodeJS.Timeout;
}

interface ClearTimers {
  [key: string]: (id: NodeJS.Timeout | NodeJS.Immediate) => void;
}

/**
 * 虚拟机定时器
 */
export default class VMTimer {
  private onTimerError!: (e: Error) => void;
  private onTimerEnd!: () => void;
  private timer = {} as {
    [key: string]: (NodeJS.Timeout | NodeJS.Immediate)[];
  };

  /**
   * constructor
   * @param onTimerError
   * @param onTimerEnd
   */
  public constructor(onTimerError: (e: Error) => void, onTimerEnd: () => void) {
    this.onTimerError = onTimerError;
    this.onTimerEnd = onTimerEnd;
    TIMER_FUNCTION.forEach((name) => {
      this.timer[name] = [];
    });
  }

  /**
   * get timer
   * @returns
   */
  public getTimer(): any {
    const setFunction: Timers = {};
    const clearFunction: ClearTimers = {};
    TIMER_FUNCTION.forEach((name) => {
      const funName = `set${name}`;
      setFunction[funName] = (callback: (...args: any[]) => void, ms?: number): NodeJS.Timeout => {
        // @ts-ignore
        const timer = timers[funName](() => {
          try {
            callback();
          } catch (e) {
            this.onTimerError(e);
          }
          // 取消定时器
          if (name !== 'Interval') {
            const index = this.timer[name].indexOf(timer);
            if (index !== -1) {
              this.timer[name].splice(index, 1);
              if (this.getTimerCount() === 0) {
                this.onTimerEnd();
              }
            }
          }
        }, ms);
        this.timer[name].push(timer);
        return timer;
      };
    });
    TIMER_FUNCTION.forEach((name) => {
      const funName = `clear${name}`;
      clearFunction[funName] = (id: NodeJS.Timeout | NodeJS.Immediate): void => {
        const index = this.timer[name].indexOf(id);
        if (index !== -1) {
          // @ts-ignore
          timers[funName](id);
          this.timer[name].splice(index, 1);
          if (this.getTimerCount() === 0) {
            this.onTimerEnd();
          }
        }
      };
    });
    return {
      ...setFunction,
      ...clearFunction,
    };
  }

  public getTimerCount(): number {
    return Object.keys(this.timer).reduce((num, item) => num + this.timer[item].length, 0);
  }

  public clearAllTimer(): void {
    TIMER_FUNCTION.forEach((name) => {
      const funcName = `clear${name}`;
      this.timer[name].forEach((id) => {
        // @ts-ignore
        timers[funcName](id);
      });
    });
    // this.onTimerEnd();
  }
}

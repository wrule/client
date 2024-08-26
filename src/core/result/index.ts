/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import EventEmitter from 'node:events';
import throttle from 'lodash/throttle';
import { ControllerData } from '@/core/types/data';
import BaseController from '@/core/base';
import Logger from '@/logger';
import { BaseResult, DetailResult, Result, CombinationResult } from '@/core/types/result';
import { CONTROLLER_TYPE, CONTROLLER_STATUS } from '@/core/enum';
import { CONTROLLER } from '@/core/execute/utils';

export type CreateResult = (steps: ControllerData[], parentId: string) => Result[]
export type StatusCount = Record<CONTROLLER_STATUS, number>;
/**
 * 创建基础结果
 * @param data
 * @param id
 * @returns {BaseResult}
 */
const createBaseResult = (data: ControllerData): BaseResult => ({
  type: data.type,
  name: data.name,
  remark: data.remark,
  flag: data.flag,
  error: [],
  totalTime: 0,
  status: CONTROLLER_STATUS.WAIT,
  id: data.id,
});

const UPDATE_EVENT_DELAY_TIME = [20, 100, 300, 500, 1 * 1000, 2 * 1000, 5 * 1000, 10 * 1000];
const UPDATE_EVENT_DELAY_SIZE = [100, 500, 1000, 3000, 5000, 10000, 20000];

/**
 * 结果收集器
 * @fixme 结果记录条数太多 考虑分批落盘 都在内存可能会溢出
 * @author William Chan <root@williamchan.me>
 */
export default class ResultManager extends EventEmitter {
  /** result map index */
  private index = new Map<string, Result>();
  private detail: DetailResult[] = [];
  /** @var {Result[]} result */
  private result: Result[] = [];
  private statusCount: StatusCount | any = {
    [CONTROLLER_STATUS.DONE]: 0,
    [CONTROLLER_STATUS.INTERACT]: 0,
    [CONTROLLER_STATUS.ERROR]: 0,
    [CONTROLLER_STATUS.RUNNING]: 0,
    [CONTROLLER_STATUS.SKIP]: 0,
    [CONTROLLER_STATUS.WAIT]: 0,
    // [CONTROLLER_STATUS.CANCEL]: 0,
  };

  /** update level */
  private _level = 0;
  /** stop */
  public _stop = false;

  /**
   * 构造函数 创建基础结果
   * @param steps
   * @param id executeId
   */
  public constructor(steps: ControllerData[]) {
    super();
    this.result = this.createResult(steps);
  }

  /**
   * 是否暂停记录
   * @param stop
   */
  public setStop(stop: boolean): void {
    this._stop = stop;
  }

  /**
   * 是否暂停记录
   * @returns {boolean}
   */
  public isStop(): boolean {
    return this._stop;
  }

  /**
   * 收集基础的执行结果
   * @param instance
   */
  public setBaseResult(instance: BaseController<ControllerData>): void {
    const id = instance.id;
    let result = this.index.get(id);
    if (!result) {
      result = this.dataToResult(instance.getData(), id);
      this.index.set(id, result);
      if (instance.parentId !== undefined) {
        const parent = this.index.get(instance.parentId);
        /** @todo 这里应该可以优化 */
        if (parent && ('steps' in parent)) {
          /** @notice 分组的作用是针对 loop poll if data-set 等有组概念的步骤 */
          const group = instance.group;
          if (group !== -1) {
            const groups = parent.steps[group] || [];
            if (Array.isArray(groups)) {
              groups.push(result);
              if (groups !== parent.steps[group]) parent.steps[group] = groups;
            }
          }
        } else {
          Logger.warn('[result] parent step index is null, id=%s, parent=%s.', id, instance.parentId);
        }
      }
    }
    const baseResult = instance.getBaseResult();
    if (result.status !== baseResult.status) {
      this.statusCount[result.status]--;
      this.statusCount[baseResult.status]++;
    }
    (Object.keys(baseResult) as unknown as (keyof BaseResult)[]).forEach((key) => {
      (result as Result)[key] = baseResult[key] as never;
    });
    if (baseResult.status === CONTROLLER_STATUS.RUNNING) {
      this.emitUpdate();
    }
  }

  /**
   * 收集执行结果
   * @param instance
   * @param detailResult
   * @param extraResult
   */
  public setResult(instance: BaseController<ControllerData>, detailResult: DetailResult, extraResult?: any): void {
    if (this._stop) return;
    this.setBaseResult(instance);
    const id = instance.id;
    this.detail[instance.stepId] = {
      ...detailResult,
      stepId: instance.stepId,
    } as any;
    if (extraResult) {
      const result = this.index.get(id);
      if (result) result.extra = extraResult;
    }
    this.emitUpdate();
  }

  private _emitUpdateEvent = UPDATE_EVENT_DELAY_TIME.map((wait) => throttle(() => {
    this.emit('update');
  }, wait));

  /**
   * 发送更新事件
   * 用于外部进度监听
   * @param fast immediately
   */
  public emitUpdate(fast = false): void {
    if (fast === true) {
      this.emit('update');
    } else {
      const size = UPDATE_EVENT_DELAY_SIZE[this._level];
      if (this.index.size >= size) {
        this._level++;
      }
      const fn = this._emitUpdateEvent[this._level];
      if (fn) {
        fn();
      } else {
        this._emitUpdateEvent[this._emitUpdateEvent.length - 1]();
      }
    }
  }

  /**
   * 获取记录数量
   * @returns {number}
   */
  public getSize(): number {
    return this.index.size;
  }

  /**
   * 获取所有状态计数
   * @returns {StatusCount}
   */
  public getStatusCount(): StatusCount {
    return this.statusCount;
  }

  /**
   * 获取记录
   * @returns {Result[]}
   */
  public getResult(): Result[] {
    return this.result;
  }

  /**
   * 获取索引
   * @returns {Map<string, Result>}
   */
  public getIndex(): Map<string, Result> {
    return this.index;
  }

  /**
   * 获取某条记录
   * @param id
   * @returns {T}
   */
  public getIndexById<T extends Result>(id: string | number): T {
    return this.index.get(id.toString()) as T;
  }

  /**
   * 获取详细记录
   * @returns {DetailResult[]}
   */
  public getDetail(): DetailResult[] {
    return this.detail;
  }

  /**
   * 获取某条详细记录
   * @param id
   * @returns {T}
   */
  public getDetailById<T extends DetailResult>(id: number): T {
    const result = this.detail[id] as T;
    return result;
  }

  /**
   * 创建基础子步骤结果（部分组合步骤是动态创建的）
   * @param steps
   * @param parentId
   * @returns {Result[]}
   */
  private createResult(steps: ControllerData[], parentId?: string): Result[] {
    const result: Result[] = [];
    steps.forEach((data, index) => {
      const id = parentId === undefined ? index.toString() : `${parentId}_${index}`;
      const dat = this.dataToResult(data, id);
      this.index.set(id, dat);
      result.push(dat);
    });
    return result;
  }

  /**
   * 执行数据转换为基础结果
   * @param data
   * @param id
   * @returns {Result}
   */
  private dataToResult<T extends ControllerData>(data: T, id: string): Result {
    let result!: Result;
    const Controller = CONTROLLER[data.type];
    const base = createBaseResult(data);
    /** @todo fixme 等待解耦 */
    if (Controller && 'createInitResult' in Controller) {
      result = Controller.createInitResult(base, data);
      if ('steps' in data) {
        const steps = data.steps;
        /** @todo fixme */
        if (data.type === CONTROLLER_TYPE.COMPONENT || data.type === CONTROLLER_TYPE.CONDITION) {
          if (data.steps[0] && Array.isArray(data.steps[0])) {
            (result as CombinationResult).steps = steps.map((item, index) => this.createResult(item as ControllerData[], `${id}_${index}`));
          } else {
            (result as CombinationResult).steps = this.createResult(steps as ControllerData[], id);
          }
        }
      }
    } else {
      Logger.warn('[result] %s init result not define, create base result', CONTROLLER_TYPE[data.type] || 'unknown');
      result = base;
    }
    this.statusCount[result.status]++;
    return result;
  }
}

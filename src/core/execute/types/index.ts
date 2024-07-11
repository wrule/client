/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import EventEmitter from 'node:events';
import { CookieJar, MemoryCookieStore } from 'tough-cookie';
import { DispatchEnv } from '@/dispatch';
import VariableManager, { Variable } from '@/variable';
import { ContentType } from '@/utils/serialize/type';
import { ControllerData, SingleControllerData, CombinationControllerData } from '@/core/types/data';
import { DataSource } from '@/dispatch/types/data-source';
import { BrowserOptions } from '@/dispatch/types/browser';
import { BaseResult, Result } from '@/core/types/result';
import { InstanceResult } from '@/core/pool';
import SingleController from '@/core/single';
import CombinationController from '@/core/combination';
import ResultManager from '@/core/result';
import { CONTROLLER_TYPE } from '@/core/enum';

export type ControllerInstance = SingleController<SingleControllerData> | CombinationController<CombinationControllerData>

export interface CookieManager {
  readonly cookieJar: CookieJar;
  readonly store: MemoryCookieStore;
  getAllCookies(): Promise<any[]>;
}

export interface FileCache {
  [fileKey: string]: Buffer;
}

export interface Context {
  /** 全局顺序 */
  getGlobalIndex(): number;
  setGlobalVariable(key: string, type: ContentType): void;
  readonly env: DispatchEnv;
  readonly variable: VariableManager;
  readonly cookie: CookieManager;
  readonly result: ResultManager;
  readonly files: FileCache;
  readonly event: EventEmitter;
  /** 每次运行的唯一ID */
  readonly uuid: string;
  readonly browsers?: BrowserOptions[];
  readonly traceState?: string;
  browser?: MultiRemoteBrowserAsync | Promise<MultiRemoteBrowserAsync>;
  dataSetCountValue: {
    isDataSet: boolean;
    isCaseDataSet: boolean;

    dataSetTotal: number;
    dataSetTotalRows: number;
    dataSetSuccessCount: number;
    dataSetFailCount: number;
    dataSetSkipCount: number;
    dataSetWaitCount: number;

    caseDataSetTotal: number;
    selectCaseDataSetTotal: number;
    selectCaseDataSetTotalRows: number;
    caseDataSetSuccessCount: number;
    caseDataSetFailCount: number;
    caseDataSetSkipCount: number;
    caseDataSetWaitCount: number;

    currentHasError?: boolean;
  },
  parentType?: CONTROLLER_TYPE;
  requestId?: string;
  usecase?: any;
  isLast?: boolean;
  deepIndexs?: number[];
}

export interface ExecuteConfigData {
  /** id */
  readonly id?: string;
  /** step index */
  readonly index: number;
  /** loop or poll .. execute group [0] [1] [2] ... */
  readonly group?: number;
  /** step deep */
  readonly deep?: number;
  /** skip execute tag = SKIP */
  readonly skip?: boolean;
  /** bypass execute tag = WAIT */
  readonly bypass?: boolean;
  /** 步骤内独享变量 */
  readonly variable?: Variable;
}

export interface ControllerExtraConfig {
  readonly id: string;
  readonly deep?: number;
  readonly parentId?: string;
  readonly group?: number;
  /** step index */
  readonly index?: number;
}

export interface InputInteract {
  input: string[];
  stepId: number;
}

// ------------------------- register controller -------------------------
export interface ControllerStatic<T extends ControllerData = any> {
  new(data: T, context: Context, config?: ControllerExtraConfig): ControllerInstance;
  createInitResult(base: BaseResult, data: T): Result;
}

// ------------------------- register before execute -------------------------
export type BeforeExecuteFunction<T extends ControllerData = any> = (step: T, context: Context) => void;

// ------------------------- register before data-source execute -------------------------
export type BeforeDataSourceExecuteFunction<T extends DataSource = any> = (step: T) => void;

// ------------------------- base data source execute -------------------------

interface BaseDataSourceFields {
  name: string;
}

interface BaseDataSourceExecuteResult {
  fields?: BaseDataSourceFields[];
  rows?: any[][];
  version?: string;
  totalTime: number;
  command: string;
}

export type DataSourceExecute = (
  options: DataSource,
  command: string,
  timeout?: number
) => Promise<BaseDataSourceExecuteResult>;

export type DataSourcePool = (server: DataSource) => Promise<InstanceResult<any>>

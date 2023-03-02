/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { Result, BaseResult, BaseDetailResult } from '@engine/core/types/result';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { ComponentConfig, ComponentControllerParams, ComponentControllerReturns } from '@plugin/component/types/data';
import { ContentType } from '@engine/utils/serialize/type';

// 元件入参
export interface ComponentControllerResultParams extends ComponentControllerParams {

}
// 元件出参
export interface ComponentControllerResultReturns extends ComponentControllerReturns {
  value: ContentType;
}

/**
 * 这里是未经过处理的数据
 */
export interface ComponentExtraResult {
  params?: ComponentControllerParams[];
  returns?: ComponentControllerReturns[];
  config?: ComponentConfig;
}

/**
 * 如果元件执行成功 则会有这部分数据
 */
export interface ComponentDetailResult extends BaseDetailResult {
  /** beforeExecute 后生成 如果没有获取到，要用 Extra 中的 Params 取代 */
  params?: ComponentControllerResultParams[];
  /** afterExecute 后生成 如果没有获取到，要用 Extra 中的 Returns 取代（即不可能存在value） */
  returns?: ComponentControllerResultReturns[];
}

export interface ComponentResult extends BaseResult<ComponentExtraResult> {
  type: CONTROLLER_TYPE.COMPONENT;
  steps: Result[];
}

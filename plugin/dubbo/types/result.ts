/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { DubboParams } from '@plugin/dubbo/types/data';
import { HessianJavaEncoderData } from '@plugin/dubbo/utils';
import { ZooKeeperConfig } from '@plugin/dubbo/types/zookeeper';
import { SingleControllerDetailResult } from '@engine/core/types/result/single';
import { BaseResult } from '@engine/core/types/result';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { SocketInfo } from '@engine/utils/socket';

export interface DubboExtraResult {
  interface: string;
  method: string;
  version?: string;
  group?: string;
  /** 注册中心 */
  serverId: string;
  serverName?: string;
  /**
   * 这是注册中心的地址 非DUBBO服务地址
   * DUBBO 真实服务地址 从 network 取
   */
  registry?: {
    host: string;
    port?: number;
    config: ZooKeeperConfig;
  };
  config?: {
    isDubbox?: boolean;
    /** 泛化 产品上默认可以打钩 */
    isGeneric?: boolean;
    timeout?: number;
  };
  /** DUBBO服务地址 */
  network?: SocketInfo;
  trace?: string;
}

export interface DubboResultErrorStack {
  declaringClass: string;
  fileName: string;
  lineNumber: number;
  methodName: string;
}

export interface DubboResultError {
  message: string;
  stack: DubboResultErrorStack[];
}

export interface DubboDetailResult extends SingleControllerDetailResult {
  // 有哪个显示哪个 区分类别用的
  // Error 只有 RESPONSE_ERROR 才有（服务端返回的业务或本身异常，不包含调用异常）
  result?: any;
  error?: DubboResultError;
  /**
   * 如果没解析就是 DubboParams （用户输入的内容）
   * 如果已解析就是 HessianJavaEncoderData（稍微有些看不懂，区别不大）
   * 这样做的原因是因为不希望为了结果与输入一致，导致变量内容还要在额外解析一次
   * 因为暂时只实现了 DubboParams -> HessianJavaEncoderData 单向 encode
   * 这个对前端影响不大，前端给一个 JSON 编辑器 当 JSON 看吧
   */
  params: DubboParams[] | HessianJavaEncoderData[] | unknown;
}

export interface DubboResult extends BaseResult<DubboExtraResult> {
  type: CONTROLLER_TYPE.DUBBO;
}

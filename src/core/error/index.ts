/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

/**
 * 步骤严重程度排行 等级越高越严重
 * level 1 GENERAL_ERROR PRE_ERROR POST_ERROR RESPONSE_ERROR ASSERT_ERROR
 * level 2 EXECUTE_ERROR ASSIGNMENT_ERROR
 * level 3 SYSTEM_ERROR
 * level 255 UNKNOWN_ERROR
 */

/**
 * Combination Error
 * @enum GENERAL_ERROR
 * @example 用于组合步骤描述子步骤错误
 * e.g index [x] error
 */
export { default as CombinationError } from '@/core/error/combination';
/**
 * Unknown Controller Error
 * @enum SYSTEM_ERROR
 * @example 引擎不认识的步骤
 */
export { default as UnknownControllerError } from '@/core/error/unknown';
/**
 * System Error
 * @enum SYSTEM_ERROR
 * @example 严重阻塞步骤的失败 例如找不到配置 断言、提取执行失败等等（程序异常，一般不会有）
 */
export { default as SystemError } from '@/core/error/system';
/**
 * Execute Error
 * @enum EXECUTE_ERROR
 * @example 步骤中执行的预期错误，超时，连接失败，链接配置错误等等
 */
export { default as ExecuteError } from '@/core/error/execute';
/**
 * Execute Error
 * @enum RESPONSE_ERROR
 * @example 步骤中执行的预期错误，超时，连接失败，链接配置错误等等
 */
export { default as ResponseError } from '@/core/error/response';
/**
 * Timeout Error
 * @enum REQUEST_ERROR
 * @example 步骤中的超时错误
 */
export { default as TimeoutError } from '@/core/error/timeout';
/**
 * 预处理步骤错误
 * @enum PRE_ERROR
 * @example 预处理步骤错误
 */
export { default as PreScriptError } from '@/core/error/pre-script';
/**
 * 后处理步骤错误
 * @enum POST_ERROR
 * @example 后处理步骤错误
 */
export { default as PostScriptError } from '@/core/error/post-script';
/**
 * 断言错误
 * @enum ASSERT_ERROR
 * @example 断言错误
 */
export { default as AssertError } from '@/core/error/assert';
/**
 * 提取出错
 * @enum ASSIGNMENT_ERROR
 * @example 正则错误
 */
export { default as AssignmentError } from '@/core/error/assignment';

/**
 * 交互失败
 * @enum INTERACT_ERROR
 * @example 用户主动点击未完成 用于 confirm
 */
export { default as InteractError } from '@/core/error/interact';

export { default as BaseError } from '@/core/error/base';

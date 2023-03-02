/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
// 以后可能用上
enum EVENT {
  DISPATCH = 0x1,
  QUERY = 0x2,
  INFO = 0x3,
}

enum DISPATCH_EVENT_METHOD {
  EXECUTE = 0x1,
}

interface ProtocolMessage<P = any, C = Buffer> {
  version: number;
  client: number;
  options: number;
  event: EVENT;
  method: DISPATCH_EVENT_METHOD;
  params?: P;
  content?: C;
}

/**
 * 消息接收通用头（20字节）
 * @param TAG 特殊标记(3) 1100 0110 1001 0110 0011 1111
 * @param Version 协议版本(1) 目前请传1
 * @param ClientVersion 客户端版本标识(4) 可以传版本号 预留位置
 * @param Options 选项(1) 预留位置 [or] 目前传0
 * @param Event 事件名称(1) 详见 EVENT
 * @param Method 方法名称(1) 用事件和方法确定你要做什么
 * @param ParamsSize 选项(2) 参数长度 没有就写0 最长 2^16-1
 * @param Params 参数（protocol buffers）
 * @param Content 剩下的都是大数据（protocol buffers）
 *  0                   1                   2                   3
 *  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                   TAG IGNORE                  |    Version    |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                        Client Version                         |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                            Options                            |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |     Event     |    Method     |          Params Size          |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                             Params                            |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                            Content                            |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 */

function decode<P = any, C = Buffer>(data: ArrayBuffer, paramsContent: (Buffer: Buffer) => C): ProtocolMessage<P, C | Buffer> {
  const buffer = Buffer.from(data);
  const version = buffer.readUIntBE(3, 1);
  const client = buffer.readUIntBE(4, 4);
  const options = buffer.readUIntBE(8, 4);
  const event = buffer.readUIntBE(9, 1) as EVENT;
  const method = buffer.readUIntBE(10, 1) as DISPATCH_EVENT_METHOD;
  const paramsSize = buffer.readUIntBE(11, 2);
  const params = paramsSize > 0 && JSON.parse(Buffer.from(data, 12, paramsSize).toString('utf-8'));
  const buff = Buffer.from(data, 12 + paramsSize);
  const content = paramsContent ? paramsContent(buff) : buff;
  return { version, client, options, event, method, params, content };
}

/**
 * 消息返回通用头（12字节）
 * @param TAG 特殊标记(24) 1100 0110 1001 0110 0011 1111
 * @param Version 协议版本(8) 目前是1
 * @param EngineVersion 引擎版本标识(32)
 * @param Event 事件名称(8) 详见 EVENT
 * @param Method 方法名称(8) 用事件和方法确定你要做什么
 * @param ParamsSize 选项(16) 参数长度 没有就写0 最长 2^16-1
 * @param Params 参数（protocol buffers）
 * @param Content 剩下的都是大数据（protocol buffers）
 *
 *  0                   1                   2                   3
 *  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                   TAG IGNORE                  |    Version    |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                        Engine Version                         |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                            Options                            |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |     Event     |    Method     |          Params Size          |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                             Params                            |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                            Content                            |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 */

export { decode };

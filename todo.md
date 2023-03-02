# 一些技术TODO

[ ] 序列化使用 protobufjs 而不是 JSON.stringify（类型结构还不稳定，迁移会消耗大量精力）
 [ ] socket.io 迁移到 ws 使用 protobuf 互传消息
 [ ] 入参和结果文件v2版本转为 protobuf
[ ] 迁移运行时到 nodejs18（新版本性能提升不少）
 [x] 所有包插件支持验证
 [x] c++ addon 支持
 [ ] pkg 新版本迁移
 [x] centos7 patch
[ ] nodejs 快照支持（等待官方稳定API）
[ ] 结构分包（因为最终pkg打包，需要考虑require路径，可做后替换支持）
[ ] 缩小二进制包
 [ ] mssql等几个包引入了非常多不必要的东西 需要简化
[ ] 所有插件动态加载（调研可行，但需要考虑编程范式，不是很紧急）
[ ] nodejs自己也在做SEA支持 到时候考虑迁移 https://github.com/nodejs/node/pull/42334

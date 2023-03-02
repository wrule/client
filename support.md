# 引擎协议操作系统支持情况

* 引擎不支持所有`32`位系统，除 macOS 外也没有预编译 arm64 架构，如需使用需要后编译。
* Linux 推荐使用 Ubuntu 或 Debian，由于部分协议依赖glibc libstdc++ 高版本，未对 CentOS 做全面的测试与兼容，理论上没有问题，可能需要升级部分库。
* 部分协议不支持 Alpine Linux musl-libc，未做详细测试。
* 除 macOS 未测试任何 Unix 系的操作系统，理论上 FreeBSD 可以部分支持，但未详细测试与编译。
* 如果引擎自行构建请注意区分 libiconv 与 iconv。
* Windows 可能需要v140以上的 vc++ 运行时支持。

| 协议/数据库 | Windows | Linux | macOS | macOS Apple Silicon |
| --------  | ------- | ----- | ----- | -------------------- |
| HTTP | 支持 | 支持 | 支持 | 支持 |
| Dubbo | 支持 | 支持 | 支持 | 支持 |
| T2 | 支持 | 支持 | - | - |
| MySQL | 支持 | 支持 | 支持 | 支持 |
| Redis | 支持 | 支持 | 支持 | 支持 |
| MongoDB | 支持 | 支持 | 支持 | 支持 |
| OracleDB | 支持 | 支持 | 支持 | - |
| MSSQL | 支持 | 支持 | 支持 | 支持 |
| PostgreSQL | 支持 | 支持 | 支持 | 支持 |


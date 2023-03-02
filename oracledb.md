# 使用 oracledb
需要下载依赖的客户端动态库 https://www.oracle.com/database/technologies/instant-client/downloads.html

## Windows
最低支持 Version 19.12.0.0.0 x64 版本，启动时使用 -L 指定路径

## macOS
最低支持 Version 12.2.0.1.0 x64 版本，启动时使用 -L 指定路径
不支持 M1 macOS ARM 官方暂时没有客户端

## Linux
最低支持 Version 12.2.0.1.0 x64 以及 19.12.0.0.0 ARM (aarch64)

### 普通发行版（gnu libc）
```shell
# 下载到 /opt/oracle
echo /opt/oracle > /etc/ld.so.conf.d/oracle-instantclient.conf
ldconfig
# 然后查询是否配置成功 ldconfig -v
```
### alpine (musl libc)
```shell
# 下载到 /usr/lib
# 安装 libaio libnsl
apk add --update libaio libnsl
# 版本太新了 兼容一下
ln /usr/lib/libnsl.so.2 /usr/lib/libnsl.so.1
# musl 连接 glibc 大部分兼容没什么关系
ln /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2
```

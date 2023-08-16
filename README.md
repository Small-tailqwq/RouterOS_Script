# RouterOS_Script

### PPPOE+1S

> 它是干什么的？

这段代码是一个 MikroTik 路由器上的脚本，用于监测网络连接状态并在连接故障时尝试恢复连接。下面是对代码的解释：

1. 设置 ping 目标地址：这一行代码定义了需要进行 ping 测试的目标地址列表，包括 "baidu.com" 和 "aliyun.com"。

2. 设置 pppoe 网口：这一行代码定义了使用的 PPPoE 网络接口，名称为 "pppoe-out1"。

3. 初始化变量：初始化了一个布尔变量 "allPingFailed" 为真，表示所有的 ping 测试都失败了。同时，全局变量 "recall" 也被声明，并初始化为 0。

4. 循环遍历 ping 目标：使用 foreach 循环，遍历之前定义的 ping 目标列表。在每次迭代中，进行以下操作：

   a. 执行 ping 测试：使用 `/ping` 命令对当前目标进行 ping 测试，发送 10 个 ICMP 报文，间隔 1 秒。

   b. 判断 ping 测试结果：如果 ping 成功结果大于 6（即丢包率不超过40%），表示 ping 成功，将 "allPingFailed" 设置为假，并记录日志表明成功。

5. 检查 ping 测试结果：如果所有 ping 测试都失败（即 "allPingFailed" 仍为真），则执行以下操作：

   a. 记录日志并重启 PPPoE 接口：记录日志表明所有目标都无法 ping 通，然后禁用指定的 PPPoE 网络接口，等待 15 秒，然后重新启用该接口。

   b. 增加恢复次数：将 "recall" 变量增加 1。

   c. 执行 DDNS 更新脚本：运行名为 "ddns-cloudflare" 的脚本来更新 DDNS（动态域名解析）。

   d. 重新执行 ping 测试：再次遍历 ping 目标列表，执行 ping 测试，如果某个 ping 测试成功，则将 "recall" 设置为 0，表示网络已恢复。

6. 最终检查：如果 "recall" 大于 5，表示 PPPoE 接口已经尝试恢复连接 5 次但仍然无法访问外部网络，此时执行以下操作：

   a. 记录日志并重启路由器：记录日志表明已尝试多次恢复但未成功，然后执行 `/ system reboot` 命令重启路由器。（`/system/reboot` 需要二次验证，不适用于脚本）

这段代码主要用于监测网络连接状态，当网络连接故障时尝试通过重启 PPPoE 接口或路由器来恢复连接。同时，它还记录了不同操作的日志信息以便后续分析。需要注意的是，这段代码使用了 MikroTik 路由器的命令和脚本语法。

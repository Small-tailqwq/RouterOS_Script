# 在 raw 链添加两条用于标记端口扫描者（nmap）并拦截的规则
/ip firewall raw
# 丢弃所有被标记用户的 ip 入站流量
# 这条规则应该在标记之上，可以避免重复标记
add action=drop chain=prerouting src-address-list=port_scanners_ipv4 comment="pscanconf: Drop port scanners"
# 检测 WAN 口入站流量，使用PSD工具对高位端口和地位端口进行分权计算，3s周期内总权重超过15将被判定为扫描者，拦截时间为1天
# 这条规则可以根据自身需求开启日志功能，用于留存封禁日志
add action=add-src-to-address-list chain=prerouting in-interface-list=WAN protocol=tcp psd=15,3s,3,1 \
    address-list=port_scanners_ipv4 address-list-timeout=1d comment="pscanconf: Port Scan detection"

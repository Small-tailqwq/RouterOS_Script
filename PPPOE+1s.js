# 设置 ping 地址
:local pingTargets ("baidu.com", "aliyun.com")
# 设置 pppoe 网口
:local pppoeInterface "pppoe-out1"
:local allPingFailed true
:global recall
:if ([:typeof $recall] = "nothing") do={
    :set recall 0
}

:foreach target in=$pingTargets do={
    :local pingResult [/ping $target count=10 interval=1s]; 
    :if ($pingResult > 6) do={
        :set allPingFailed false;
        :log info "Ping to $target successful.";
    }
}

:if ($allPingFailed) do={
    :log info "Ping to all targets failed. Restarting PPPoE interface.";
    /interface pppoe-client disable $pppoeInterface;
    :delay 15s;
    /interface pppoe-client enable $pppoeInterface;
    :delay 2s;
    :set recall ($recall + 1);
    /system/script/run ddns-cloudflare
    :foreach target in=$pingTargets do={
        :local pingResult [/ping $target count=10 interval=1s]; 
        :if ($pingResult > 6) do={
            :set recall 0;
            :log info "Network is alive.";
        }
    }
}

:if ($recall > 5) do={
    :log info "PPPoE has been restarted 5 times but still cannot access the external network. Restarting RouterOS.";
    / system reboot
}

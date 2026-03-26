################# CloudFlare 变量 #################
# 是否开启debug调试模式 
:local CFDebug "false"
# 是否开启CFcloud功能
:local CFcloud "false"


# 修改为你要ddns的域名，若是二级域名，这里填写完整的二级域名
:local CFdomain "ddns.domain.com"

# CloudFlare 全局密钥token或者有权限操作解析域名的token  
:local CFtkn "9b9fd4cd10000000000000000000000000000"

# CloudFlare 邮箱
:local CFemail "0000000000@0000.000"
# 域名zoneId
:local CFzoneid "353e73000000000000000"  
# 要ddns的域名记录id
:local CFid "874000000000000000000000000000"

# 记录类型 A表示IPv4,AAAA表示IPv6 
:local CFrecordType ""
:set CFrecordType "AAAA"

# 记录ttl值，一般无需修改
:local CFrecordTTL "120"

#########################################################################
########################  下面的内容请勿修改 ############################  
#########################################################################

:log info "开始更新解析记录 $CFdomain ..."

################# 内部变量 variables #################
:local previousIP ""
:global WANip ""

:local CFurl "https://api.cloudflare.com/client/v4/zones/"
:set CFurl ($CFurl . "$CFzoneid/dns_records/$CFid");
 
:if ($CFcloud = "true") do={
  :set WANip [/ip cloud get public-address]  
};

:if ($CFcloud = "false") do={
  :local result [/tool fetch url="http://6.ipw.cn/" as-value output=user];
  :set WANip ($result->"data");
};
:log info ("当前获取到的 WAN IP: " . $WANip);

:if ([/file find name=ddns.tmp.txt] = "") do={
  :log error "没有找到记录前一个公网IP地址的文件, 自动创建..." 
  :set previousIP $WANip;
  :execute script=":put $WANip" file="ddns.tmp";
  :log info ("CF: 开始更新解析记录, 设置 $CFdomain = $WANip") 
  
  /tool fetch http-method=put mode=https output=none url="$CFurl" http-header-field=("X-Auth-Email:$CFemail","X-Auth-Key:$CFtkn","Content-Type:application/json") http-data="{\"id\":\"$CFid\",\"type\":\"$CFrecordType\",\"name\":\"$CFdomain\",\"ttl\":$CFrecordTTL,\"content\":\"$WANip\"}"
  
} else={
  :if ( [/file get [/file find name=ddns.tmp.txt] size] > 0 ) do={ 
    :global content [/file get [/file find name="ddns.tmp.txt"] contents] ;
    :global lastEnd 0;   
    :local lineEnd [:find $content "\n" $lastEnd ] ;
    :local line [:pick $content $lastEnd $lineEnd] ;
    :if ( [:pick $line 0 1] != "#" ) do={   
      :set previousIP [:pick $line 0 $lineEnd ];
      :set previousIP [:pick $previousIP 0 [:find $previousIP "\r"]];
    }
  }  
}

######## 将调试信息写入日志 ################# 
:if ($CFDebug = "true") do={
  :log info ("CF: 域名 = $CFdomain")
  :log info ("CF: 前一个解析IP地址 = $previousIP")
  :log info ("CF: 当前IP地址 = $WANip") 
  :log info ("CF: 请求CFurl = $CFurl")
};
  
######## 比较并更新记录 ######  
:if ($previousIP != $WANip) do={
  :log info ("CF: 开始更新解析记录, 设置 $CFdomain = $WANip")
  
  /tool fetch http-method=put mode=https output=none url="$CFurl" http-header-field=("X-Auth-Email:$CFemail","X-Auth-Key:$CFtkn","Content-Type:application/json") http-data="{\"id\":\"$CFid\",\"type\":\"$CFrecordType\",\"name\":\"$CFdomain\",\"ttl\":$CFrecordTTL,\"content\":\"$WANip\"}"
  
  /ip dns cache flush 
  :if ( [/file get [/file find name=ddns.tmp.txt] size] > 0 ) do={
    /file remove ddns.tmp.txt
    :execute script=":put $WANip" file="ddns.tmp"
  } 
} else={
  :log info "CF: IP未发生改变，无需更新!"
}

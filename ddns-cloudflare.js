#########################################################################
#         ==================================================            #
#         $ Mikrotik RouterOS 更新 CloudFlare动态DDNS脚本  $            #
#         ==================================================            #
#                                                                       #
# - 首先你需要一个CloudFlare的帐号和api密钥,                            #
# - 一个域名的区域Id（CFzoneid）和  域名记录Id（CFid）                  #
# - 使用前请先修改第一节的CloudFlare变量再使用,                         #
# - 这2个值可以在CloudFlare面板中查看，或者是通过F12查看接口数据        # 
# - 通过F12查看CFid接口后缀为xxxxxx/dns_records?per_page=50                #
# - 或者通过postman等工具调用官方的API接口进行获取                      #
# - 如果需要，启用CFDebug - 它将打印一些信息到日志中                    #
# - 如果你的公网没有公网IP，你可以打开CFcloud开关                        #
# - 将脚本放在 /system scripts 并且允许 read,write,ftp 这三个权限即可   #
# - 本脚本lcry在RouterOS V7.6版本上测试通过，可以放心试用               #
# - 配合scheduler调度器可以达到IP地址变化自动更新解析记录                #
# - 必须要在RouterOS 6.44beta75 版本以上本脚本才可能支持                #
#                                                                       #
#              Credits for Samuel Tegenfeldt, CC BY-SA 3.0              #
#                        Modified by kiler129                           #
#                        Modified by viritt                             #
#                        Modified by asuna                              #
#                        Modified by mike6715b                          #
#                        Sinicization by lcry                           #
#                                                                       #
#                    2023年8月16日7.11版本测试正常工作                    #
#########################################################################

################# CloudFlare 变量 #################
# 是否开启debug调试模式
:local CFDebug "false"
# 是否开启CFcloud功能
:local CFcloud "false"

# 修改为有公网IP的接口名称
:global WANInterface "pppoe-out1"

# 修改为你要ddns的域名，若是二级域名，这里填写完整的二级域名
:local CFdomain "**.******.***"

# CloudFlare 全局密钥token或者有权限操作解析域名的token
:local CFtkn "*************************************"

# CloudFlare 邮箱
:local CFemail "************@gmail.com"
# 域名zoneId
:local CFzoneid "353e*****************************"
# 要ddns的域名记录id
:local CFid "87400**************************"

# 记录类型 一般无需修改
:local CFrecordType ""
:set CFrecordType "A"

# 记录ttl值，一般无需修改
:local CFrecordTTL ""
:set CFrecordTTL "120"

#########################################################################
########################  下面的内容请勿修改 ############################
#########################################################################

:log info "开始更新解析记录 $CFDomain ..."

################# 内部变量 variables #################
:local previousIP ""
:global WANip ""

################# 构建 CF API Url (v4) #################
:local CFurl "https://api.cloudflare.com/client/v4/zones/"
:set CFurl ($CFurl . "$CFzoneid/dns_records/$CFid");
 
################# 获取或设置以前的ip变量 #################
:if ($CFcloud = "true") do={
    :set WANip [/ip cloud get public-address]
};

:if ($CFcloud = "false") do={
    :local currentIP [/ip address get [/ip address find interface=$WANInterface ] address];
    :set WANip [:pick $currentIP 0 [:find $currentIP "/"]];
};

:if ([/file find name=ddns.tmp.txt] = "") do={
    :log error "没有找到记录前一个公网IP地址的文件, 自动创建..."
    :set previousIP $WANip;
    :execute script=":put $WANip" file="ddns.tmp";
    :log info ("CF: 开始更新解析记录, 设置 $CFDomain = $WANip")
    /tool fetch http-method=put mode=https output=none url="$CFurl" http-header-field="X-Auth-Email:$CFemail,X-Auth-Key:$CFtkn,Content-Type:application/json" http-data="{\"id\":\"$CFid\",\"type\":\"$CFrecordType\",\"name\":\"$CFdomain\",\"ttl\":$CFrecordTTL,\"content\":\"$WANip\"}"
    :error message="没有找到前一个公网IP地址的文件."
} else={
    :if ( [/file get [/file find name=ddns.tmp.txt] size] > 0 ) do={ 
    :global content [/file get [/file find name="ddns.tmp.txt"] contents] ;
    :global contentLen [ :len $content ] ;  
    :global lineEnd 0;
    :global line "";
    :global lastEnd 0;   
            :set lineEnd [:find $content "\n" $lastEnd ] ;
            :set line [:pick $content $lastEnd $lineEnd] ;
            :set lastEnd ( $lineEnd + 1 ) ;   
            :if ( [:pick $line 0 1] != "#" ) do={   
                #:local previousIP [:pick $line 0 $lineEnd ]
                :set previousIP [:pick $line 0 $lineEnd ];
                :set previousIP [:pick $previousIP 0 [:find $previousIP "\r"]];
            }
    }
}

######## 将调试信息写入日志 #################
:if ($CFDebug = "true") do={
 :log info ("CF: 域名 = $CFdomain")
 :log info ("CF: 前一个解析IP地址 = $previousIP")
 :log info ("CF: 当前IP地址 = $currentIP")
 :log info ("CF: 公网IP = $WANip")
 :log info ("CF: 请求CFurl = $CFurl&content=$WANip")
 :log info ("CF: 执行命令 = \"/tool fetch http-method=put mode=https url=\"$CFurl\" "X-Auth-Email:$CFemail,X-Auth-Key:$CFtkn,Content-Type:application/json" output=none http-data=\"{\"id\":\"$CFid\",\"type\":\"$CFrecordType\",\"name\":\"$CFdomain\",\"ttl\":$CFrecordTTL,\"content\":\"$WANip\"}\"")
};
  
######## 比较并更新记录 #####
:if ($previousIP != $WANip) do={
 :log info ("CF: 开始更新解析记录, 设置 $CFDomain = $WANip")
 /tool fetch http-method=put mode=https url="$CFurl" http-header-field="X-Auth-Email:$CFemail,X-Auth-Key:$CFtkn,Content-Type:application/json" output=none http-data="{\"id\":\"$CFid\",\"type\":\"$CFrecordType\",\"name\":\"$CFdomain\",\"ttl\":$CFrecordTTL,\"content\":\"$WANip\"}"
 /ip dns cache flush
    :if ( [/file get [/file find name=ddns.tmp.txt] size] > 0 ) do={
        /file remove ddns.tmp.txt
        :execute script=":put $WANip" file="ddns.tmp"
    }
} else={
 :log info "CF: 未发生改变，无需更新!"
}

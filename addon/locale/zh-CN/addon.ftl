service-huoshanweb=火山网页翻译
service-tencenttransmart=腾讯TranSmart
service-huoshan=火山翻译
service-googleapi=Google(API)
service-google=Google
service-cnki=CNKI
service-youdao=有道
service-youdaozhiyun=有道智云
service-youdaozhiyunllm=有道子曰
service-niutranspro=小牛
service-microsoft=微软
service-caiyun=彩云
service-libretranslate=LibreTranslate
service-mtranserver=MTranServer
service-deeplfree=DeepL(免费订阅)
service-deeplpro=DeepL(Pro订阅)
service-deeplcustom=DeepLX(API)
service-deeplx=DeepLX
service-baidu=百度
service-baidufield=百度垂直领域
service-openl=OpenL
service-tencent=腾讯
service-aliyun=阿里
service-xftrans=讯飞
service-chatgpt=ChatGPT
service-customgpt1=自定义GPT1
service-customgpt2=自定义GPT2
service-customgpt3=自定义GPT3
service-azuregpt=AzureGPT
service-gemini=Gemini
service-qwenmt=Qwen-MT
service-claude=Claude
service-haici=海词
service-bing=必应
service-pot=Pot
service-nllb=NLLB
service-bingdict=必应词典(en→zh)🔊
service-cambridgedict=剑桥词典(en→other)🔊
service-haicidict=海词词典(en→zh)🔊
service-collinsdict=科林斯词典(en→zh)🔊
service-youdaodict=有道词典(en→zh)🔊
service-freedictionaryapi=FreeDictionaryAPI(en→en)
service-webliodict=Weblio Dict(en→ja)
service-errorPrefix=[请求错误]
    此翻译服务不可用，可能是密钥错误，也可能是请求过快。
    可以尝试其他翻译服务，或者来此查看相关回答：
    https://zotero.yuque.com/staff-gkhviy/pdf-trans/age09f
    
    请注意，这些错误与 Zotero 和本翻译插件无关，由该翻译服务引起：

service-dialog-config=配置
service-dialog-title={ $service } 配置
service-dialog-save=保存
service-dialog-close=关闭
service-dialog-help=帮助
service-dialog-custom-request-description=参考服务提供商的API文档，添加自定义参数。这些参数将与标准参数合并。
service-dialog-custom-request-title=自定义请求参数
service-dialog-custom-request-add-param=添加参数
service-dialog-custom-request-parameter-name=参数名称
service-dialog-custom-request-parameter-value=参数值
service-dialog-custom-request-parameter-name-placeholder=参数名称
service-dialog-custom-request-parameter-value-placeholder=参数值（JSON 格式）
service-dialog-custom-request-validation-title=无法保存自定义参数
service-dialog-custom-request-validation-summary=有些参数值不是有效的 JSON，请修改后重试。
service-dialog-custom-request-validation-errors-head=请检查以下项目：
service-dialog-custom-request-validation-error-invalid=- { $key }：格式无效（{ $detail }）
service-dialog-custom-request-validation-error-empty=- { $key }：值为空
service-dialog-custom-request-validation-error-duplicate=- { $key }：参数名重复
service-dialog-custom-request-validation-examples-head=“参数值”填写示例：
service-dialog-custom-request-validation-example-boolean=- 布尔值：false
service-dialog-custom-request-validation-example-number=- 数字：123
service-dialog-custom-request-validation-example-string=- 文本："text"
service-dialog-custom-request-validation-example-object=- 对象：{ $example }

service-niutranspro-dialog-endpoint=接口
service-niutranspro-dialog-username=用户名
service-niutranspro-dialog-password=密码
service-niutranspro-dialog-signup=注册
service-niutranspro-dialog-forget=忘记密码
service-niutranspro-dialog-dictLib=术语词典
service-niutranspro-dialog-memoryLib=翻译记忆
service-niutranspro-dialog-tip0=请到
service-niutranspro-dialog-tip1=小牛翻译云平台
service-niutranspro-dialog-tip2=进行添加术语词典库
service-niutranspro-dialog-signin=登录
service-niutranspro-dialog-refresh=刷新
service-niutranspro-dialog-signout=退出登录

service-deeplcustom-dialog-endPoint=接口
service-deeplx-dialog-endPoint=接口

service-chatgpt-dialog-endPoint=接口
service-chatgpt-dialog-model=模型
service-chatgpt-dialog-temperature=温度
service-chatgpt-dialog-prompt=提示词
service-chatgpt-dialog-stream=流式输出
service-chatgpt-dialog-custom-request=自定义请求

service-azuregpt-dialog-endPoint=接口
service-azuregpt-dialog-model=部署名
service-azuregpt-dialog-temperature=温度
service-azuregpt-dialog-stream=流式输出
service-azuregpt-dialog-apiVersion=版本
service-azuregpt-dialog-prompt=提示词
service-azuregpt-dialog-custom-request=自定义请求

service-xftrans-dialog-engine=翻译引擎

service-gemini-dialog-endPoint=接口
service-gemini-dialog-prompt=提示词
service-gemini-dialog-stream=流式输出

service-qwenmt-dialog-endPoint=API地址
service-qwenmt-dialog-model=模型
service-qwenmt-dialog-domains=领域提示词

service-claude-dialog-endPoint=接口
service-claude-dialog-model=模型
service-claude-dialog-temperature=温度
service-claude-dialog-prompt=提示词
service-claude-dialog-stream=流式输出
service-claude-dialog-maxTokens=最大输出长度

service-cnki-settings=设置
service-cnki-dialog-regex=CNKI广告移除正则表达式
service-cnki-dialog-split=超过800字符自动拆分翻译

service-aliyun-dialog-action=版本
service-aliyun-dialog-scene=场景

service-tencent-dialog-secretid=密钥ID
service-tencent-dialog-secretkey=密钥Key
service-tencent-dialog-region=地域
service-tencent-dialog-projectid=项目ID
service-tencent-dialog-termrepoid=术语库IDs (可选)
service-tencent-dialog-sentrepoid=例句库IDs (可选)

service-youdaozhiyun-dialog-domain=领域
service-youdaozhiyunllm-dialog-model=模型
service-youdaozhiyunllm-dialog-pro=有道智云子曰大模型Pro-14B
service-youdaozhiyunllm-dialog-lite=有道智云子曰大模型Lite-1.5B
service-youdaozhiyunllm-dialog-prompt=提示词
service-youdaozhiyunllm-dialog-stream=流式输出

readerpopup-translate-label=翻译
readerpopup-addToNote-label=添加翻译至笔记

pref-title=翻译

field-titleTranslation=标题翻译
field-abstractTranslation=摘要翻译

status-translating=正在翻译...
sideBarIcon-title=翻译注释

service-manageKeys-title=管理翻译服务密钥
service-manageKeys-head=管理所有翻译服务密钥，直接编辑 JSON 文件并点击保存。
service-manageKeys-save=保存
service-manageKeys-close=关闭

service-renameServices-title=重命名自定义GPT服务
service-renameServices-head=输入新的服务名称并点击保存。
service-renameServices-hint=所做更改将在插件或Zotero重启后生效
service-renameServices-save=保存
service-renameServices-close=关闭

service-libretranslate-dialog-endPoint=API 地址

service-mtranserver-dialog-endPoint=接口
service-mtranserver-dialog-versionlabel=使用MTranServer v3.0.0+

service-pot-dialog-port=端口

service-nllb-dialog-model=nllb 模型
service-nllb-dialog-apiendpoint=nllb-api 接口
service-nllb-dialog-apistream=nllb-api 流式输出
service-nllb-dialog-serveendpoint=nllb-serve 接口
service-nllb-dialog-apilabel=nllb-api 文档
service-nllb-dialog-servelabel=nllb-serve 文档

pluginData-dialog-title=Zotero 翻译插件
pluginData-export-title=导出插件数据
pluginData-import-title=导入插件数据
pluginData-backup-saved=插件数据已备份到：
    { $path }
pluginData-backup-failed=备份插件数据失败：
    { $reason }
pluginData-restore-success=插件数据已从以下文件恢复：
    { $path }
pluginData-restore-failed=恢复插件数据失败：
    { $reason }
pluginData-file-empty=备份文件为空。
pluginData-addon-mismatch=该备份来自“{ $addonID }”。是否继续还原？
pluginData-restore-confirm=是否从该备份恢复插件数据？
pluginData-restore-overwrite-check=同时覆盖写回“标题翻译”和“摘要翻译”（可能覆盖现有值）
pluginData-reset-confirm=确定要将插件全部设置恢复为默认值吗？此操作无法撤销。
pluginData-reset-clearTranslations-check=同时清理全部条目的“标题翻译”和“摘要翻译”
pluginData-reset-success=插件数据已恢复默认值。

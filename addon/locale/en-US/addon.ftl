service-huoshanweb=Volcengine Web
service-tencenttransmart=Tencent Transmart
service-huoshan=Huoshan
service-googleapi=Google(API)
service-google=Google
service-cnki=CNKI
service-youdao=Youdao
service-youdaozhiyun=Youdao Zhiyun
service-youdaozhiyunllm=Youdao LLM
service-niutranspro=Niu Trans
service-microsoft=Microsoft
service-caiyun=Caiyun
service-libretranslate=LibreTranslate
service-mtranserver=MTranServer
service-deeplfree=DeepL(Free Plan)
service-deeplpro=DeepL(Pro Plan)
service-deeplcustom=DeepLX(API)
service-deeplx=DeepLX
service-baidu=Baidu
service-baidufield=Baidu Field
service-openl=OpenL
service-tencent=Tencent
service-aliyun=Aliyun
service-xftrans=Xftrans
service-chatgpt=ChatGPT
service-customgpt1=Custom GPT 1
service-customgpt2=Custom GPT 2
service-customgpt3=Custom GPT 3
service-azuregpt=AzureGPT
service-gemini=Gemini
service-qwenmt=Qwen-MT
service-claude=Claude
service-haici=Haici
service-bing=Bing
service-pot=Pot
service-nllb=NLLB
service-bingdict=Bing Dict(en→zh)🔊
service-cambridgedict=Cambridge Dict(en→other)🔊
service-haicidict=Haici Dict(en→zh)🔊
service-collinsdict=Collins Dict(en→zh)🔊
service-youdaodict=Youdao Dict(en→zh)🔊
service-freedictionaryapi=FreeDictionaryAPI(en→en)
service-webliodict=Weblio Dict(en→ja)
service-errorPrefix=[Request Error]
    Service not available, invalid secret, or request too fast.
    Use another translation service or post the issue here: 
    https://github.com/windingwind/zotero-pdf-translate/issues
    
    The message below is not Zotero or the Translate plugin, but from

service-dialog-config=Config
service-dialog-title={ $service } Config
service-dialog-save=Save
service-dialog-close=Close
service-dialog-help=Help
service-dialog-custom-request-description=Refer to API documentation of service provider, add custom parameters. These will be merged with the standard parameters (model, messages, temperature, stream).
service-dialog-custom-request-title=Custom Request Parameters
service-dialog-custom-request-add-param=Add Parameter
service-dialog-custom-request-parameter-name=Parameter Name
service-dialog-custom-request-parameter-value=Parameter Value
service-dialog-custom-request-parameter-name-placeholder=Parameter name
service-dialog-custom-request-parameter-value-placeholder=Parameter value (JSON format)
service-dialog-custom-request-validation-title=Can't Save Custom Parameters
service-dialog-custom-request-validation-summary=Some parameter values are not valid JSON. Please fix them and try again.
service-dialog-custom-request-validation-errors-head=Please check:
service-dialog-custom-request-validation-error-invalid=- { $key }: invalid format ({ $detail })
service-dialog-custom-request-validation-error-empty=- { $key }: value is empty
service-dialog-custom-request-validation-error-duplicate=- { $key }: duplicate parameter name
service-dialog-custom-request-validation-examples-head=Examples for the value field:
service-dialog-custom-request-validation-example-boolean=- Boolean: false
service-dialog-custom-request-validation-example-number=- Number: 123
service-dialog-custom-request-validation-example-string=- Text: "text"
service-dialog-custom-request-validation-example-object=- Object: { $example }

service-niutranspro-dialog-endpoint=Endpoint
service-niutranspro-dialog-username=Username
service-niutranspro-dialog-password=Password
service-niutranspro-dialog-signup=Sign up
service-niutranspro-dialog-forget=Forget
service-niutranspro-dialog-dictLib=Dict Lib
service-niutranspro-dialog-memoryLib=Memory Lib
service-niutranspro-dialog-tip0=Please go to the
service-niutranspro-dialog-tip1=Niutrans Cloud Platform
service-niutranspro-dialog-tip2=to add the term dictionary library
service-niutranspro-dialog-signin=Sign In
service-niutranspro-dialog-refresh=Refresh
service-niutranspro-dialog-signout=Sign Out

service-deeplcustom-dialog-endPoint=EndPoint
service-deeplx-dialog-endPoint=EndPoint

service-chatgpt-dialog-endPoint=API
service-chatgpt-dialog-model=Model
service-chatgpt-dialog-temperature=Temp
service-chatgpt-dialog-prompt=Prompt
service-chatgpt-dialog-stream=Stream
service-chatgpt-dialog-custom-request=Custom Request

service-azuregpt-dialog-endPoint=EndPoint
service-azuregpt-dialog-model=Name
service-azuregpt-dialog-temperature=Temp
service-azuregpt-dialog-apiVersion=Version
service-azuregpt-dialog-prompt=Prompt
service-azuregpt-dialog-stream=Stream
service-azuregpt-dialog-custom-request=Custom Request

service-xftrans-dialog-engine=API Engine

service-gemini-dialog-endPoint=EndPoint
service-gemini-dialog-prompt=Prompt
service-gemini-dialog-stream=Stream

service-qwenmt-dialog-endPoint=EndPoint
service-qwenmt-dialog-model=Model
service-qwenmt-dialog-domains=Domains

service-claude-dialog-endPoint=EndPoint
service-claude-dialog-model=Model
service-claude-dialog-temperature=Temp
service-claude-dialog-prompt=Prompt
service-claude-dialog-stream=Stream
service-claude-dialog-maxTokens=Max Tokens

service-cnki-settings=Settings
service-cnki-dialog-regex=CNKI Addvertisements Regex
service-cnki-dialog-split=Automatically split translation for more than 800 characters

service-aliyun-dialog-action=Action
service-aliyun-dialog-scene=Scene

service-tencent-dialog-secretid=Secret ID
service-tencent-dialog-secretkey=Secret Key
service-tencent-dialog-region=Region
service-tencent-dialog-projectid=Project ID
service-tencent-dialog-termrepoid=Term Repo IDs (optional)
service-tencent-dialog-sentrepoid=Sent Repo IDs (optional)

service-youdaozhiyun-dialog-domain=Domain
service-youdaozhiyunllm-dialog-model=Model
service-youdaozhiyunllm-dialog-pro=Youdao LLM Pro-14B
service-youdaozhiyunllm-dialog-lite=Youdao LLM Lite-1.5B
service-youdaozhiyunllm-dialog-prompt=Prompt
service-youdaozhiyunllm-dialog-stream=Stream

readerpopup-translate-label=Translate
readerpopup-addToNote-label=Add Translation to Note

pref-title=Translate

field-titleTranslation=Title Translation
field-abstractTranslation=Abstract Translation

status-translating=Translating...
sideBarIcon-title=Translate annotation

service-manageKeys-title=Manage Translation Service Keys
service-manageKeys-head=Manage all translation service keys. Edit the JSON directly and click Save.
service-manageKeys-save=Save
service-manageKeys-close=Close

service-renameServices-title=Rename Custom GPT Services
service-renameServices-head=Input the new name and click Save.
service-renameServices-hint=Changes take effect after restarting the plugin or Zotero
service-renameServices-save=Save
service-renameServices-close=Close

service-libretranslate-dialog-endPoint=API Endpoint

service-mtranserver-dialog-endPoint=EndPoint
service-mtranserver-dialog-versionlabel=Use MTranServer v3.0.0+

service-pot-dialog-port=Port

service-nllb-dialog-model=nllb Model
service-nllb-dialog-apiendpoint=nllb-api EndPoint
service-nllb-dialog-apistream=nllb-api Stream
service-nllb-dialog-serveendpoint=nllb-serve EndPoint
service-nllb-dialog-apilabel=nllb-api Docs
service-nllb-dialog-servelabel=nllb-serve Docs

pluginData-dialog-title=Translate for Zotero
pluginData-export-title=Export Plugin Data
pluginData-import-title=Import Plugin Data
pluginData-backup-saved=Plugin data backup saved to:
    { $path }
pluginData-backup-failed=Failed to backup plugin data:
    { $reason }
pluginData-restore-success=Plugin data restored successfully from:
    { $path }
pluginData-restore-failed=Failed to restore plugin data:
    { $reason }
pluginData-file-empty=Backup file is empty.
pluginData-addon-mismatch=This backup belongs to "{ $addonID }". Restore anyway?
pluginData-restore-confirm=Restore plugin data from this backup now?
pluginData-restore-overwrite-check=Also overwrite Title Translation and Abstract Translation fields from backup (may replace existing values)
pluginData-reset-confirm=Reset all plugin settings to default values? This cannot be undone.
pluginData-reset-clearTranslations-check=Also clear all Title Translation and Abstract Translation fields
pluginData-reset-success=Plugin data has been reset to defaults.

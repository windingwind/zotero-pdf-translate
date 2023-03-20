# ![PDFTranslate](addon/chrome/content/icons/favicon.png)Zotero PDF Translate

[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

This is an add-on for [Zotero](https://www.zotero.org/)'s built-in PDF reader.  
Translate PDFs, annotations, notes, and item titles automatically.

[中文文档](https://zotero.yuque.com/books/share/4443494c-c698-4e08-9d1e-ed253390346d)

![](imgs/translate.gif)

# Quick Start Guide

## Install

### From local file

- Download the latest release (.xpi file) from the [Latest Release Page](https://github.com/windingwind/zotero-pdf-translate/releases/latest)  
  _Note_ If you're using Firefox as your browser, right-click the `.xpi` and select "Save As.."
- In Zotero click `Tools` in the top menu bar and then click `Addons`
- Go to the Extensions page and then click the gear icon in the top right.
- Select `Install Add-on from file`.
- Browse to where you downloaded the `.xpi` file and select it.
- Restart Zotero, by clicking `restart now` in the extensions list where the
  Zotero PDF Translate plugin is now listed.

### From remote link

- In Zotero click `Tools` in the top menu bar and then click `Addons`.
- Drag [Latest Release](https://github.com/windingwind/zotero-pdf-translate/releases/latest/download/zotero-pdf-translate.xpi) and drop it in the Zotero UI.
- Click `install now`.
- Restart Zotero, by clicking `restart now` in the extensions list where the
  Zotero PDF Translate plugin is now listed.

## Usage

Once you have the plugin installed simply, open any PDF in your collections.

- Select some text, the translations are shown on the popup and the right sidebar(v0.2.0); Hold `Alt/Option` to concat selections.
  ![](imgs/en2zh.png)

- Highlight some text, the translations are added to the annotation comment(v0.3.0); Modify & retranslate the annotation text in the sidebar and click the `Update Annotation` to modify the annotation text and translation(v0.6.6);
- Add selected text along with translation to note(v0.4.0); _Only works when a note editor is active._
  ![](imgs/addnote.png)
- Translate item titles with right-click menu or shortcut `Ctrl+T`(v0.6.0).
- Translate item abstract with right-click menu(v0.8.0). Thanks @iShareStuff
- Standalone translation window available(v0.7.0). View & compare translations from multiply engines in one window!
  ![](imgs/standalone.png)
- Dictionary for single word translation(v0.7.1).
- SentenceBySentence Translation(v1.1.0). After a translation, press `shift`+`P` and select `Translate Sentences`. _Only for en2zh and en2en now_. Thanks @MuiseDestiny

### Q&A

**Q** I want to translate manually.  
**A** Go to `Edit->Preferences->PDF Translate->General`, uncheck the `Automatic Translation`. Click the `translate` button on the popup or sidebar to translate.

**Q** I want a translate shortcut.  
**A**
Press shortcut `Ctrl+T` after you selected some text. If you are in the collection view, the titles' translation will show/hide.

**Q** I want to concat different seletions and translate them together.  
**A** Press `Alt/Option` when selecting text in PDF.

**Q** Not the language I want.  
**A** The default target language is the same as your Zotero language. Go to `Edit->Preferences->PDF Translate->General` and change the language settings.

**Q** Translation not correct or report an error.  
**A** See [Language Settings](#general-language-settings) and #6. Make sure you use the right secret.

**Q** I want to change the font size.  
**A** Go to `Edit->Preferences->PDF Translate->Advanced` and set the font size.

## Settings

### General

- Enable Translation, default `true`
- Automatic Translation, default `true`
- Enable Dictionary: single word will be translated using dictionary-engine instead of translate engine, default `true`
- Enable Popup: Show results in a right-click popup or only in the sidebar, default `true`
- Automatic Annotation Translation: Save annotation's translation as comment, default `true`
- Show 'Add to Note(With Translation)' in Popup: default `true`
  > Unvisible if no active note editor opened.
  - Replace Source Text: Use translation to replace the source text when adding to note, default `false`

### Service

The default engine is Google Translate. Currently, we support:  
| Translate Engine             | Require Secret         | Supported Languages                                                                                                                                                                                                                                                |
| ---------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Google Translate             | No                     | [100+](https://translate.google.com/about/languages/)                                                                                                                                                                                                              |
| Google Translate(API)        | No                     | Use `translate.googleapis.com`                                                                                                                                                                                                                                     |
| CNKI                         | No                     | https://dict.cnki.net                                                                                                                                                                                                                                              |
| Youdao Translate             | No                     | [100+?](https://ai.youdao.com/DOCSIRMA/html/%E8%87%AA%E7%84%B6%E8%AF%AD%E8%A8%80%E7%BF%BB%E8%AF%91/API%E6%96%87%E6%A1%A3/%E6%96%87%E6%9C%AC%E7%BF%BB%E8%AF%91%E6%9C%8D%E5%8A%A1/%E6%96%87%E6%9C%AC%E7%BF%BB%E8%AF%91%E6%9C%8D%E5%8A%A1-API%E6%96%87%E6%A1%A3.html) |
| Youdao Zhiyun                | Yes                    | [100+](https://ai.youdao.com/DOCSIRMA/html/%E8%87%AA%E7%84%B6%E8%AF%AD%E8%A8%80%E7%BF%BB%E8%AF%91/API%E6%96%87%E6%A1%A3/%E6%96%87%E6%9C%AC%E7%BF%BB%E8%AF%91%E6%9C%8D%E5%8A%A1/%E6%96%87%E6%9C%AC%E7%BF%BB%E8%AF%91%E6%9C%8D%E5%8A%A1-API%E6%96%87%E6%A1%A3.html)  |
| Niu Translate(Trial)         | No                     | [100+](https://niutrans.com/documents/contents/trans_text#accessMode) **UNSTABLE**                                                                                                                                                                                 |
| Niu Translate                | Yes                    | [100+](https://niutrans.com/documents/contents/trans_text#accessMode)                                                                                                                                                                                              |
| Microsoft Translate          | Yes(free 2M)           | [200+](https://docs.microsoft.com/en-us/azure/cognitive-services/translator/language-support)                                                                                                                                                                      |
| LingoCloud(Caiyun) Translate | Yes                    | [zh, en, ja, es, fr, ru](https://open.caiyunapp.com/LingoCloud_API_in_5_minutes)                                                                                                                                                                                   |
| DeepL Translate              | Yes(free 500k)         | [100+](https://www.deepl.com/pro?cta=header-prices/#developer)                                                                                                                                                                                                     |
| Baidu Translate              | Yes(free-QPS1/free-2M) | [200+](https://fanyi-api.baidu.com/product/11)                                                                                                                                                                                                                     |
| Baidu Field                  | Yes(free-QPS1/free-2M) | [en-zh](https://fanyi-api.baidu.com/product/12)                                                                                                                                                                                                                    |
| Tencent Translate            | Yes(QPS5, free-5M)     | [15](https://cloud.tencent.com/document/product/551/7372)                                                                                                                                                                                                          |
| GPT(OpenAI)                  | Yes(free-$18)          | [Based on the gpt-3.5-turbo model](https://openai.com/pricing#chat)                                                                                                                                                                                                |

> If the engine you want is not yet supported, please post an issue.

**Microsoft Translate**  
Apply [here](https://docs.microsoft.com/en-us/azure/cognitive-services/translator/quickstart-translator?tabs=csharp). Copy your secret and paste it into the settings.  
The secret format is `MY_SECRET`.

> See [this issue](https://github.com/windingwind/zotero-pdf-translate/issues/3#issuecomment-1064688597) for detailed steps to set up the Microsoft Translate.

**DeepL Translate**  
Apply [here](https://www.deepl.com/pro?cta=header-prices/#developer).

**Youdao Zhiyun Translate 有道智云**  
Apply [here](https://ai.youdao.com/login.s).  
The secret format is `MY_APPID#MY_SECRET#MY_VOCABID(optional)`.

> About `VOCABID`  
> 登录控制台，选择文本翻译服务，点击右侧的术语表，选择新建，填写表名称和语言方向，添加需要的术语表，然后获取对应词表 id 即可。

> [Official Document](https://ai.youdao.com/DOCSIRMA/html/%E8%87%AA%E7%84%B6%E8%AF%AD%E8%A8%80%E7%BF%BB%E8%AF%91/API%E6%96%87%E6%A1%A3/%E6%96%87%E6%9C%AC%E7%BF%BB%E8%AF%91%E6%9C%8D%E5%8A%A1/%E6%96%87%E6%9C%AC%E7%BF%BB%E8%AF%91%E6%9C%8D%E5%8A%A1-API%E6%96%87%E6%A1%A3.html)

**Niu Translate**  
Apply [here](https://niutrans.com/NiuTransAuthCenter/login).  
The secret format is `MY_APIKEY#dictNo(optional)#memoryNo(optional)`.

> [Chinese Document](https://doc.tern.1c7.me/zh/folder/setting/#%E5%B0%8F%E7%89%9B)

**Baidu Translate**  
Apply [here](https://fanyi-api.baidu.com/product/11).  
The secret format is `MY_APPID#MY_KEY#ACTION(optional, see https://api.fanyi.baidu.com/doc/21, default 0)`(split with '#').

**Baidu Field Translate 百度垂直领域翻译**  
Apply [here](https://fanyi-api.baidu.com/product/12).  
The secret format is `MY_APPID#MY_KEY#DOMAIN_CODE`(split with '#').

| Domain Code | 领域         | 语言方向    |
| ----------- | ------------ | ----------- |
| electronics | 电子科技领域 | 中文-->英语 |
| finance     | 金融财经领域 | 中文-->英语 |
| finance     | 金融财经领域 | 英语-->中文 |
| mechanics   | 水利机械领域 | 中文-->英语 |
| medicine    | 生物医药领域 | 中文-->英语 |
| medicine    | 生物医药领域 | 英语-->中文 |
| novel       | 网络文学领域 | 中文-->英语 |

> [Chinese Document](https://doc.tern.1c7.me/zh/folder/setting/#%E8%85%BE%E8%AE%AF%E4%BA%91)

**Tencent Translate**  
Apply [here](https://cloud.tencent.com/product/tmt).  
The secret format is `secretId#SecretKey#Region(optional, default ap-shanghai)#ProjectId(optional, default 0)`(split with '#').

> [Chinese Document](https://doc.tern.1c7.me/zh/folder/setting/#%E8%85%BE%E8%AE%AF%E4%BA%91)

**OpenL Translate**  
Apply [here](https://my.openl.club/).  
The secret format is `service1,service2,...#apikey`(split with '#'; split service codes with ',').

Supported service codes are: `deepl,youdao,tencent,aliyun,baidu,caiyun,wechat,sogou,azure,ibm,aws,google`, See [Service Code](https://docs.openl.club/#/API/format?id=%e7%bf%bb%e8%af%91%e6%9c%8d%e5%8a%a1%e4%bb%a3%e7%a0%81%e5%90%8d)

> [Chinese Document](https://docs.openl.club/#/)

**GPT**  
Apply [here](https://platform.openai.com/signup).  
The secret format is `sk-#SecretKey`(split with '#').

> [Chinese Document](https://gist.github.com/GrayXu/f1b72353b4b0493d51d47f0f7498b67b)

### User Interface

- `Font Size`: The font size of result text, default `12`
- `Line Height`: The line height of result text, default `1.5`
- `SideBar: Show xxx`: Show or hide sidebar elements, default `true`
- `SideBar: Reverse Raw/Result`: Reverse the order of Raw/Result in the sidebar if `true`, default `false`
- `Popup: Remember Size`: Remember size of popup if `true`, else automatically adjust the size, default `false`

### Advanced

- Disable Automatic Translation when File Language is(split with ','): If you want to disable automatic translation in `zh` and `ja` files, set `zh,ja`.

## Development & Contributing

This addon is built based on the [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template). See the setup and debug details there.

To startup, run

```bash
git clone https://github.com/windingwind/zotero-pdf-translate.git
cd zotero-pdf-translate
npm install
npm run build
```

The plugin is built to `./builds/*.xpi`.

### Contributing

**Add new translate service**

1. Add service config to `src/utils/config.ts` > `SERVICES`;
2. Add translation task processor under `src/modules/services/${serviceId}.ts` with the same format with other services. The export function set the translation result to `data.result` if runs successfully and throw an error if fails;
3. Import the task processor function in `src/modules/services.ts`.
4. Add locale string `service.${serviceId}` in `addon/chrome/locale/${lang}/addon.properties`.
5. Build and test.

**Extra options for translate service**

If the service requires extra options, the minimal implement would be putting them in the `secret` input in the prefs window, like the existing services does.

If there are complex options, please bind a callback in `src/utils/translate.ts > secretStatusButtonData` which create a highly customizable dialog window with `ztoolkit.Dialog`. See the example of NiuTrans login here: https://github.com/windingwind/zotero-pdf-translate/blob/main/src/utils/niuTransLogin.ts

## Disclaimer

Use this code under AGPL. No warranties are provided. Keep the laws of your locality in mind!

## My Other Zotero Addons

- [zotero-better-notes](https://github.com/windingwind/zotero-better-notes): Everything about note management. All in Zotero.
- [zotero-pdf-preview](https://github.com/windingwind/zotero-tag): PDF preview for Zotero
- [zotero-tag](https://github.com/windingwind/zotero-tag): Automatically tag items/Batch tagging

## Sponsor Me

I'm windingwind, an active Zotero(https://www.zotero.org) plugin developer. Devoting to making reading papers easier.

Sponsor me to buy a cup of coffee. I spend more than 24 hours every week coding, debugging, and replying to issues in my plugin repositories. The plugins are open-source and totally free.

If you sponsor more than $10 a month, you can list your name/logo here and have priority for feature requests/bug fixes!

## Sponsors

Thanks
[peachgirl100](https://github.com/peachgirl100)
and other anonymous sponsors!

If you want to leave your name here, please email me or leave a message with the donation.

# ![PDFTranslate](https://github.com/windingwind/zotero-pdf-translate/raw/main/chrome/skin/default/zoteropdftranslate/favicon.png)Zotero PDF Translate

This is an add-on for [Zotero 6](https://www.zotero.org/). It provides PDF translation for Zotero built-in PDF reader.

![](imgs/translate.gif)

# Quick Start Guide

## Install

### From Release

- Download the latest release (.xpi file) from the [Releases Page](https://github.com/windingwind/zotero-pdf-translate/releases)  
  _Note_ If you're using Firefox as your browser, right click the xpi and select "Save As.."
- In Zotero click "Tools" in the top menu bar and then click "Addons"
- Go to the Extensions page and then click the gear icon in the top right.
- Select Install Add-on from file.
- Browse to where you downloaded the .xpi file and select it.
- Restart Zotero, by clicking "restart now" in the extensions list where the
  Zotero PDF Translate plugin is now listed.

### From Source Code

_Note_ Not recommended if you don't want to edit the code.

```shell
git clone git@github.com:windingwind/zotero-pdf-translate.git
cd zotero-pdf-translate
VERSION=0.0.1 make
```

Alternatively, version numbers can be passed to make directly: `make VERSION=0.0.1`

## Usage

Once you have the plugin installed simply, open any PDF in your collections.

Select some text, the translation are shown.

If Automatically Translation is disabled, use shortcut `T` or click button to translate selected text.

Not the lauguage you want? The default tartget lauguage is `zh-CN`(Chinese Simplified). You can edit it in the Preference menu.

![](imgs/en2zh.png)

## Settings

### General

- Enable Translation, default `true`
- Automatically Translation, default `true`
- Enable Popup: Show results in a right-click popup or only in the side bar, default `true`
- Translate Annotation: Save annotation's translation as comment, default `true`
- Font Size: The font size of result text, default `12`
- Disable Automatic Translation when File Language is(split with ','): If you want to disable automatic translation in `zh` and `ja` files, set `zh,ja`.

### Translate Engine

The default engine is Google Translate. Currently we support:  
| Translate Engine | Require Secret | Supported Languages |
| ---- | ---- | ---- |
| Google Translate | No | [100+](https://translate.google.com/about/languages/) |
| Google Translate(API) | No | Use `translate.googleapis.com` |
| Youdao Translate | No | [100+?](https://ai.youdao.com/DOCSIRMA/html/%E8%87%AA%E7%84%B6%E8%AF%AD%E8%A8%80%E7%BF%BB%E8%AF%91/API%E6%96%87%E6%A1%A3/%E6%96%87%E6%9C%AC%E7%BF%BB%E8%AF%91%E6%9C%8D%E5%8A%A1/%E6%96%87%E6%9C%AC%E7%BF%BB%E8%AF%91%E6%9C%8D%E5%8A%A1-API%E6%96%87%E6%A1%A3.html) |
| Niu Translate(Trial) | No | [100+](https://niutrans.com/documents/contents/trans_text#accessMode) **UNSTABLE** |
| Niu Translate | Yes | [100+](https://niutrans.com/documents/contents/trans_text#accessMode) |
| Microsoft Translate | Yes(free 2M) | [200+](https://docs.microsoft.com/en-us/azure/cognitive-services/translator/language-support) |
| LingoCloud(Caiyun) Translate | Yes | [zh, en, ja, es, fr, ru](https://open.caiyunapp.com/LingoCloud_API_in_5_minutes) |
| DeepL Translate | Yes(free 500k) | [100+](https://www.deepl.com/pro?cta=header-prices/#developer) |
| Baidu Translate | Yes(free-QPS1/free-2M) | [200+](https://fanyi-api.baidu.com/product/113) |
| Tencent Translate | Yes(QPS5, free-5M) | [15](https://cloud.tencent.com/document/product/551/7372) |

**WARNING**  
Translation engines that do not require secret is only for trial use and cannot guarantee quality or availability.  
If you expect stable and high-quality translation results, please use a translation engine that requires secret.  
If the engine you want is not yet supported, please post an issue.

### Lauguage Settings

You can change the source and target language here. For some Translte Engines, the `secret` is required. They are listed below:

> **Microsoft Translate**  
> **WARNING The default secret may reach limit or be deleted any time. Please consider use your own secret.**  
> For how to get a free Microsoft secret and more infomation, see [this](https://docs.microsoft.com/en-us/azure/cognitive-services/translator/quickstart-translator?tabs=csharp). Copy your secret and paste it in the settings.  
> See [this issue](https://github.com/windingwind/zotero-pdf-translate/issues/3#issuecomment-1064688597) for detailed steps to setup the Microsoft Translate.

> **DeepL Translate**
> Follow the instruction [here](https://www.deepl.com/pro?cta=header-prices/#developer).

> **Niu Translate**  
> Apply [here](https://niutrans.com/NiuTransAuthCenter/login).  
> [Chinese Document](https://doc.tern.1c7.me/zh/folder/setting/#%E5%B0%8F%E7%89%9B)  
> The secret is `APIKEY`.

> **Baidu Translate**  
> Apply [here](https://fanyi-api.baidu.com/product/113).
> [Chinese Document](https://doc.tern.1c7.me/zh/folder/setting/#%E8%85%BE%E8%AE%AF%E4%BA%91)  
> The secret format is `MY_APPID#MY_KEY`(split with '#').

> **Tencent Translate**  
> Apply [here](https://cloud.tencent.com/product/tmt). 
> [Chinese Document](https://doc.tern.1c7.me/zh/folder/setting/#%E8%85%BE%E8%AE%AF%E4%BA%91)  
> The secret format is `secretId#SecretKey#Region(optional, default ap-shanghai)#ProjectId(optional, default 0)`(split with '#').

## Disclaimer

Use this code under AGPL. No warranties are provided. Keep the laws of your locality in mind!

Part of the code of this repo refers to other open-source projects within the allowed scope.

- zotero-scihub
- zotero-tag

## My Other Zotero Addons

- [zotero-tag](https://github.com/windingwind/zotero-tag): Automatically tag items/Batch tagging

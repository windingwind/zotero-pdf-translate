# ![PDFTranslate](addon/chrome/skin/default/zoteropdftranslate/favicon.png)Zotero PDF Translate

This is an add-on for [Zotero 6](https://www.zotero.org/). It provides PDF translation for Zotero's built-in PDF reader.

![](imgs/translate.gif)

# Quick Start Guide

## Install

- Download the latest release (.xpi file) from the [Releases Page](https://github.com/windingwind/zotero-pdf-translate/releases)  
  _Note_ If you're using Firefox as your browser, right-click the `.xpi` and select "Save As.."
- In Zotero click `Tools` in the top menu bar and then click `Addons`
- Go to the Extensions page and then click the gear icon in the top right.
- Select `Install Add-on from file`.
- Browse to where you downloaded the `.xpi` file and select it.
- Restart Zotero, by clicking `restart now` in the extensions list where the
  Zotero PDF Translate plugin is now listed.

## Usage

Once you have the plugin installed simply, open any PDF in your collections.

- Select some text, the translations are shown on the popup and the right sidebar(v0.2.0);
![](imgs/en2zh.png)

- Highlight some text, the translations are added to the annotation comment(v0.3.0);
- Add selected text along with translation to note(v0.4.0). *Only works when a note editor is active.*
![](imgs/addnote.png)

### Q&A

**Q** I want to translate manually.  
**A** Go to `Edit->Preferences->PDF Translate->General`, uncheck the `Automatic Translation`. Click the `translate` button on the popup or sidebar to translate.  

**Q** I want a translate shortcut.  
**A**
Press shortcut `T` after you selected some text.  

**Q** Not the language I want.  
**A** The default target language is the same as your Zotero language. Go to `Edit->Preferences->PDF Translate->General` and change the language settings.   

**Q** Translation not correct or report an error.  
**A** See [Language Settings](#general-language-settings) and #6. Make sure you use the right secret.  

**Q** I want to change the font size.  
**A** Go to `Edit->Preferences->PDF Translate->Advanced` and set the font size.  

## Settings

### General-Functions

- Enable Translation, default `true`
- Automatic Translation, default `true`
- Enable Popup: Show results in a right-click popup or only in the side bar, default `true`
- Automatic Annotation Translation: Save annotation's translation as comment, default `true`
- Show '![PDFTranslate](addon/chrome/skin/default/zoteropdftranslate/favicon%400.5x.png)Add to Note' in Popup: default `true`  
  > Unvisible if no active note editor opened.  

### General-Translate Engine

The default engine is Google Translate. Currently, we support:  
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

> If the engine you want is not yet supported, please post an issue.

### General-Language Settings

You can change the source and target language here. For some Translate Engines, the `secret` is required. They are listed below:

**Microsoft Translate**  
Apply [here](https://docs.microsoft.com/en-us/azure/cognitive-services/translator/quickstart-translator?tabs=csharp). Copy your secret and paste it into the settings.  
The secret format is `MY_SECRET`. 
> See [this issue](https://github.com/windingwind/zotero-pdf-translate/issues/3#issuecomment-1064688597) for detailed steps to set up the Microsoft Translate.

**DeepL Translate**  
Apply [here](https://www.deepl.com/pro?cta=header-prices/#developer).

**Niu Translate**  
Apply [here](https://niutrans.com/NiuTransAuthCenter/login).  
The secret format is `MY_APIKEY`.  
> [Chinese Document](https://doc.tern.1c7.me/zh/folder/setting/#%E5%B0%8F%E7%89%9B)   

**Baidu Translate**  
Apply [here](https://fanyi-api.baidu.com/product/113).  
The secret format is `MY_APPID#MY_KEY`(split with '#').  
> [Chinese Document](https://doc.tern.1c7.me/zh/folder/setting/#%E8%85%BE%E8%AE%AF%E4%BA%91)   

**Tencent Translate**  
Apply [here](https://cloud.tencent.com/product/tmt).  
The secret format is `secretId#SecretKey#Region(optional, default ap-shanghai)#ProjectId(optional, default 0)`(split with '#').  
> [Chinese Document](https://doc.tern.1c7.me/zh/folder/setting/#%E8%85%BE%E8%AE%AF%E4%BA%91)  

### Advanced-UI

- `Font Size`: The font size of result text, default `12`
- `SideBar: Show xxx`: Show or hide sidebar elements, default `true` 
- `SideBar: Reverse Raw/Result`: Reverse the order of Raw/Result in the sidebar if `true`, default `false`

### Advanced-Others
- Disable Automatic Translation when File Language is(split with ','): If you want to disable automatic translation in `zh` and `ja` files, set `zh,ja`.

## Development

This section is for developers. This repo can be used as a Zotero 6.x addon template.

### Directory Structure

```shell
│  .gitignore
│  .release-it.json # release-it conf
│  build.js         # esbuild
│  LICENSE
│  package.json     # npm conf
│  README.md        # readme
│  update.rdf       # addon update
│  
├─.github           # github conf
│          
├─addon             # addon dir
│  │  chrome.manifest  #addon conf 
│  │  install.rdf   # addon install conf
│  │  
│  └─chrome
│      ├─content    # UI
│      │  │  overlay.xul
│      │  │  preferences.xul
│      │  │  
│      │  └─scripts
│      ├─locale     # locale
│      │  ├─en-US
│      │  │      overlay.dtd
│      │  │      
│      │  └─zh-CN
│      │          overlay.dtd
│      │          
│      └─skin       # style
│          └─default
│              └─zoteropdftranslate
│                      favicon.png
│                      favicon@0.5x.png
│  
├─builds            # build dir
│  └─zotero-pdf-translate.xpi
│  
├─imgs              # readme images
│  
└─src               # source code    
    │  index.js     # main entry
    │  PDFTranslate.js  # main class
    │  preferences.js   # pref functions, no esbuild
    │  reader.js    # Zotero.Reader functions
    │  translate.js # translate functions
    │  view.js      # UI functions
    │  
    └─translate     # translate engines
            baidu.js
            caiyun.js
            config.js
            deepl.js
            google.js
            microsoft.js
            niutrans.js
            tencent.js
            youdao.js
```

### Build

```shell
git clone git@github.com:windingwind/zotero-pdf-translate.git
cd zotero-pdf-translate
npm i
# A release-it command: version increase, npm run build, git push, and GitHub release
# You need to set the environment variable GITHUB_TOKEN https://github.com/settings/tokens
# release-it: https://github.com/release-it/release-it
npm run release
```

Alternatively, build it directly using build.js: `npm run build`  

### Build Steps

1. Clean `./builds`  
2. Copy `./addon` to `./builds`  
3. Esbuild to `./builds/addon/chrome/content/scripts`  
4. Replace `__buildVersion__` and `__buildTime__` in `./builds/addon`  
5. Copy `./src/preferences.js` to `./builds/addon/chrome/content/scripts`  
6. Zip the `./builds/addon` to `./builds/*.xpi`  

## Disclaimer

Use this code under AGPL. No warranties are provided. Keep the laws of your locality in mind!

Part of the code of this repo refers to other open-source projects within the allowed scope.

- zotero-scihub
- zotero-tag

## My Other Zotero Addons

- [zotero-tag](https://github.com/windingwind/zotero-tag): Automatically tag items/Batch tagging

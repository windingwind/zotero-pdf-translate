import PDFTranslate from "./addon";
import AddonBase from "./module";

class TransLocale extends AddonBase {
  constructor(parent: PDFTranslate) {
    super(parent);
  }
  zh = {
    view: {
      checkbox_concat_text_label: "拼接选取",
      checkbox_concat_text_tip: `选择文本时按住${
        Zotero.isMac ? "Option" : "Alt"
      }以拼接选中文本并一起翻译`,
      button_copy_source_label: "复制原文",
      button_copy_translated_label: "复制翻译结果",
      button_copy_both_label: "复制全部",
      button_update_annotation_label: "更新注释",
      button_translate_label: Zotero.isMac ? "翻译(⌘ T)" : "翻译(Ctrl+T)",
      button_open_window_label: "打开单独窗口",
      menu_translate_engine_label: "翻译引擎",
      sidebar_tab_translate_label: "翻译",
      concatPWText: "选取文本",
      concatClear: "清空选取",
      concatClearPWText: "选取文本已清空",
      button_keep_on_top: "保持窗口最前",
      button_add_extra_engine: "增加额外引擎",
      button_remove_extra_engine: "移除额外引擎",
      checkbox_auto_translate_text_label: "自动翻译",
      checkbox_auto_translate_annotation_label: "自动翻译批注",
    },

    translate_api: {
      error_request:
        "[请求错误]\n\n此翻译引擎不可用，可能是密钥错误，也可能是请求过快。\n可以尝试其他翻译引擎，或者来此查看相关回答：\nhttps://zotero.yuque.com/books/share/4443494c-c698-4e08-9d1e-ed253390346d/age09f \n\n请注意，这些错误与 Zotero 和本翻译插件无关！错误详情如下: ",
      error_parse:
        "[解析错误]\n\n请在此报告相关错误:\nhttps://github.com/windingwind/zotero-pdf-translate/issues",
      error_other:
        "[未知错误]\n\n请在此报告相关错误:\nhttps://github.com/windingwind/zotero-pdf-translate/issues",
    },

    translate_engine: {
      google: "谷歌",
      googleapi: "谷歌API",
      googleweb: "谷歌(Web)",
      youdao: "有道",
      youdaozhiyun: "有道智云*",
      microsoft: "微软*",
      caiyun: "彩云*",
      niutrans: "小牛试用",
      niutranspro: "小牛*",
      niutransLog:"小牛(登录)",
      deeplfree: "DeepL(Free)*",
      deeplpro: "DeepL(Pro)*",
      baidu: "百度*",
      baidufield: "百度垂直领域*",
      tencent: "腾讯*",
      openl: "OpenL*",
      cnki: 'CNKI学术翻译',
      haici: '海词翻译',
      xftrans: '科大讯飞*',
      label: "字典引擎",
      youdaodict: "有道词典(en↔zh)",
      bingdict: "必应词典(en↔zh)",
      freedictionaryapi: "FreeDictionaryAPI(en↔en)",
      webliodict: "weblio(en↔ja)",
      collinsdict: "柯林斯词典(en↔zh)",
      haicidict: "海词词典(en↔zh)"
    },
    niutrans_tip: {
      tipTitle:'提示',
      tipUserName:'账号为空',
      tipPassword:'密码为空',
      errorTipTitle:'登录失败',
      errorMessage:'未知原因',
      successMessageTip:"登录成功！"
    }
  };

  en = {
    view: {
      checkbox_concat_text_label: "Concat Selection",
      checkbox_concat_text_tip: `Press ${
        Zotero.isMac ? "Option" : "Alt"
      } when selecting to concat and translate`,
      button_copy_source_label: "Copy Raw",
      button_copy_translated_label: "Copy Result",
      button_copy_both_label: "Copy Both",
      button_update_annotation_label: "Update Annotation",
      button_translate_label: Zotero.isMac
        ? "Translate(⌘ T)"
        : "Translate(Ctrl+T)",
      button_open_window_label: "Open in Standalone Window",
      menu_translate_engine_label: "Engine",
      sidebar_tab_translate_label: "Translate",
      concatPWText: "Selection",
      concatClear: "Clear Selection",
      concatClearPWText: "Selection cleared",
      button_keep_on_top: "Keep Window on Top",
      button_add_extra_engine: "Add Extra Engine",
      button_remove_extra_engine: "Remove Extra Engine",
      checkbox_auto_translate_text_label: "Automatic Translation",
      checkbox_auto_translate_annotation_label:
        "Automatic Annotation Translation",
    },

    translate_api: {
      error_request:
        "[Request Error]\n\nEngine not available, invalid secret, or request too fast.\nUse another translation engine or post the issue here: \n https://github.com/windingwind/zotero-pdf-translate/issues \n\nThe message below is not Zotero or the PDF Translate addon,  but from ",
      error_parse:
        "[Parse Error]\n\nReport issue here: \n https://github.com/windingwind/zotero-pdf-translate/issues",
      error_other:
        "[Unknown Error]\n\nReport issue here: \n https://github.com/windingwind/zotero-pdf-translate/issues",
    },

    translate_engine: {
      google: "Google",
      googleapi: "Google(API)",
      googleweb: "Google(Web)",
      youdao: "Youdao",
      youdaozhiyun: "Youdao Zhiyun*",
      microsoft: "Microsoft*",
      caiyun: "LingoCloud(Caiyun)*",
      niutrans: "Niu(Trial)",
      niutranspro: "Niu*",
      niutransLog:"Niu(Login)",
      deeplfree: "DeepL(Free)*",
      deeplpro: "DeepL(Pro)*",
      baidu: "Baidu*",
      baidufield: "BaiduField*",
      tencent: "Tencent*",
      openl: "OpenL*",
      cnki: 'CNKI',
      haici: 'Haici',
      xftrans: 'Xftrans*',
      label: "Dictionary Engine",
      youdaodict: "Youdao Dict(en↔zh)",
      bingdict: "Bing Dict(en↔zh)",
      freedictionaryapi: "FreeDictionaryAPI(en↔en)",
      webliodict: "weblio(en↔ja)",
      collinsdict: "Collins Dict(en↔zh)",
      haicidict: "Haici Dict(en↔zh)"
    },
    niutrans_tip: {
      tipTitle:'Tip',
      tipUserName:'username is null',
      tipPassword:'password is null',
      errorTipTitle:'Login failed',
      errorMessage:'unknown',
      successMessageTip:'success'
    }
  };

  // You can add support for other languages here, similar to the above
  // Remember to add the corresponding if function in the function below

  public getString(section: string, key: string): string {
    // If the local setting is Chinese, the interface language is Chinese
    // Other language translations are similar to the following. Add an IF statement
    // notice! mac is different linux or win

    const lang = Services.locale.getRequestedLocale();

    if (lang === "zh-CN" || lang === "zh-Hans-CN") {
      return this.zh[section][key];
    }
    return this.en[section][key];
  }
}

export default TransLocale;
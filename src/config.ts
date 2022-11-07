import PDFTranslate from "./addon";
import AddonBase from "./module";

class TransConfig extends AddonBase {
  sources: string[];
  sourcesName: any;
  defaultSourceLanguage: string;
  defaultTargetLanguage: string;
  defaultSecret: any;
  secretFormatCheckers: any;
  LangCultureNames: { LangCultureName: string; DisplayName: string }[];
  constructor(parent: PDFTranslate) {
    super(parent);
    this.sources = [
      "googleapi",
      // "googleweb",
      "google",
      "cnki",
      "youdao",
      "youdaozhiyun",
      "niutrans",
      "niutranspro",
      "niutransLog",
      "microsoft",
      "caiyun",
      "deeplfree",
      "deeplpro",
      "baidu",
      "baidufield",
      "openl",
      "tencent",
      "youdaodict",
      "bingdict",
      "freedictionaryapi",
      "webliodict",
      "collinsdict"
    ];
    // this parameter now in src/languages.ts, multiple languages can be supported
    // this.sourcesName = {
    // };
    this.defaultSourceLanguage = "en-US";
    this.defaultTargetLanguage = "zh-CN";
    this.defaultSecret = {
      googleapi: "",
      // googleweb: "",
      google: "",
      youdao: "",
      youdaozhiyun: "appid#appsecret#vocabid(optional)",
      microsoft: "",
      caiyun: "3975l6lr5pcbvidl6jl2",
      niutrans: "",
      niutranspro: "",
      deeplfree: "",
      deeplpro: "",
      baidu: "appid#key",
      baidufield: "appid#key#field",
      openl: "service1,service2,...#apikey",
      tencent:
        "secretId#SecretKey#Region(default ap-shanghai)#ProjectId(default 0)",
      cnki: "",
      youdaodict: "",
      bingdict: "",
      freedictionaryapi: "",
      webliodict: "",
      collinsdict: ""
    };
    this.secretFormatCheckers = {
      youdaozhiyun: (secret: string) => {
        const parts = secret?.split("#");
        const flag = [2, 3].includes(parts.length);
        const partsInfo = `AppID: ${parts[0]}\nAppKey: ${parts[1]}\nVocabID: ${
          parts[2] ? parts[2] : ""
        }`;
        return {
          status: flag && secret !== this.defaultSecret.youdaozhiyun,
          info:
            secret === this.defaultSecret.youdaozhiyun
              ? "The secret is not set."
              : flag
              ? partsInfo
              : `The secret format of YoudaoZhiyun is AppID#AppKey#VocabID(optional). The secret must have 2 or 3 parts joined by '#', but got ${parts?.length}.\n${partsInfo}`,
        };
      },
      microsoft: (secret: string) => {
        const flag = secret?.length === 32;
        return {
          status: flag,
          info: flag
            ? ""
            : `The secret is your Azure translate service KEY. The secret length must be 32, but got ${secret?.length}.`,
        };
      },
      caiyun: (secret: string) => {
        const flag = secret?.length === 20;
        return {
          status: flag,
          info: flag
            ? ""
            : `The secret is your Caiyun service Token. The secret length must be 20, but got ${secret?.length}.`,
        };
      },
      niutranspro: (secret: string) => {
        const flag = secret?.length === 32;
        return {
          status: flag,
          info: flag
            ? ""
            : `The secret is your NiuTrans API-KEY. The secret length must be 32, but got ${secret?.length}.`,
        };
      },
      deeplfree: (secret: string) => {
        const flag = secret?.length === 39;
        return {
          status: flag,
          info: flag
            ? ""
            : `The secret is your DeepL (free plan) KEY. The secret length must be 39, but got ${secret?.length}.`,
        };
      },
      deeplpro: (secret: string) => {
        const flag = secret?.length >= 36;
        return {
          status: flag,
          info: flag
            ? ""
            : `The secret is your DeepL (pro plan) KEY. The secret length must >= 36, but got ${secret?.length}.`,
        };
      },
      baidu: (secret: string) => {
        const parts = secret?.split("#");
        const flag = [2, 3].includes(parts.length);
        const partsInfo = `AppID: ${parts[0]}\nKey: ${parts[1]}\nAction: ${
          parts[2] ? parts[2] : "0"
        }
        `;
        return {
          status: flag && secret !== this.defaultSecret.baidu,
          info:
            secret === this.defaultSecret.baidu
              ? "The secret is not set."
              : flag
              ? partsInfo
              : `The secret format of Baidu Text Translation is AppID#Key#Action(optional). The secret must have 2 or 3 parts joined by '#', but got ${parts?.length}.\n${partsInfo}`,
        };
      },
      baidufield: (secret: string) => {
        const parts = secret?.split("#");
        const flag = parts.length === 3;
        const partsInfo = `AppID: ${parts[0]}\nKey: ${parts[1]}\nDomainCode: ${parts[2]}`;
        return {
          status: flag && secret !== this.defaultSecret.baidufield,
          info:
            secret === this.defaultSecret.baidufield
              ? "The secret is not set."
              : flag
              ? partsInfo
              : `The secret format of Baidu Domain Text Translation is AppID#Key#DomainCode. The secret must have 3 parts joined by '#', but got ${parts?.length}.\n${partsInfo}`,
        };
      },
      openl: (secret: string) => {
        const parts = secret?.split("#");
        const flag = parts.length === 2;
        const partsInfo = `Services: ${parts[0]}\nAPIKey: ${parts[1]}`;
        return {
          status: flag && secret !== this.defaultSecret.openl,
          info:
            secret === this.defaultSecret.openl
              ? "The secret is not set."
              : flag
              ? partsInfo
              : `The secret format of OpenL is service1,service2,...#APIKey. The secret must have 2 parts joined by '#', but got ${parts?.length}.\n${partsInfo}`,
        };
      },
      tencent: (secret: string) => {
        const parts = secret?.split("#");
        const flag = [2, 3, 4].includes(parts.length);
        const partsInfo = `SecretId: ${parts[0]}\nSecretKey: ${
          parts[1]
        }\nRegion: ${parts[2] ? parts[2] : "ap-shanghai"}\nProjectId: ${
          parts[3] ? parts[3] : "0"
        }
        `;
        return {
          status: flag && secret !== this.defaultSecret.tencent,
          info:
            secret === this.defaultSecret.tencent
              ? "The secret is not set."
              : flag
              ? partsInfo
              : `The secret format of Tencent Translation is SecretId#SecretKey#Region(optional)#ProjectId(optional). The secret must have 2, 3 or 4 parts joined by '#', but got ${parts?.length}.\n${partsInfo}`,
        };
      },
      _default: (secret: string) => ({
        status: true,
        info: "",
      }),
    };
    this.LangCultureNames = [
      { LangCultureName: "af-ZA", DisplayName: "Afrikaans - South Africa" },
      { LangCultureName: "sq-AL", DisplayName: "Albanian - Albania" },
      { LangCultureName: "ar-DZ", DisplayName: "Arabic - Algeria" },
      { LangCultureName: "ar-BH", DisplayName: "Arabic - Bahrain" },
      { LangCultureName: "ar-EG", DisplayName: "Arabic - Egypt" },
      { LangCultureName: "ar-IQ", DisplayName: "Arabic - Iraq" },
      { LangCultureName: "ar-JO", DisplayName: "Arabic - Jordan" },
      { LangCultureName: "ar-KW", DisplayName: "Arabic - Kuwait" },
      { LangCultureName: "ar-LB", DisplayName: "Arabic - Lebanon" },
      { LangCultureName: "ar-LY", DisplayName: "Arabic - Libya" },
      { LangCultureName: "ar-MA", DisplayName: "Arabic - Morocco" },
      { LangCultureName: "ar-OM", DisplayName: "Arabic - Oman" },
      { LangCultureName: "ar-QA", DisplayName: "Arabic - Qatar" },
      { LangCultureName: "ar-SA", DisplayName: "Arabic - Saudi Arabia" },
      { LangCultureName: "ar-SY", DisplayName: "Arabic - Syria" },
      { LangCultureName: "ar-TN", DisplayName: "Arabic - Tunisia" },
      {
        LangCultureName: "ar-AE",
        DisplayName: "Arabic - United Arab Emirates",
      },
      { LangCultureName: "ar-YE", DisplayName: "Arabic - Yemen" },
      { LangCultureName: "hy-AM", DisplayName: "Armenian - Armenia" },
      {
        LangCultureName: "Cy-az-AZ",
        DisplayName: "Azeri (Cyrillic) - Azerbaijan",
      },
      {
        LangCultureName: "Lt-az-AZ",
        DisplayName: "Azeri (Latin) - Azerbaijan",
      },
      { LangCultureName: "eu-ES", DisplayName: "Basque - Basque" },
      { LangCultureName: "be-BY", DisplayName: "Belarusian - Belarus" },
      { LangCultureName: "bg-BG", DisplayName: "Bulgarian - Bulgaria" },
      { LangCultureName: "ca-ES", DisplayName: "Catalan - Catalan" },
      { LangCultureName: "zh-CN", DisplayName: "中文 - 简体" },
      { LangCultureName: "zh-HK", DisplayName: "Chinese - Hong Kong SAR" },
      { LangCultureName: "zh-MO", DisplayName: "Chinese - Macau SAR" },
      { LangCultureName: "zh-SG", DisplayName: "Chinese - Singapore" },
      { LangCultureName: "zh-TW", DisplayName: "Chinese - Taiwan" },
      // { LangCultureName: "zh-CHS", DisplayName: "Chinese (Simplified)" },
      { LangCultureName: "zh-CHT", DisplayName: "Chinese (Traditional)" },
      { LangCultureName: "hr-HR", DisplayName: "Croatian - Croatia" },
      { LangCultureName: "cs-CZ", DisplayName: "Czech - Czech Republic" },
      { LangCultureName: "da-DK", DisplayName: "Danish - Denmark" },
      { LangCultureName: "div-MV", DisplayName: "Dhivehi - Maldives" },
      { LangCultureName: "nl-BE", DisplayName: "Dutch - Belgium" },
      { LangCultureName: "nl-NL", DisplayName: "Dutch - The Netherlands" },
      { LangCultureName: "en-AU", DisplayName: "English - Australia" },
      { LangCultureName: "en-BZ", DisplayName: "English - Belize" },
      { LangCultureName: "en-CA", DisplayName: "English - Canada" },
      { LangCultureName: "en-CB", DisplayName: "English - Caribbean" },
      { LangCultureName: "en-IE", DisplayName: "English - Ireland" },
      { LangCultureName: "en-JM", DisplayName: "English - Jamaica" },
      { LangCultureName: "en-NZ", DisplayName: "English - New Zealand" },
      { LangCultureName: "en-PH", DisplayName: "English - Philippines" },
      { LangCultureName: "en-ZA", DisplayName: "English - South Africa" },
      {
        LangCultureName: "en-TT",
        DisplayName: "English - Trinidad and Tobago",
      },
      { LangCultureName: "en-GB", DisplayName: "English - United Kingdom" },
      { LangCultureName: "en-US", DisplayName: "English - United States" },
      { LangCultureName: "en-ZW", DisplayName: "English - Zimbabwe" },
      { LangCultureName: "et-EE", DisplayName: "Estonian - Estonia" },
      { LangCultureName: "fo-FO", DisplayName: "Faroese - Faroe Islands" },
      { LangCultureName: "fa-IR", DisplayName: "Farsi - Iran" },
      { LangCultureName: "fi-FI", DisplayName: "Finnish - Finland" },
      { LangCultureName: "fr-BE", DisplayName: "French - Belgium" },
      { LangCultureName: "fr-CA", DisplayName: "French - Canada" },
      { LangCultureName: "fr-FR", DisplayName: "French - France" },
      { LangCultureName: "fr-LU", DisplayName: "French - Luxembourg" },
      { LangCultureName: "fr-MC", DisplayName: "French - Monaco" },
      { LangCultureName: "fr-CH", DisplayName: "French - Switzerland" },
      { LangCultureName: "gl-ES", DisplayName: "Galician - Galician" },
      { LangCultureName: "ka-GE", DisplayName: "Georgian - Georgia" },
      { LangCultureName: "de-AT", DisplayName: "German - Austria" },
      { LangCultureName: "de-DE", DisplayName: "German - Germany" },
      { LangCultureName: "de-LI", DisplayName: "German - Liechtenstein" },
      { LangCultureName: "de-LU", DisplayName: "German - Luxembourg" },
      { LangCultureName: "de-CH", DisplayName: "German - Switzerland" },
      { LangCultureName: "el-GR", DisplayName: "Greek - Greece" },
      { LangCultureName: "gu-IN", DisplayName: "Gujarati - India" },
      { LangCultureName: "he-IL", DisplayName: "Hebrew - Israel" },
      { LangCultureName: "hi-IN", DisplayName: "Hindi - India" },
      { LangCultureName: "hu-HU", DisplayName: "Hungarian - Hungary" },
      { LangCultureName: "is-IS", DisplayName: "Icelandic - Iceland" },
      { LangCultureName: "id-ID", DisplayName: "Indonesian - Indonesia" },
      { LangCultureName: "it-IT", DisplayName: "Italian - Italy" },
      { LangCultureName: "it-CH", DisplayName: "Italian - Switzerland" },
      { LangCultureName: "ja-JP", DisplayName: "Japanese - Japan" },
      { LangCultureName: "kn-IN", DisplayName: "Kannada - India" },
      { LangCultureName: "kk-KZ", DisplayName: "Kazakh - Kazakhstan" },
      { LangCultureName: "kok-IN", DisplayName: "Konkani - India" },
      { LangCultureName: "ko-KR", DisplayName: "Korean - Korea" },
      { LangCultureName: "ky-KZ", DisplayName: "Kyrgyz - Kazakhstan" },
      { LangCultureName: "lv-LV", DisplayName: "Latvian - Latvia" },
      { LangCultureName: "lt-LT", DisplayName: "Lithuanian - Lithuania" },
      { LangCultureName: "mk-MK", DisplayName: "Macedonian (FYROM)" },
      { LangCultureName: "ms-BN", DisplayName: "Malay - Brunei" },
      { LangCultureName: "ms-MY", DisplayName: "Malay - Malaysia" },
      { LangCultureName: "mr-IN", DisplayName: "Marathi - India" },
      { LangCultureName: "mn-MN", DisplayName: "Mongolian - Mongolia" },
      { LangCultureName: "nb-NO", DisplayName: "Norwegian (Bokmål) - Norway" },
      { LangCultureName: "nn-NO", DisplayName: "Norwegian (Nynorsk) - Norway" },
      { LangCultureName: "pl-PL", DisplayName: "Polish - Poland" },
      { LangCultureName: "pt-BR", DisplayName: "Portuguese - Brazil" },
      { LangCultureName: "pt-PT", DisplayName: "Portuguese - Portugal" },
      { LangCultureName: "pa-IN", DisplayName: "Punjabi - India" },
      { LangCultureName: "ro-RO", DisplayName: "Romanian - Romania" },
      { LangCultureName: "ru-RU", DisplayName: "Russian - Russia" },
      { LangCultureName: "sa-IN", DisplayName: "Sanskrit - India" },
      {
        LangCultureName: "Cy-sr-SP",
        DisplayName: "Serbian (Cyrillic) - Serbia",
      },
      { LangCultureName: "Lt-sr-SP", DisplayName: "Serbian (Latin) - Serbia" },
      { LangCultureName: "sk-SK", DisplayName: "Slovak - Slovakia" },
      { LangCultureName: "sl-SI", DisplayName: "Slovenian - Slovenia" },
      { LangCultureName: "es-AR", DisplayName: "Spanish - Argentina" },
      { LangCultureName: "es-BO", DisplayName: "Spanish - Bolivia" },
      { LangCultureName: "es-CL", DisplayName: "Spanish - Chile" },
      { LangCultureName: "es-CO", DisplayName: "Spanish - Colombia" },
      { LangCultureName: "es-CR", DisplayName: "Spanish - Costa Rica" },
      { LangCultureName: "es-DO", DisplayName: "Spanish - Dominican Republic" },
      { LangCultureName: "es-EC", DisplayName: "Spanish - Ecuador" },
      { LangCultureName: "es-SV", DisplayName: "Spanish - El Salvador" },
      { LangCultureName: "es-GT", DisplayName: "Spanish - Guatemala" },
      { LangCultureName: "es-HN", DisplayName: "Spanish - Honduras" },
      { LangCultureName: "es-MX", DisplayName: "Spanish - Mexico" },
      { LangCultureName: "es-NI", DisplayName: "Spanish - Nicaragua" },
      { LangCultureName: "es-PA", DisplayName: "Spanish - Panama" },
      { LangCultureName: "es-PY", DisplayName: "Spanish - Paraguay" },
      { LangCultureName: "es-PE", DisplayName: "Spanish - Peru" },
      { LangCultureName: "es-PR", DisplayName: "Spanish - Puerto Rico" },
      { LangCultureName: "es-ES", DisplayName: "Spanish - Spain" },
      { LangCultureName: "es-UY", DisplayName: "Spanish - Uruguay" },
      { LangCultureName: "es-VE", DisplayName: "Spanish - Venezuela" },
      { LangCultureName: "sw-KE", DisplayName: "Swahili - Kenya" },
      { LangCultureName: "sv-FI", DisplayName: "Swedish - Finland" },
      { LangCultureName: "sv-SE", DisplayName: "Swedish - Sweden" },
      { LangCultureName: "syr-SY", DisplayName: "Syriac - Syria" },
      { LangCultureName: "ta-IN", DisplayName: "Tamil - India" },
      { LangCultureName: "tt-RU", DisplayName: "Tatar - Russia" },
      { LangCultureName: "te-IN", DisplayName: "Telugu - India" },
      { LangCultureName: "th-TH", DisplayName: "Thai - Thailand" },
      { LangCultureName: "tr-TR", DisplayName: "Turkish - Turkey" },
      { LangCultureName: "uk-UA", DisplayName: "Ukrainian - Ukraine" },
      { LangCultureName: "ur-PK", DisplayName: "Urdu - Pakistan" },
      {
        LangCultureName: "Cy-uz-UZ",
        DisplayName: "Uzbek (Cyrillic) - Uzbekistan",
      },
      {
        LangCultureName: "Lt-uz-UZ",
        DisplayName: "Uzbek (Latin) - Uzbekistan",
      },
      { LangCultureName: "vi-VN", DisplayName: "Vietnamese - Vietnam" },
    ];
  }

  public checkSecret(_window: Window, engine: string, secret: string) {
    const cheker =
      this._Addon.translate.secretFormatCheckers[engine] ||
      this._Addon.translate.secretFormatCheckers["_default"];
    const checkResult: { status: boolean; info: string } = cheker(secret);
    console.log(checkResult);
    if (!checkResult.status) {
      _window.alert(
        `You see this because this engine ${this._Addon.locale.getString(
          "translate_engine",
          engine
        )} requires SECRET, which is NOT correctly set.\n\nDetails:\n${
          checkResult.info
        }`
      );
    }
  }
}

export { TransConfig };
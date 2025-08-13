import { base64, hmacSha1Digest } from "../../utils/crypto";
import { TranslateService } from "./base";
import { getPref, setPref } from "../../utils/prefs";
import { setServiceSecret } from "../../utils/secret";

const translate: TranslateService["translate"] = async (data) => {
  let secretId = (getPref("tencent.secretId") as string) || "";
  let secretKey = (getPref("tencent.secretKey") as string) || "";
  let region = getPref("tencent.region") as string;
  let projectId = getPref("tencent.projectId") as string;
  const termRepoIDList = getPref("tencent.termRepoIDList") as string;
  const sentRepoIDList = getPref("tencent.sentRepoIDList") as string;

  // Migrate the modified secret to Prefs
  if (data.secret !== Tencent.defaultSecret) {
    const params = data.secret.split("#");
    const parsedSecretId = params[0];
    secretId = MigrateSecret(parsedSecretId, secretId, "secretId");
    const parsedSecretKey = params[1];
    secretKey = MigrateSecret(parsedSecretKey, secretKey, "secretKey");
    if (params.length >= 3 && params[2]) {
      const parsedRegion = params[2];
      region = MigrateSecret(parsedRegion, region, "region");
    }
    if (params.length >= 4 && params[3]) {
      const parsedProjectId = params[3];
      projectId = MigrateSecret(parsedProjectId, projectId, "projectId");
    }
  }

  function MigrateSecret(parsedStr: string, str: string, prefKey: string) {
    if (parsedStr && parsedStr !== str) {
      setPref(`tencent.${prefKey}`, parsedStr);
      return parsedStr;
    }
    return str;
  }

  const parseCommaList = (input: string): string[] =>
    input
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

  const termRepoList = parseCommaList(termRepoIDList);
  const sentRepoList = parseCommaList(sentRepoIDList);

  function encodeRFC5987ValueChars(str: string) {
    return encodeURIComponent(str)
      .replace(
        /['()*]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
      ) // i.e., %27 %28 %29 %2A
      .replace(/%20/g, "+");
  }

  // Build parameters object for proper sorting
  const paramsObj: { [key: string]: string } = {
    Action: "TextTranslate",
    Language: "zh-CN",
    Nonce: "9744",
    ProjectId: projectId,
    Region: region,
    SecretId: secretId,
    Source: data.langfrom.split("-")[0],
    SourceText: "#$#",
    Target: data.langto.split("-")[0],
    Timestamp: new Date().getTime().toString().substring(0, 10),
    Version: "2018-03-21",
  };

  // Add repository lists with compact syntax
  termRepoList.forEach(
    (repoId, index) => (paramsObj[`TermRepoIDList.${index}`] = repoId),
  );
  sentRepoList.forEach(
    (repoId, index) => (paramsObj[`SentRepoIDList.${index}`] = repoId),
  );

  // Sort and build query string (required for Tencent Cloud signature)
  const rawStr = Object.keys(paramsObj)
    .sort()
    .map((key) => `${key}=${paramsObj[key]}`)
    .join("&");

  const sha1Str = encodeRFC5987ValueChars(
    base64(
      await hmacSha1Digest(
        `POSTtmt.tencentcloudapi.com/?${rawStr.replace("#$#", data.raw)}`,
        secretKey,
      ),
    ),
  );

  const xhr = await Zotero.HTTP.request(
    "POST",
    "https://tmt.tencentcloudapi.com",
    {
      headers: {
        "content-type": "application/json",
      },
      // Encode \s to +
      body: `${rawStr.replace(
        "#$#",
        encodeRFC5987ValueChars(data.raw),
      )}&Signature=${sha1Str}`,
      responseType: "json",
    },
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  if (xhr.response.Response.Error) {
    throw `Service error: ${xhr.response.Response.Error.Code}:${xhr.response.Response.Error.Message}`;
  }
  data.result = xhr.response.Response.TargetText;
};

export const Tencent: TranslateService = {
  id: "tencent",
  type: "sentence",
  helpUrl: "https://cloud.tencent.com/document/product/551/15619",

  defaultSecret:
    "secretId#SecretKey#Region(default ap-shanghai)#ProjectId(default 0)",
  secretValidator(secret: string) {
    const parts = secret?.split("#");
    const flag = [2, 3, 4].includes(parts.length);
    const partsInfo = `SecretId: ${parts[0]}\nSecretKey: ${
      parts[1]
    }\nRegion: ${parts[2] ? parts[2] : "ap-shanghai"}\nProjectId: ${
      parts[3] ? parts[3] : "0"
    }`;
    return {
      secret: secret as string,
      status: flag && secret !== Tencent.defaultSecret,
      info:
        secret === Tencent.defaultSecret
          ? "The secret is not set. Click the button to configure."
          : flag
            ? partsInfo
            : `The secret must have 2, 3 or 4 parts joined by '#', but got ${parts?.length}.\n${partsInfo}\nUse format: SecretId#SecretKey#Region(optional)#ProjectId(optional) or click Config button for advanced configuration.`,
    };
  },

  translate,

  config(settings) {
    settings
      .addTextSetting({
        // @ts-expect-error this pref is not inited in prefs.js
        prefKey: "tencent.secretId",
        nameKey: `service-tencent-dialog-secretid`,
      })
      .addPasswordSetting({
        // @ts-expect-error this pref is not inited in prefs.js
        prefKey: "tencent.secretKey",
        nameKey: `service-tencent-dialog-secretkey`,
      })
      .addSelectSetting({
        prefKey: "tencent.region",
        nameKey: `service-tencent-dialog-region`,
        options: [
          { value: "ap-bangkok", label: "ap-bangkok" },
          { value: "ap-beijing", label: "ap-beijing" },
          { value: "ap-chengdu", label: "ap-chengdu" },
          { value: "ap-chongqing", label: "ap-chongqing" },
          { value: "ap-guangzhou", label: "ap-guangzhou" },
          { value: "ap-hongkong", label: "ap-hongkong" },
          { value: "ap-seoul", label: "ap-seoul" },
          { value: "ap-shanghai", label: "ap-shanghai" },
          { value: "ap-shanghai-fsi", label: "ap-shanghai-fsi" },
          { value: "ap-shenzhen-fsi", label: "ap-shenzhen-fsi" },
          { value: "ap-singapore", label: "ap-singapore" },
          { value: "ap-tokyo", label: "ap-tokyo" },
          { value: "eu-frankfurt", label: "eu-frankfurt" },
          { value: "na-ashburn", label: "na-ashburn" },
          { value: "na-siliconvalley", label: "na-siliconvalley" },
        ],
      })
      .addTextSetting({
        prefKey: "tencent.projectId",
        placeholder: "0",
        nameKey: `service-tencent-dialog-projectid`,
      })
      .addTextSetting({
        // @ts-expect-error this pref is not inited in prefs.js
        prefKey: "tencent.termRepoIDList",
        placeholder: "144aed**fc7321d4, 256bef**ac8432e5",
        nameKey: `service-tencent-dialog-termrepoid`,
      })
      .addTextSetting({
        // @ts-expect-error this pref is not inited in prefs.js
        prefKey: "tencent.sentRepoIDList",
        placeholder: "345cde**bd9543f6, 456def**ce0654g7",
        nameKey: `service-tencent-dialog-sentrepoid`,
      })
      .onSave((dialogData) => {
        // Validate required fields
        if (
          // @ts-expect-error those pref key not inited in pref.js
          !dialogData["tencent.secretId"] ||
          // @ts-expect-error those pref key not inited in pref.js
          !dialogData["tencent.secretKey"]
        ) {
          return "Secret ID and Secret Key are required!";
        }

        // @ts-expect-error those pref key not inited in pref.js
        const secretId = dialogData["tencent.secretId"];
        // @ts-expect-error those pref key not inited in pref.js
        const secretKey = dialogData["tencent.secretKey"];
        const region = dialogData["tencent.region"];
        const projectId = dialogData["tencent.projectId"];

        // Update the tencent secret storage
        const combinedSecret = (() => {
          const parts = [];
          const items = [secretId, secretKey, region, projectId];

          for (const item of items) {
            if (item == null || item === "") {
              break;
            }
            parts.push(String(item));
          }

          return parts.join("#");
        })();
        setServiceSecret("tencent", combinedSecret);

        return true;
      });
  },
};

const helpMessage = `Tencent Cloud Translation Configuration Help:

Required Fields:
• Secret ID: Your Tencent Cloud Access Key ID
• Secret Key: Your Tencent Cloud Secret Access Key

Optional Fields:
• Region: Tencent Cloud region (default: ap-shanghai)
• Project ID: Tencent Cloud project ID (default: 0)

Repository IDs (Optional):
• Term Repo IDs: Custom terminology databases
  - Format: Comma-separated hex values (e.g., 144aed**fc7321d4, 256bef**ac8432e5)
  - Used for domain-specific translations
  
• Sent Repo IDs: Sentence-level translation memories  
  - Format: Comma-separated hex values (e.g., 345cde**bd9543f6, 456def**ce0654g7)
  - Used for consistent sentence translations

For more information, visit the documentation link.`;

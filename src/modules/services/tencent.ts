import { base64, hmacSha1Digest } from "../../utils/crypto";
import { TranslateService } from "./base";
import { getPref, setPref } from "../../utils/prefs";

const translate: TranslateService["translate"] = async (data) => {
  let secretId: string;
  let secretKey: string;
  let region = "ap-shanghai";
  let projectId = "0";
  let termRepoIDList: string[] = [];
  let sentRepoIDList: string[] = [];
  let needsMigration = false;

  // Handle both old format (string) and new format (object)
  if (typeof data.secret === "string") {
    // Try to parse as JSON first (new object format stored as string)
    try {
      const config = JSON.parse(data.secret);
      if (config && typeof config === "object" && config.secretId) {
        // New object format
        secretId = config.secretId;
        secretKey = config.secretKey;
        region = config.region || "ap-shanghai";
        projectId = config.projectId || "0";
        termRepoIDList = config.termRepoIDList || [];
        sentRepoIDList = config.sentRepoIDList || [];
      } else {
        throw new Error("Not a valid config object");
      }
    } catch {
      // Legacy string format - needs migration
      const params = data.secret.split("#");
      secretId = params[0];
      secretKey = params[1];
      if (params.length >= 3 && params[2]) {
        region = params[2];
      }
      if (params.length >= 4 && params[3]) {
        projectId = params[3];
      }
      needsMigration = true;
    }
  } else {
    // Direct object format (shouldn't happen in current implementation)
    const config = data.secret as any;
    secretId = config.secretId;
    secretKey = config.secretKey;
    region = config.region || "ap-shanghai";
    projectId = config.projectId || "0";
    termRepoIDList = config.termRepoIDList || [];
    sentRepoIDList = config.sentRepoIDList || [];
  }

  // Migrate old format to new format
  if (needsMigration && secretId && secretKey) {
    const newConfig = {
      secretId,
      secretKey,
      region,
      projectId,
      termRepoIDList: [],
      sentRepoIDList: [],
    };

    // Save individual preferences for the dialog
    setPref("tencent.secretId", secretId);
    setPref("tencent.secretKey", secretKey);
    setPref("tencent.region", region);
    setPref("tencent.projectId", projectId);
    setPref("tencent.termRepoIDList", "");
    setPref("tencent.sentRepoIDList", "");

    // Update the main secret storage with new format
    try {
      const secrets = JSON.parse((getPref("secretObj") as string) || "{}");
      secrets.tencent = newConfig;
      setPref("secretObj", JSON.stringify(secrets));

      // Log migration for debugging
      console.log(
        "Migrated Tencent configuration from old format to new format",
      );
    } catch (error) {
      console.warn("Failed to migrate Tencent configuration:", error);
    }
  }

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
  termRepoIDList.forEach(
    (repoId, index) => (paramsObj[`TermRepoIDList.${index}`] = repoId),
  );
  sentRepoIDList.forEach(
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
  secretValidator(secret: string | object) {
    // Handle empty or default secret
    if (!secret || secret === this.defaultSecret) {
      return {
        secret: secret as string,
        status: false,
        info: "The secret is not set. Click the button to configure.",
      };
    }

    // Try to parse as JSON first (new object format)
    try {
      let config: any;
      if (typeof secret === "string") {
        config = JSON.parse(secret);
      } else {
        config = secret;
      }

      if (config && typeof config === "object" && config.secretId) {
        // New object format validation
        const hasRequiredFields = config.secretId && config.secretKey;
        const partsInfo = `SecretId: ${config.secretId || "Not set"}
SecretKey: ${config.secretKey ? "Set" : "Not set"}
Region: ${config.region || "ap-shanghai"}
ProjectId: ${config.projectId || "0"}
Term Repo IDs: ${(config.termRepoIDList || []).join(", ") || "None"}
Sent Repo IDs: ${(config.sentRepoIDList || []).join(", ") || "None"}`;

        return {
          secret: typeof secret === "string" ? secret : JSON.stringify(secret),
          status: hasRequiredFields,
          info: hasRequiredFields
            ? partsInfo
            : "SecretId and SecretKey are required.",
        };
      }
    } catch {
      // Not JSON, continue to legacy format
    }

    // Handle legacy string format
    const parts = (secret as string)?.split("#");
    const hasRequiredFields =
      parts && parts.length >= 2 && parts[0] && parts[1];
    const partsInfo = `SecretId: ${parts?.[0] || "Not set"}
SecretKey: ${parts?.[1] ? "Set" : "Not set"}
Region: ${parts?.[2] || "ap-shanghai"}
ProjectId: ${parts?.[3] || "0"}`;

    return {
      secret: secret as string,
      status: !!hasRequiredFields,
      info: hasRequiredFields
        ? partsInfo
        : "SecretId and SecretKey are required. Use format: SecretId#SecretKey#Region(optional)#ProjectId(optional) or click button for advanced configuration.",
    };
  },

  translate,

  config(settings) {
    // TODO: those code seems useless?
    // Try to get values from individual preferences first, then fall back to parsing the main secret
    // let secretId = (getPref("tencent.secretId") as string) || "";
    // let secretKey = (getPref("tencent.secretKey") as string) || "";
    // let region = (getPref("tencent.region") as string) || "ap-shanghai";
    // let projectId = (getPref("tencent.projectId") as string) || "0";
    // let termRepoIDList = (getPref("tencent.termRepoIDList") as string) || "";
    // let sentRepoIDList = (getPref("tencent.sentRepoIDList") as string) || "";

    // // If individual preferences are not set, try to parse from the main secret
    // if (!secretId || !secretKey) {
    //   try {
    //     const secrets = JSON.parse((getPref("secretObj") as string) || "{}");
    //     const tencentSecret = secrets.tencent;

    //     if (typeof tencentSecret === "string") {
    //       // Legacy format - parse it
    //       const params = tencentSecret.split("#");
    //       if (params.length >= 2) {
    //         secretId = params[0] || "";
    //         secretKey = params[1] || "";
    //         region = params[2] || "ap-shanghai";
    //         projectId = params[3] || "0";
    //       }
    //     } else if (tencentSecret && typeof tencentSecret === "object") {
    //       // New object format
    //       secretId = tencentSecret.secretId || "";
    //       secretKey = tencentSecret.secretKey || "";
    //       region = tencentSecret.region || "ap-shanghai";
    //       projectId = tencentSecret.projectId || "0";
    //       termRepoIDList = (tencentSecret.termRepoIDList || []).join(", ");
    //       sentRepoIDList = (tencentSecret.sentRepoIDList || []).join(", ");
    //     }
    //   } catch (error) {
    //     console.warn("Failed to parse Tencent secret:", error);
    //   }
    // }

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
        // @ts-expect-error this pref is not inited in prefs.js
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
        // @ts-expect-error this pref is not inited in prefs.js
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
      .addSelectSetting({
        // @ts-expect-error this pref is not inited in prefs.js
        prefKey: "tencent.sentRepoIDList",
        inputType: "text",
        placeholder: "345cde**bd9543f6, 456def**ce0654g7",
        nameKey: `service-tencent-dialog-sentrepoid`,
      });

    // TODO: also same with top, check it:
    // // Validate required fields
    // if (!dialogData.secretId || !dialogData.secretKey) {
    //   Zotero.getMainWindow().alert(
    //     "Secret ID and Secret Key are required!",
    //   );
    //   return;
    // }

    // // Save individual preferences
    // setPref("tencent.secretId", dialogData.secretId);
    // setPref("tencent.secretKey", dialogData.secretKey);
    // setPref("tencent.region", dialogData.region || "ap-shanghai");
    // setPref("tencent.projectId", dialogData.projectId || "0");
    // setPref("tencent.termRepoIDList", dialogData.termRepoIDList || "");
    // setPref("tencent.sentRepoIDList", dialogData.sentRepoIDList || "");

    // // Helper function to parse comma-separated values
    // const parseCommaList = (input: string): string[] =>
    //   input
    //     .split(",")
    //     .map((id) => id.trim())
    //     .filter((id) => id.length > 0);

    // // Build the combined secret object for the service
    // const termRepoList = parseCommaList(dialogData.termRepoIDList);
    // const sentRepoList = parseCommaList(dialogData.sentRepoIDList);

    // const secretConfig = {
    //   secretId: dialogData.secretId,
    //   secretKey: dialogData.secretKey,
    //   region: dialogData.region || "ap-shanghai",
    //   projectId: dialogData.projectId || "0",
    //   termRepoIDList: termRepoList,
    //   sentRepoIDList: sentRepoList,
    // };

    // // Update the main secret storage
    // const secrets = JSON.parse(getPref("secretObj") as string);
    // secrets.tencent = secretConfig;
    // setPref("secretObj", JSON.stringify(secrets));
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

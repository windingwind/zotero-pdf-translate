import { base64, hmacSha1Digest } from "../../utils/crypto";
import { TranslateTaskProcessor } from "../../utils/task";
import { getPref, setPref } from "../../utils/prefs";

export default <TranslateTaskProcessor>async function (data) {
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

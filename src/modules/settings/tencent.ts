import { getPref, setPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";
import { getService } from "../../utils/config";

export async function tencentStatusCallback(status: boolean) {
  const dialog = new ztoolkit.Dialog(2, 1);

  // Try to get values from individual preferences first, then fall back to parsing the main secret
  let secretId = (getPref("tencent.secretId") as string) || "";
  let secretKey = (getPref("tencent.secretKey") as string) || "";
  let region = (getPref("tencent.region") as string) || "ap-shanghai";
  let projectId = (getPref("tencent.projectId") as string) || "0";
  let termRepoIDList = (getPref("tencent.termRepoIDList") as string) || "";
  let sentRepoIDList = (getPref("tencent.sentRepoIDList") as string) || "";

  // If individual preferences are not set, try to parse from the main secret
  if (!secretId || !secretKey) {
    try {
      const secrets = JSON.parse((getPref("secretObj") as string) || "{}");
      const tencentSecret = secrets.tencent;

      if (typeof tencentSecret === "string") {
        // Legacy format - parse it
        const params = tencentSecret.split("#");
        if (params.length >= 2) {
          secretId = params[0] || "";
          secretKey = params[1] || "";
          region = params[2] || "ap-shanghai";
          projectId = params[3] || "0";
        }
      } else if (tencentSecret && typeof tencentSecret === "object") {
        // New object format
        secretId = tencentSecret.secretId || "";
        secretKey = tencentSecret.secretKey || "";
        region = tencentSecret.region || "ap-shanghai";
        projectId = tencentSecret.projectId || "0";
        termRepoIDList = (tencentSecret.termRepoIDList || []).join(", ");
        sentRepoIDList = (tencentSecret.sentRepoIDList || []).join(", ");
      }
    } catch (error) {
      console.warn("Failed to parse Tencent secret:", error);
    }
  }

  const dialogData: { [key: string | number]: any } = {
    secretId,
    secretKey,
    region,
    projectId,
    termRepoIDList,
    sentRepoIDList,
  };

  dialog
    .setDialogData(dialogData)
    .addCell(
      0,
      0,
      {
        tag: "div",
        namespace: "html",
        styles: {
          display: "grid",
          gridTemplateColumns: "1fr 3fr",
          rowGap: "12px",
          columnGap: "8px",
          minWidth: "500px",
          minHeight: "300px",
          padding: "15px",
        },
        children: [
          // Secret ID
          {
            tag: "label",
            namespace: "html",
            attributes: { for: "secretId" },
            properties: {
              innerHTML: getString("service-tencent-dialog-secretid"),
            },
          },
          {
            tag: "input",
            id: "secretId",
            attributes: {
              "data-bind": "secretId",
              "data-prop": "value",
              type: "text",
              required: true,
            },
          },

          // Secret Key
          {
            tag: "label",
            namespace: "html",
            attributes: { for: "secretKey" },
            properties: {
              innerHTML: getString("service-tencent-dialog-secretkey"),
            },
          },
          {
            tag: "input",
            id: "secretKey",
            attributes: {
              "data-bind": "secretKey",
              "data-prop": "value",
              type: "password",
              required: true,
            },
          },

          // Region
          {
            tag: "label",
            namespace: "html",
            attributes: { for: "region" },
            properties: {
              innerHTML: getString("service-tencent-dialog-region"),
            },
          },
          {
            tag: "select",
            id: "region",
            attributes: {
              "data-bind": "region",
              "data-prop": "value",
            },
            children: [
              {
                tag: "option",
                properties: {
                  value: "ap-bangkok",
                  innerHTML: "ap-bangkok",
                },
              },
              {
                tag: "option",
                properties: {
                  value: "ap-beijing",
                  innerHTML: "ap-beijing",
                },
              },
              {
                tag: "option",
                properties: {
                  value: "ap-chengdu",
                  innerHTML: "ap-chengdu",
                },
              },
              {
                tag: "option",
                properties: {
                  value: "ap-chongqing",
                  innerHTML: "ap-chongqing",
                },
              },
              {
                tag: "option",
                properties: {
                  value: "ap-guangzhou",
                  innerHTML: "ap-guangzhou",
                },
              },
              {
                tag: "option",
                properties: {
                  value: "ap-hongkong",
                  innerHTML: "ap-hongkong",
                },
              },
              {
                tag: "option",
                properties: {
                  value: "ap-seoul",
                  innerHTML: "ap-seoul",
                },
              },
              {
                tag: "option",
                properties: {
                  value: "ap-shanghai",
                  innerHTML: "ap-shanghai",
                },
              },
              {
                tag: "option",
                properties: {
                  value: "ap-shanghai-fsi",
                  innerHTML: "ap-shanghai-fsi",
                },
              },
              {
                tag: "option",
                properties: {
                  value: "ap-shenzhen-fsi",
                  innerHTML: "ap-shenzhen-fsi",
                },
              },
              {
                tag: "option",
                properties: {
                  value: "ap-singapore",
                  innerHTML: "ap-singapore",
                },
              },
              {
                tag: "option",
                properties: {
                  value: "ap-tokyo",
                  innerHTML: "ap-tokyo",
                },
              },
              {
                tag: "option",
                properties: {
                  value: "eu-frankfurt",
                  innerHTML: "eu-frankfurt",
                },
              },
              {
                tag: "option",
                properties: {
                  value: "na-ashburn",
                  innerHTML: "na-ashburn",
                },
              },
              {
                tag: "option",
                properties: {
                  value: "na-siliconvalley",
                  innerHTML: "na-siliconvalley",
                },
              },
            ],
          },

          // Project ID
          {
            tag: "label",
            namespace: "html",
            attributes: { for: "projectId" },
            properties: {
              innerHTML: getString("service-tencent-dialog-projectid"),
            },
          },
          {
            tag: "input",
            id: "projectId",
            attributes: {
              "data-bind": "projectId",
              "data-prop": "value",
              type: "text",
              placeholder: "0",
            },
          },

          // Term Repo ID List
          {
            tag: "label",
            namespace: "html",
            attributes: { for: "termRepoIDList" },
            properties: {
              innerHTML: getString("service-tencent-dialog-termrepoid"),
            },
          },
          {
            tag: "input",
            id: "termRepoIDList",
            attributes: {
              "data-bind": "termRepoIDList",
              "data-prop": "value",
              type: "text",
              placeholder: "144aed**fc7321d4, 256bef**ac8432e5",
            },
            styles: {
              fontFamily: "monospace",
              fontSize: "12px",
            },
          },

          // Sent Repo ID List
          {
            tag: "label",
            namespace: "html",
            attributes: { for: "sentRepoIDList" },
            properties: {
              innerHTML: getString("service-tencent-dialog-sentrepoid"),
            },
          },
          {
            tag: "input",
            id: "sentRepoIDList",
            attributes: {
              "data-bind": "sentRepoIDList",
              "data-prop": "value",
              type: "text",
              placeholder: "345cde**bd9543f6, 456def**ce0654g7",
            },
            styles: {
              fontFamily: "monospace",
              fontSize: "12px",
            },
          },
        ],
      },
      false,
    )
    .addButton(getString("service-tencent-dialog-save"), "save")
    .addButton(getString("service-tencent-dialog-close"), "close")
    .addButton(getString("service-tencent-dialog-help"), "help")
    .open(getString("service-tencent-dialog-title"));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        // Validate required fields
        if (!dialogData.secretId || !dialogData.secretKey) {
          Zotero.getMainWindow().alert(
            "Secret ID and Secret Key are required!",
          );
          return;
        }

        // Set default values in defaultSecret to Prefs when clicking Save button
        const tencentDefaultSecret = getService("tencent").defaultSecret;
        const regionPlaceHolder = tencentDefaultSecret?.split("#")[2];
        const projectIdPlaceHolder = tencentDefaultSecret?.split("#")[3];
        const regionValue = dialogData.region
          ? regionPlaceHolder && regionPlaceHolder === dialogData.region
            ? "ap-shanghai"
            : dialogData.region
          : "ap-shanghai";
        const projectIdValue = dialogData.projectId
          ? projectIdPlaceHolder &&
            projectIdPlaceHolder === dialogData.projectId
            ? "0"
            : dialogData.projectId
          : "0";

        // Save individual preferences
        setPref("tencent.secretId", dialogData.secretId);
        setPref("tencent.secretKey", dialogData.secretKey);
        setPref("tencent.region", regionValue);
        setPref("tencent.projectId", projectIdValue);
        setPref("tencent.termRepoIDList", dialogData.termRepoIDList || "");
        setPref("tencent.sentRepoIDList", dialogData.sentRepoIDList || "");

        // Helper function to parse comma-separated values
        const parseCommaList = (input: string): string[] =>
          input
            .split(",")
            .map((id) => id.trim())
            .filter((id) => id.length > 0);

        // Build the combined secret object for the service
        const termRepoList = parseCommaList(dialogData.termRepoIDList);
        const sentRepoList = parseCommaList(dialogData.sentRepoIDList);

        const secretConfig = {
          secretId: dialogData.secretId,
          secretKey: dialogData.secretKey,
          region: regionValue,
          projectId: projectIdValue,
          termRepoIDList: termRepoList,
          sentRepoIDList: sentRepoList,
        };

        // Update the main secret storage
        const secrets = JSON.parse(getPref("secretObj") as string);
        secrets.tencent = secretConfig;
        setPref("secretObj", JSON.stringify(secrets));
      }
      break;
    case "help":
      {
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

        Zotero.getMainWindow().alert(helpMessage);
        Zotero.launchURL(
          "https://cloud.tencent.com/document/product/551/15619",
        );
      }
      break;
    default:
      break;
  }
}

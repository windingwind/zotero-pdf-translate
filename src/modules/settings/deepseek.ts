import { getPref, setPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

export async function deepseekStatusCallback(status: boolean) {
    const prefix = "deepseek";
    const addonPrefix = prefix;

    if (!status) {
        return;
    }

    const dialog = new ztoolkit.Dialog(2, 1);
    const dialogData: { [key: string | number]: any } = {
        endPoint: getPref(`${prefix}.endPoint`) || "https://api.deepseek.com",
        model: getPref(`${prefix}.model`) || "deepseek-chat",
        temperature: parseFloat(getPref(`${prefix}.temperature`) as string) || 1.3,
        prompt: getPref(`${prefix}.prompt`) || "Please translate the following text from ${langFrom} to ${langTo}:\n\n${sourceText}",
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
                    gridTemplateColumns: "1fr 4fr",
                    rowGap: "10px",
                    columnGap: "5px",
                },
                children: [
                    {
                        tag: "label",
                        namespace: "html",
                        attributes: {
                            for: "endPoint",
                        },
                        properties: {
                            innerHTML: getString(`service-${addonPrefix}-dialog-endPoint`),
                        },
                    },
                    {
                        tag: "input",
                        id: "endPoint",
                        attributes: {
                            "data-bind": "endPoint",
                            "data-prop": "value",
                            type: "string",
                        },
                    },
                    {
                        tag: "label",
                        namespace: "html",
                        attributes: {
                            for: "model",
                        },
                        properties: {
                            innerHTML: getString(`service-${addonPrefix}-dialog-model`),
                        },
                    },
                    {
                        tag: "input",
                        id: "model",
                        attributes: {
                            "data-bind": "model",
                            "data-prop": "value",
                            type: "string",
                        },
                    },
                    {
                        tag: "label",
                        namespace: "html",
                        attributes: {
                            for: "temperature",
                        },
                        properties: {
                            innerHTML: getString(`service-${addonPrefix}-dialog-temperature`),
                        },
                    },
                    {
                        tag: "input",
                        id: "temperature",
                        attributes: {
                            "data-bind": "temperature",
                            "data-prop": "value",
                            type: "number",
                            min: 0,
                            max: 2,
                            step: 0.1,
                        },
                    },
                    {
                        tag: "label",
                        namespace: "html",
                        attributes: {
                            for: "prompt",
                        },
                        properties: {
                            innerHTML: getString(`service-${addonPrefix}-dialog-prompt`),
                        },
                    },
                    {
                        tag: "input",
                        id: "prompt",
                        attributes: {
                            "data-bind": "prompt",
                            "data-prop": "value",
                        },
                    },
                ],
            },
            false,
        )
        .addButton(getString(`service-${addonPrefix}-dialog-save`), "save")
        .addButton(getString(`service-${addonPrefix}-dialog-close`), "close")
        .addButton(getString(`service-${addonPrefix}-dialog-help`), "help");

    dialog.open(getString(`service-${addonPrefix}-dialog-title`));

    await dialogData.unloadLock?.promise;
    switch (dialogData._lastButtonId) {
        case "save":
            {
                const temperature = dialogData.temperature;

                if (temperature && temperature >= 0 && temperature <= 2) {
                    setPref(`${prefix}.temperature`, dialogData.temperature.toString());
                }

                setPref(`${prefix}.endPoint`, dialogData.endPoint);
                setPref(`${prefix}.model`, dialogData.model);
                setPref(`${prefix}.prompt`, dialogData.prompt);
            }
            break;
        case "help":
            {
                Zotero.launchURL("https://platform.deepseek.com/");
            }
            break;
        default:
            break;
    }
} 
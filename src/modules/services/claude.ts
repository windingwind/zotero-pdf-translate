import { TranslateTask, TranslateTaskProcessor } from "../../utils/task";
import { getPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

// Helper function to transform content using prompt template
function transformContent(
  langFrom: string,
  langTo: string,
  sourceText: string,
) {
  return (getPref("claude.prompt") as string)
    .replaceAll("${langFrom}", langFrom)
    .replaceAll("${langTo}", langTo)
    .replaceAll("${sourceText}", sourceText);
}

// Removed duplicate implementation in favor of the main claude function

export const claude = <TranslateTaskProcessor>async function (data) {
  const apiURL = getPref("claude.endPoint") as string;
  const model = getPref("claude.model") as string;
  const temperature = parseFloat(getPref("claude.temperature") as string);
  const stream = getPref("claude.stream") as boolean;
  const maxTokens = parseInt(getPref("claude.maxTokens") as string) || 4000;

  const refreshHandler = addon.api.getTemporaryRefreshHandler({ task: data });

  // Pass maxTokens to the request body
  const requestBody = {
    model: model,
    messages: [
      {
        role: "user",
        content: transformContent(data.langfrom, data.langto, data.raw),
      },
    ],
    temperature: temperature,
    stream: stream,
    max_tokens: maxTokens,
  };

  const headers = {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
    "x-api-key": data.secret,
  };

  const xhr = await Zotero.HTTP.request("POST", apiURL, {
    headers: headers,
    body: JSON.stringify(requestBody),
    responseType: "text",
    requestObserver: (xmlhttp: XMLHttpRequest) => {
      if (stream) {
        let preLength = 0;
        let result = "";
        let buffer = ""; // Buffer to handle partial JSON chunks

        xmlhttp.onprogress = (e: any) => {
          try {
            // Get only the new data since last progress event
            const newResponse = e.target.response.slice(preLength);
            preLength = e.target.response.length;

            // Add to our working buffer
            buffer += newResponse;

            // Process complete data: chunks by splitting on newlines
            const lines = buffer.split("\n");

            // Keep the last line in the buffer as it might be incomplete
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim()) continue; // Skip empty lines

              // Remove the "data: " prefix if present
              const dataLine = line.startsWith("data: ") ? line.slice(6) : line;

              if (dataLine.trim() === "[DONE]") continue;

              try {
                const obj = JSON.parse(dataLine);
                if (obj.type === "content_block_delta") {
                  result += obj.delta?.text || "";
                } else if (
                  obj.type === "content_block_start" ||
                  obj.type === "content_block_stop"
                ) {
                  // Handle other event types if needed
                  continue;
                }
              } catch (parseError) {
                // Skip invalid JSON - might be a partial chunk
                continue;
              }
            }

            // Clear timeouts caused by stream transfers
            if (e.target.timeout) {
              e.target.timeout = 0;
            }

            // Update the result
            data.result = result.replace(/^\n\n/, "");

            // Refresh UI to show progress
            refreshHandler();
          } catch (error) {
            console.error("Error processing Claude stream:", error);
          }
        };

        // Also handle the load event to ensure we get the complete text
        xmlhttp.onload = () => {
          data.status = "success";

          // Refresh UI once more to ensure we display the final result
          refreshHandler();
        };
      } else {
        // Non-streaming logic
        xmlhttp.onload = () => {
          try {
            const responseObj = JSON.parse(xmlhttp.responseText);
            const resultContent = responseObj.content[0].text;
            data.result = resultContent.replace(/^\n\n/, "");
          } catch (error) {
            data.result = getString("status-translating");
            data.status = "fail";
            throw `Failed to parse response: ${error}`;
          }

          // Trigger UI updates after receiving the full response
          refreshHandler();
        };
      }
    },
  });

  if (xhr?.status !== 200) {
    data.result = `Request error: ${xhr?.status}`;
    data.status = "fail";
    throw `Request error: ${xhr?.status}`;
  }

  data.status = "success";
  return;
};

import { getPref, getString, transformPromptWithContext } from "../../utils";
import { TranslateService } from "./base";

type CliServiceId = "codex-cli" | "claude-code-cli";
type CliPrefPrefix = "codexCLI" | "claudeCodeCLI";

type Pipe = {
  readString: () => Promise<string>;
};

type Process = {
  stdin: {
    write: (data: string) => Promise<unknown>;
    close: () => Promise<unknown>;
  };
  stdout: Pipe;
  stderr: Pipe;
  wait: () => Promise<{ exitCode: number }>;
  kill: () => Promise<{ exitCode: number }>;
};

type SubprocessModule = {
  call: (options: {
    command: string;
    arguments: string[];
    stderr: "pipe";
    disclaim: boolean;
  }) => Promise<Process>;
  pathSearch: (command: string) => Promise<string>;
};

async function readAll(pipe: Pipe): Promise<string> {
  let output = "";
  while (true) {
    const chunk = await pipe.readString();
    if (!chunk) {
      return output;
    }
    output += chunk;
  }
}

async function resolveExecutable(
  Subprocess: SubprocessModule,
  command: string,
): Promise<string> {
  if (!command) {
    throw new Error("CLI executable is not configured.");
  }
  if (command.includes("/") || command.includes("\\")) {
    return command;
  }
  try {
    return await Subprocess.pathSearch(command);
  } catch {
    throw new Error(
      `Cannot find "${command}" in Zotero's PATH. Configure its absolute executable path.`,
    );
  }
}

function getArguments(id: CliServiceId, model: string): string[] {
  if (id === "codex-cli") {
    const args = [
      "exec",
      "--ignore-user-config",
      "--ignore-rules",
      "-c",
      'approval_policy="never"',
      "--sandbox",
      "read-only",
      "--skip-git-repo-check",
      "--ephemeral",
      "--color",
      "never",
    ];
    if (model) {
      args.push("--model", model);
    }
    args.push("-");
    return args;
  }

  const args = [
    "--print",
    "--safe-mode",
    "--no-session-persistence",
    "--output-format",
    "text",
    "--permission-mode",
    "dontAsk",
    "--tools",
    "",
  ];
  if (model) {
    args.push("--model", model);
  }
  return args;
}

async function runCLI(
  id: CliServiceId,
  command: string,
  model: string,
  prompt: string,
  timeoutSeconds: number,
): Promise<string> {
  const { Subprocess } = ChromeUtils.importESModule(
    "resource://gre/modules/Subprocess.sys.mjs",
  ) as { Subprocess: SubprocessModule };
  const executable = await resolveExecutable(Subprocess, command.trim());
  const process = await Subprocess.call({
    command: executable,
    arguments: getArguments(id, model.trim()),
    stderr: "pipe",
    disclaim: true,
  });

  const stdoutPromise = readAll(process.stdout);
  const stderrPromise = readAll(process.stderr);

  try {
    await process.stdin.write(prompt);
    await process.stdin.close();
  } catch (error) {
    await process.kill();
    throw error;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      void process.kill();
      reject(
        new Error(`CLI translation timed out after ${timeoutSeconds} seconds.`),
      );
    }, timeoutSeconds * 1000);
  });

  try {
    const [{ exitCode }, stdout, stderr] = await Promise.race([
      Promise.all([process.wait(), stdoutPromise, stderrPromise]),
      timeoutPromise,
    ]);
    if (exitCode !== 0) {
      throw new Error(
        stderr.trim() || `CLI process exited with code ${exitCode}.`,
      );
    }
    const result = stdout.trim();
    if (!result) {
      throw new Error(stderr.trim() || "CLI returned an empty translation.");
    }
    return result;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

function createCLIService(
  id: CliServiceId,
  prefPrefix: CliPrefPrefix,
  helpUrl: string,
): TranslateService {
  return {
    id,
    type: "sentence",
    helpUrl,
    requireExternalConfig: true,

    async translate(data) {
      data.result = getString("status-translating");
      addon.api.getTemporaryRefreshHandler({ task: data })();

      const prompt = transformPromptWithContext(
        `${prefPrefix}.prompt`,
        data.langfrom,
        data.langto,
        data.raw,
        data,
      );
      const timeoutSeconds =
        Number(getPref(`${prefPrefix}.timeoutSeconds`)) || 300;
      data.result = await runCLI(
        id,
        getPref(`${prefPrefix}.command`) as string,
        getPref(`${prefPrefix}.model`) as string,
        prompt,
        timeoutSeconds,
      );
    },

    config(settings) {
      settings
        .addTextSetting({
          prefKey: `${prefPrefix}.command`,
          nameKey: "service-cli-dialog-command",
        })
        .addTextSetting({
          prefKey: `${prefPrefix}.model`,
          nameKey: "service-cli-dialog-model",
        })
        .addNumberSetting({
          prefKey: `${prefPrefix}.timeoutSeconds`,
          nameKey: "service-cli-dialog-timeoutSeconds",
          min: 10,
          max: 3600,
          step: 10,
        })
        .addTextAreaSetting({
          prefKey: `${prefPrefix}.prompt`,
          nameKey: "service-cli-dialog-prompt",
        });
    },
  };
}

export const CodexCLI = createCLIService(
  "codex-cli",
  "codexCLI",
  "https://developers.openai.com/codex/cli/",
);

export const ClaudeCodeCLI = createCLIService(
  "claude-code-cli",
  "claudeCodeCLI",
  "https://code.claude.com/docs/en/cli-reference",
);

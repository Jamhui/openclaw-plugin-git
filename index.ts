import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

type ProjectConfig = {
  path: string;
  remote?: string;
  branch?: string;
};

type GpsConfig = {
  accounts?: Record<string, AccountConfig>;
};

type AccountConfig = {
  defaultProject?: string;
  projects?: Record<string, ProjectConfig>;
};

type ParsedGpsArgs = {
  list: boolean;
  projectKey?: string;
  message?: string;
  messageProvided: boolean;
};

const MAX_MESSAGE_LENGTH = 4000;

function getConfig(api: Parameters<Parameters<typeof definePluginEntry>[0]["register"]>[0]): GpsConfig {
  // Third-party plugins can be loaded with a reduced runtime surface depending
  // on the OpenClaw/Gateway version. Prefer the live snapshot when available,
  // but never let config lookup make the slash command fail generically.
  try {
    const current = api.runtime?.config?.current;
    if (typeof current === "function") {
      const liveConfig = current().plugins?.entries?.gps?.config;
      if (liveConfig) return liveConfig as GpsConfig;
    }
  } catch {
    // Fall back to the config captured when the plugin was registered.
  }
  return (api.pluginConfig ?? {}) as GpsConfig;
}

function cleanOutput(value: unknown): string {
  const text = String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
  return text.length > MAX_MESSAGE_LENGTH
    ? `${text.slice(0, MAX_MESSAGE_LENGTH)}\n…输出已截断`
    : text;
}

function splitArgs(args: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let escaped = false;

  for (const ch of args.trim()) {
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }

    if (quote && ch === "\\") {
      escaped = true;
      continue;
    }

    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += ch;
  }

  if (current) tokens.push(current);
  return tokens;
}

function parseGpsArgs(args: string): ParsedGpsArgs {
  const tokens = splitArgs(args);
  if (tokens[0] === "list") {
    return { list: true, messageProvided: false };
  }

  let index = 0;
  let projectKey: string | undefined;

  if (tokens[0] && tokens[0] !== "-m") {
    projectKey = tokens[0];
    index = 1;
  }

  let messageProvided = false;
  let message: string | undefined;

  while (index < tokens.length) {
    if (tokens[index] === "-m") {
      messageProvided = true;
      message = tokens.slice(index + 1).join(" ").trim();
      break;
    }
    index += 1;
  }

  return {
    list: false,
    projectKey,
    message,
    messageProvided,
  };
}

function formatProjectList(projects: Record<string, ProjectConfig>, defaultProject?: string): string {
  return Object.entries(projects)
    .map(([name, project]) => {
      const suffix = name === defaultProject ? " [default]" : "";
      return `${name}${suffix} => ${project.path}`;
    })
    .join("\n");
}

function buildPushArgs(project: ProjectConfig): string[] {
  const args = ["-C", project.path, "push"];
  if (project.remote) {
    args.push(project.remote);
    if (project.branch) args.push(project.branch);
  }
  return args;
}

function buildPullArgs(project: ProjectConfig): string[] {
  const args = ["-C", project.path, "pull"];
  if (project.remote) {
    args.push(project.remote);
    if (project.branch) args.push(project.branch);
  }
  return args;
}

function formatGpsUsage(projects: Record<string, ProjectConfig>, defaultProject?: string, mode: "gps" | "gpl" = "gps"): string {
  const lines = [
    '用法：',
    mode === 'gps' ? '  /gps list' : '  /gpl list',
    mode === 'gps' ? '  /gps -m "提交信息"' : '  /gpl <项目名>',
    mode === 'gps' ? '  /gps <项目名> -m "提交信息"' : '  /gpl <项目名>',
  ];

  if (defaultProject) {
    lines.push(`默认项目：${defaultProject}`);
  }

  if (Object.keys(projects).length > 0) {
    lines.push(`可用项目：\n${formatProjectList(projects, defaultProject)}`);
  } else {
    lines.push('当前还没有配置 projects。');
  }

  return lines.join('\n');
}

async function runGit(api: Parameters<Parameters<typeof definePluginEntry>[0]["register"]>[0], args: string[]) {
  return api.runtime.system.runCommandWithTimeout(["git", ...args], {
    timeoutMs: 120_000,
    noOutputTimeoutMs: 60_000,
    maxOutputBytes: 64 * 1024,
    killProcessTree: true,
  });
}

export default definePluginEntry({
  id: "gps",
  name: "GPS",
  description: "Run git add/commit/push and git pull for configured projects with usage help.",
  activation: {
    onStartup: false,
    onCommands: ["gps", "gpl"],
  },
  configSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      accounts: {
        type: "object",
        description: "QQBot account id to its isolated project configuration.",
        additionalProperties: {
          type: "object",
          additionalProperties: false,
          properties: {
            defaultProject: {
              type: "string",
              description: "Default project key for this bot account.",
            },
            projects: {
              type: "object",
              description: "Projects this bot account is allowed to push.",
              additionalProperties: {
                type: "object",
                additionalProperties: false,
                properties: {
                  path: {
                    type: "string",
                    description: "Absolute path to the git repository.",
                  },
                  remote: {
                    type: "string",
                    description: "Optional git remote name.",
                  },
                  branch: {
                    type: "string",
                    description: "Optional branch name to push.",
                  },
                },
                required: ["path"],
              },
            },
          },
          required: ["projects"],
        },
      },
    },
  },
  register(api) {
    api.registerCommand({
      name: "gps",
      description: "Run git add/commit/push and git pull for configured projects with usage help.",
      acceptsArgs: true,
      exposeSenderIsOwner: true,
      getArgumentCompletions: async (argumentPrefix) => {
        const prefix = argumentPrefix.trim();
        const completions = [
          { label: "list", value: "list" },
          { label: "-m", value: "-m" },
        ];
        return completions.filter((item) => item.value.startsWith(prefix));
      },
      handler: async (ctx) => {
        try {
          const config = getConfig(api);
          const accountId = ctx.accountId?.trim();
          if (!accountId) {
            return { text: "无法识别当前 QQBot 账号，已拒绝执行 git push。" };
          }

          const account = config.accounts?.[accountId];
          if (!account) {
            return { text: `当前 QQBot（${accountId}）没有配置可使用的项目。` };
          }

          const projects = account.projects ?? {};
          const parsed = parseGpsArgs(ctx.args ?? "");

          if (parsed.list) {
            return {
              text: Object.keys(projects).length > 0
                ? `当前 Bot（${accountId}）可用项目:\n${formatProjectList(projects, account.defaultProject)}`
                : "当前还没有配置 projects。",
            };
          }

          let projectKey = parsed.projectKey;
          if (!projectKey) projectKey = account.defaultProject;

          if (!projectKey) {
            return {
              text: [
                `请先为 ${accountId} 配置 defaultProject，或使用 /gps <项目名>。`,
                Object.keys(projects).length > 0
                  ? `可用项目:\n${formatProjectList(projects, account.defaultProject)}`
                  : "当前还没有配置 projects。",
              ].join("\n"),
            };
          }

          const project = projects[projectKey];
          if (!project) {
            return {
              text: `当前 Bot（${accountId}）无权使用项目：${projectKey}。\n\n${formatGpsUsage(projects, account.defaultProject, "gps")}`,
            };
          }

          if (parsed.messageProvided) {
            const message = (parsed.message ?? "").trim();
            if (!message) {
              return { text: formatGpsUsage(projects, account.defaultProject, "gps") };
            }

            const statusResult = await runGit(api, ["-C", project.path, "status", "--porcelain"]);
            if (statusResult.code !== 0) {
              const detail = cleanOutput(statusResult.stderr || statusResult.stdout || `exit code ${statusResult.code}`);
              return { text: `git status 检查失败（${projectKey}）：\n${detail}` };
            }
            if (!cleanOutput(statusResult.stdout).trim()) {
              return { text: `项目 ${projectKey} 当前没有可提交的改动，已跳过 git add/commit/push。` };
            }

            const addResult = await runGit(api, ["-C", project.path, "add", "."]);
            if (addResult.code !== 0) {
              const detail = cleanOutput(addResult.stderr || addResult.stdout || `exit code ${addResult.code}`);
              return { text: `git add 失败（${projectKey}）：\n${detail}` };
            }

            const commitResult = await runGit(api, ["-C", project.path, "commit", "-m", message]);
            if (commitResult.code !== 0) {
              const detail = cleanOutput(commitResult.stderr || commitResult.stdout || `exit code ${commitResult.code}`);
              return { text: `git commit 失败（${projectKey}）：\n${detail}` };
            }

            const pushResult = await runGit(api, buildPushArgs(project));
            if (pushResult.code !== 0) {
              const detail = cleanOutput(pushResult.stderr || pushResult.stdout || `exit code ${pushResult.code}`);
              return { text: `git push 失败（${projectKey}）：\n${detail}` };
            }

            const output = cleanOutput([statusResult.stdout, addResult.stdout, commitResult.stdout, pushResult.stdout].filter(Boolean).join("\n"));
            return {
              text: [`git add/commit/push 成功：${projectKey}`, output ? `输出:\n${output}` : null]
                .filter(Boolean)
                .join("\n"),
            };
          }
          const result = await runGit(api, buildPushArgs(project));
          if (result.code !== 0) {
            const detail = cleanOutput(result.stderr || result.stdout || `exit code ${result.code}`);
            return { text: `git push 失败（${projectKey}）：\n${detail}` };
          }

          const output = cleanOutput(result.stdout || result.stderr);
          return {
            text: [`git push 成功：${projectKey}`, output ? `输出:\n${output}` : null]
              .filter(Boolean)
              .join("\n"),
          };
        } catch (error) {
          const message = cleanOutput(error instanceof Error ? error.message : error);
          try {
            if (typeof api.logger?.error === "function") {
              api.logger.error(`gps command failed: ${message}`);
            }
          } catch {
            // A logging compatibility problem must not hide the useful reply.
          }
          // 不标记 isError，否则部分消息渠道会把具体原因替换成通用错误。
          return { text: `GPS 执行失败：${message || "未知错误"}` };
        }
      },
    });

    api.registerCommand({
      name: "gpl",
      description: "Run git pull for a configured project repository.",
      acceptsArgs: true,
      exposeSenderIsOwner: true,
      getArgumentCompletions: async (argumentPrefix) => {
        const prefix = argumentPrefix.trim();
        return prefix === "" || "list".startsWith(prefix)
          ? [{ label: "list", value: "list" }]
          : [];
      },
      handler: async (ctx) => {
        try {
          const config = getConfig(api);
          const accountId = ctx.accountId?.trim();
          if (!accountId) {
            return { text: "无法识别当前 QQBot 账号，已拒绝执行 git pull。" };
          }

          const account = config.accounts?.[accountId];
          if (!account) {
            return { text: `当前 QQBot（${accountId}）没有配置可拉取项目。` };
          }

          const projects = account.projects ?? {};
          const args = splitArgs(ctx.args ?? "");

          let projectKey = args[0];
          if (!projectKey) projectKey = account.defaultProject;

          if (projectKey === "list") {
            return {
              text: Object.keys(projects).length > 0
                ? `当前 Bot（${accountId}）可用项目:\n${formatProjectList(projects, account.defaultProject)}`
                : "当前还没有配置 projects。",
            };
          }

          if (!projectKey) {
            return {
              text: [
                `请先为 ${accountId} 配置 defaultProject，或使用 /gpl <项目名>。`,
                Object.keys(projects).length > 0
                  ? `可用项目:\n${formatProjectList(projects, account.defaultProject)}`
                  : "当前还没有配置 projects。",
              ].join("\n"),
            };
          }

          const project = projects[projectKey];
          if (!project) {
            return {
              text: `当前 Bot（${accountId}）无权拉取项目：${projectKey}。\n\n${formatGpsUsage(projects, account.defaultProject, "gpl")}`,
            };
          }

          const result = await runGit(api, buildPullArgs(project));
          if (result.code !== 0) {
            const detail = cleanOutput(result.stderr || result.stdout || `exit code ${result.code}`);
            return { text: `git pull 失败（${projectKey}）：\n${detail}` };
          }

          const output = cleanOutput(result.stdout || result.stderr);
          return {
            text: [`git pull 成功：${projectKey}`, output ? `输出:\n${output}` : null]
              .filter(Boolean)
              .join("\n"),
          };
        } catch (error) {
          const message = cleanOutput(error instanceof Error ? error.message : error);
          try {
            if (typeof api.logger?.error === "function") {
              api.logger.error(`gpl command failed: ${message}`);
            }
          } catch {
            // A logging compatibility problem must not hide the useful reply.
          }
          // 不标记 isError，否则部分消息渠道会把具体原因替换成通用错误。
          return { text: `GPL 执行失败：${message || "未知错误"}` };
        }
      },
    });
  },
});

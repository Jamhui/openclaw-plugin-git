# GPS for OpenClaw

一个 OpenClaw 插件，用来对配置好的 git 项目执行：

- `/gps list`：列出项目
- `/gps -m "消息"`：默认项目执行 `git add .` → `git commit -m` → `git push`
- `/gps 项目名 -m "消息"`：指定项目执行同样流程
- `/gpl`：对默认项目或指定项目执行 `git pull`

## 安装

```bash
openclaw plugins install clawhub:@Jamhui/gps
```

也可以从 npm tarball 或 git 仓库安装。

## 配置

在插件配置中为你的 QQBot 账号配置项目：

```json
{
  "accounts": {
    "<account-id>": {
      "defaultProject": "main",
      "projects": {
        "main": {
          "path": "/abs/path/to/repo",
          "remote": "origin",
          "branch": "main"
        }
      }
    }
  }
}
```

- `defaultProject` 可省略，但没有默认项目时，`/gps -m` 会要求你显式指定项目名。
- `path` 必须是 git 仓库绝对路径。

## 发布版构建

```bash
npm install
npm run build
npm pack
```

`prepack` 会在打包前自动构建 `dist/index.js`。

## 许可证

MIT

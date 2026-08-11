# OpenClaw 的 GPS 插件

一个用于管理已配置本地 Git 项目的 OpenClaw 插件。

## 功能

- `/gps list`：列出已配置项目并标记默认项目
- `/gps`：对默认项目执行 `git push`
- `/gps <project>`：对指定项目执行 `git push`
- `/gps -m "message"`：对默认项目执行 `git add .` → `git commit -m "message"` → `git push`
- `/gps <project> -m "message"`：对指定项目执行同样的 add / commit / push 流程
- `/gpl <project>`：对指定项目执行 `git pull`

## 安装

```bash
openclaw plugins install clawhub:@Jamhui/gps
```

## 配置

```json
{
  "gps": {
    "enabled": true,
    "config": {
      "accounts": {
        "account-a": {
          "defaultProject": "main",
          "projects": {
            "main": {
              "path": "/abs/path/to/repo"
            }
          }
        }
      }
    }
  }
}
```

### 字段说明

- `account-a`：替换成你自己的账号标识
- `defaultProject`：`/gps` 和 `/gps -m` 使用的默认项目键
- `projects.<name>.path`：本机上本地 Git 仓库的绝对路径
- `projects.<name>.remote`：可选，`git push` / `git pull` 使用的远程名
- `projects.<name>.branch`：可选，配合 `remote` 使用的分支名

## 用法

- `/gps list`：列出当前账号下的项目
- `/gps`：推送默认项目
- `/gps <project>`：推送指定项目
- `/gps -m "message"`：对默认项目执行添加、提交、推送
- `/gps <project> -m "message"`：对指定项目执行添加、提交、推送
- `/gpl <project>`：拉取指定项目

## 说明

- `-m` 后必须跟提交信息
- `path` 必须指向本机上的真实 Git 仓库
- 如果没有配置 `defaultProject`，`/gps` 和 `/gps -m` 都会要求显式指定项目名
- 插件只会操作已配置的本地仓库
- `/gps` 和 `/gps <project>` 只会执行 `git push`
- `/gps -m` 和 `/gps <project> -m` 会执行 `git add .` → `git commit -m` → `git push`
- `/gpl <project>` 会执行 `git pull`
- 不会执行任意 shell 命令
- 如果仓库没有改动，`/gps -m` 会在提交前停止

## 发布 / 审核说明

这个插件的能力范围刻意收窄：它只会对 OpenClaw 中显式配置的仓库执行 Git 操作。它不会克隆仓库，不会抓取远程脚本，不会访问配置路径之外的文件系统，也不会执行任意 shell 命令。

`/gps` 和 `/gps <project>` 会调用 `git push`；当提供 `-m` 时，会调用 `git add .` → `git commit` → `git push`。这也是安全扫描器可能把它标记为高风险的主要原因，尽管它的行为是可控且可审计的。

## 构建与打包

```bash
npm install
npm run build
npm pack
```

`prepack` 会在打包前构建 `dist/index.js`。

## 许可证

MIT

# GPS for OpenClaw

OpenClaw plugin for managing configured git projects.

## Features

- `/gps list` — list configured projects and mark the default one
- `/gps` — push the default project
- `/gps <project>` — push the selected project
- `/gps -m "message"` — run `git add .` → `git commit -m "message"` → `git push` on the default project
- `/gps <project> -m "message"` — run the same add/commit/push flow on a selected project
- `/gpl <project>` — run `git pull` for a selected project

## Install

```bash
openclaw plugins install clawhub:@Jamhui/gps
```

## Configuration

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

### Field notes

- `account-a` — replace with your own account identifier
- `defaultProject` — default project key used by `/gps` and `/gps -m`
- `projects.<name>.path` — absolute path to a local git repository
- `projects.<name>.remote` — optional remote name used by `git push` / `git pull`
- `projects.<name>.branch` — optional branch name used together with `remote`

## Usage

- `/gps list` — list projects for the current account
- `/gps` — push the default project
- `/gps <project>` — push the selected project
- `/gps -m "message"` — add, commit, and push using the default project
- `/gps <project> -m "message"` — add, commit, and push using a specific project
- `/gpl <project>` — pull using a specific project

## Notes

- `-m` must be followed by a commit message
- `path` must point to a real git repository on this machine
- If `defaultProject` is missing, `/gps` and `/gps -m` will require an explicit project name
- The plugin only operates on configured local repositories
- `/gps` and `/gps <project>` run `git push`
- `/gps -m` and `/gps <project> -m` run `git add .` → `git commit -m` → `git push`
- `/gpl <project>` runs `git pull`
- It does not execute arbitrary shell commands
- If a repo has no changes, `/gps -m` stops before commit/push

## Publishing / review note

This plugin is intentionally narrow: it only automates git operations for repositories explicitly configured in OpenClaw settings. It does not clone repositories, fetch remote scripts, browse the filesystem outside configured paths, or run arbitrary shell commands.

The runtime calls `git push` for `/gps` and `/gps <project>`, and calls `git add .` → `git commit` → `git push` when `-m` is provided. That is the main reason a security scanner may classify the package as high-risk even though the behavior is constrained and auditable.

## Build and package

```bash
npm install
npm run build
npm pack
```

`prepack` builds `dist/index.js` before packaging.

## License

MIT

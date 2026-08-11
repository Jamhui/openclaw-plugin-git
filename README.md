# GPS for OpenClaw

OpenClaw plugin for managing configured git projects.

## Features

- `/gps list` — list configured projects and mark the default one
- `/gps -m "message"` — run `git add .` → `git commit -m "message"` → `git push` on the default project
- `/gps <project> -m "message"` — run the same flow on a selected project
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
- `defaultProject` — default project key used by `/gps -m`
- `projects.<name>.path` — absolute path to a local git repository

## Usage

- `/gps list` — list projects for the current account
- `/gps -m "message"` — commit and push using the default project
- `/gps <project> -m "message"` — commit and push using a specific project
- `/gpl <project>` — pull using a specific project

## Notes

- `-m` must be followed by a commit message
- `path` must point to a real git repository on this machine
- If `defaultProject` is missing, `/gps -m` will require an explicit project name
- The plugin only operates on configured local repositories
- It runs `git add`, `git commit`, `git pull`, and `git push` only; it does not execute arbitrary shell commands
- If a repo has no changes, it stops before commit/push

## Publishing / review note

This plugin is intentionally narrow: it only automates git operations for repositories explicitly configured in OpenClaw settings. It does not clone repositories, fetch remote scripts, browse the filesystem outside configured paths, or run arbitrary shell commands.

The `push` step is part of the core workflow requested by the user, so the runtime must call `git` directly. That is the main reason a security scanner may classify the package as high-risk even though the behavior is constrained and auditable.

## Build and package

```bash
npm install
npm run build
npm pack
```

`prepack` builds `dist/index.js` before packaging.

## License

MIT

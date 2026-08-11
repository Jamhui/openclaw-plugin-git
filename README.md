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

## Build and package

```bash
npm install
npm run build
npm pack
```

`prepack` builds `dist/index.js` before packaging.

## License

MIT

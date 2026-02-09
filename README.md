# night-queue

Automated overnight GitHub issue solver. Run it before bed, wake up to a PR with fixes.

night-queue fetches all open issues from your repo, uses [Claude Code](https://docs.anthropic.com/en/docs/claude-code) to solve each one, and opens a pull request with a summary of what was solved, what failed, and the full changelog.

## Prerequisites

- [GitHub CLI](https://cli.github.com/) (`gh`) — authenticated
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (`claude`) — installed and configured
- `git` and `jq`

## Install

```bash
npm install -g night-queue
```

Or run directly with npx:

```bash
npx night-queue
```

## Usage

Run from inside any git repository with GitHub issues:

```bash
night-queue
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--max-retries N` | `3` | Max retry attempts per issue before marking it failed |
| `--max-turns N` | `50` | Max Claude Code turns per attempt (prevents runaway sessions) |
| `--label LABEL` | all issues | Only process issues that have this label |
| `--model MODEL` | CLI default | Claude model to use (e.g. `claude-sonnet-4-5-20250929`) |
| `-h, --help` | | Show help |

### Examples

```bash
# Solve all open issues
night-queue

# Only solve issues labeled "bug"
night-queue --label bug

# Use a specific model with more retries
night-queue --max-retries 5 --model claude-sonnet-4-5-20250929
```

## Configuration

Create a `.night-queue` file in your repo root to add custom instructions to every issue prompt:

```
Always run `npm test` after making changes.
Use TypeScript strict mode.
Never modify files in the src/legacy/ directory.
```

These instructions are appended to the prompt Claude receives for each issue. This is useful for project-specific conventions that aren't captured in `CLAUDE.md`.

## How It Works

### 1. Preflight

Verifies all dependencies are available (`gh`, `claude`, `git`, `jq`), checks that `gh` is authenticated, and ensures the git working tree is clean. Aborts immediately if anything is missing.

### 2. Label Setup

Creates three labels on the repo (skips if they already exist):

| Label | Color | Meaning |
|-------|-------|---------|
| `night-queue:in-progress` | Yellow | Currently being worked on |
| `night-queue:solved` | Green | Successfully fixed |
| `night-queue:failed` | Red | Could not be solved after all retries |

These labels let you see at a glance which issues were handled and what the outcome was.

### 3. Branch

Creates a single branch `night-queue/YYYY-MM-DD` off your default branch. All fixes for the night go into this one branch. If the branch already exists (e.g. from a previous run), a timestamp suffix is added.

### 4. Issue Processing

For each open issue (up to 200, oldest first):

- **Skip check** — issues that already have any `night-queue:*` label are skipped. Remove the label to re-process.
- **Label** — marks the issue `night-queue:in-progress`
- **Solve** — launches a fresh Claude Code process (`claude -p`) with a prompt that tells it to:
  - Read the issue via `gh issue view`
  - Explore the codebase
  - Implement a fix
  - Run existing tests
- **Evaluate** — if Claude produced file changes, they are committed. If not, the attempt is retried.
- **Retry** — on failure, the working tree is reset to the last checkpoint (`git reset --hard`) and Claude gets a completely fresh context. Up to 3 attempts per issue (configurable with `--max-retries`).
- **Label result** — marks the issue `night-queue:solved` or `night-queue:failed`

Each issue is solved sequentially so later fixes build on top of earlier ones — all in a single branch.

### 5. Pull Request

Once all issues are processed, the branch is pushed and a PR is opened with:

- **Summary table** — solved/failed/skipped counts and run duration
- **Solved issues** — table of all issues that were fixed with links
- **Failed issues** — table of issues that couldn't be solved
- **Chain logs** — collapsible per-issue logs showing Claude's full output for each attempt

If no issues were solved, no PR is created.

### Interruption Handling

If the script is interrupted (Ctrl+C, SIGTERM), it:
- Removes the `night-queue:in-progress` label from the current issue
- Marks it as `night-queue:failed`
- Prints where your commits and logs are so nothing is lost

## Logs

Full logs for each run are saved to `/tmp/night-queue-DATE-TIMESTAMP/`:

```
/tmp/night-queue-2025-03-15-220530/
├── issue-42.md             # Combined log for issue #42
├── issue-42-attempt-1.log  # Raw Claude output, attempt 1
├── issue-42-attempt-2.log  # Raw Claude output, attempt 2
├── issue-57.md
├── issue-57-attempt-1.log
└── pr-body.md              # The generated PR description
```

## License

MIT

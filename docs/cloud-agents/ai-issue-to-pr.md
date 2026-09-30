# Cloud dev environment and AI issue-to-PR workflow

Two pieces, both zero local setup:

1. **`.devcontainer/`** — GitHub Codespaces builds a cloud container with
   Node 20, Python 3.12, the GitHub CLI, and the `claude` and `codex` CLIs
   preinstalled. Open a Codespace on this repo, open a terminal, run
   `claude` (or `codex`), and start working immediately.
2. **`.github/workflows/ai-pr.yml`** — labeling an issue `claude-task` runs
   Claude Code unattended in a throwaway CI container, and it opens a draft
   pull request if it made a change.

## Why this isn't "any issue opens a PR"

This repo is public. A workflow that ran on every issue *opened by anyone*
would let any visitor on GitHub spend this repo's Anthropic API budget, and
would run an agent against text they fully control while holding a token
that can write to the repo — a textbook prompt-injection setup. Several
things bound that risk here, stacked rather than relied on individually:

- **Only a maintainer can start it.** The job requires both the
  `claude-task` label (applying a label needs triage or write access, not
  just an account) *and* the issue's author having `OWNER`, `MEMBER`, or
  `COLLABORATOR` association with the repo. A maintainer mislabeling a
  stranger's issue still doesn't trigger it.
- **The job that runs Claude never holds a write token.** The workflow is
  split into two jobs. `propose-change` checks out the repo with
  `contents: read` only, runs Claude against the issue text, and uploads
  whatever it changed as a plain patch file — that's all it can do. A
  second job, `open-pr`, which never runs any untrusted prompt, downloads
  that patch, applies it, and is the only place `contents: write`,
  `pull-requests: write`, and `issues: write` exist. Even a fully
  successful prompt injection against the first job inherits read-only
  access to one checkout and nothing else — it can't push, comment, open a
  PR, or reach any other job's token.
- **No shell access for the untrusted step.** Claude runs with
  `--allowedTools "Read Edit Write Glob Grep"` instead of
  `--dangerously-skip-permissions`. It can read and edit files in the
  checkout; it cannot run Bash, fetch a URL, or do anything else that
  could exfiltrate the `ANTHROPIC_API_KEY` available in that step. This
  also means it can't run this project's own tests itself — that's fine,
  since `ci.yml` already runs them on the resulting PR, which is the real
  check anyway, not a self-report from the agent that produced the diff.
- **The result is always a draft PR, never a merge.** `open-pr`'s token can
  open a PR and comment; it cannot approve or merge one, and the workflow
  never attempts to. A human reads the diff before anything lands on
  `main`.

The issue title and body are still untrusted text even from a trusted
author's account (an issue can quote or link to text someone else wrote),
so on top of all of the above:

- Neither job ever inlines the title/body into a shell command via
  `${{ }}` — `propose-change` reads them through `gh issue view` into
  files first, which avoids the script-injection pattern GitHub warns
  about for workflows on untrusted input.
- Claude is told explicitly that the issue text is a task request, not
  instructions that can override the rules around it, and that it must
  not touch `.github/workflows/` or `.devcontainer/`.

None of this makes it safe to point at issues from accounts you don't
trust; it makes the blast radius of a bad prompt "a patch file a human
reviews," not "a token that can act on the repository."

## One-time setup

1. **Add the API key.** Repo Settings → Secrets and variables → Actions →
   New repository secret → `ANTHROPIC_API_KEY`. Get the key from
   [console.anthropic.com](https://console.anthropic.com/settings/keys).
   Never commit it or paste it into an issue/PR.
2. **(Optional, for Codespaces)** Add `ANTHROPIC_API_KEY` and/or
   `OPENAI_API_KEY` under your GitHub account's
   [Codespaces secrets](https://github.com/settings/codespaces), scoped to
   this repo. They then appear as environment variables in every Codespace
   automatically — nothing to configure in `devcontainer.json` itself.
3. **Create the label once**: `gh label create claude-task --color 5319E7
   --description "Triggers the AI issue-to-PR workflow"` (or create it from
   the Issues → Labels UI).

## Using it

1. Open an issue describing the change, as concretely as you would brief a
   contractor (what file/behavior, what the correct outcome looks like).
2. Add the `claude-task` label.
3. Watch the Actions tab. On success, a draft PR appears and the bot
   comments on the issue with a link; on failure or a no-op, it comments
   explaining that instead of failing silently.
4. Review the diff like any other contributor's PR — run it locally, read
   the tests it touched, and mark it ready for review yourself before
   merging.

## Extending to Codex

The same label-gated, two-job, no-write-token-in-the-agent-step pattern
works for OpenAI's Codex CLI: add an `OPENAI_API_KEY` repository secret,
install `@openai/codex` in `propose-change`, and swap the `claude --print
--allowedTools "Read Edit Write Glob Grep" "$PROMPT"` line for the
equivalent restricted, non-interactive Codex invocation. Kept out of this
workflow for now so there's exactly one agent's permissions and blast
radius to reason about at a time.

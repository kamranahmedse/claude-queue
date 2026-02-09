#!/usr/bin/env bash
#
# night-queue - Automated overnight GitHub issue solver
#
# Fetches all open issues from the current repo, uses Claude Code CLI
# to solve each one, and opens a PR in the morning with everything.
#
# Usage:
#   night-queue [options]
#
# Options:
#   --max-retries N    Max retries per issue (default: 3)
#   --max-turns N      Max Claude turns per attempt (default: 50)
#   --label LABEL      Only process issues with this label
#   --model MODEL      Claude model to use
#   -v, --version      Show version
#   -h, --help         Show this help message

set -euo pipefail

VERSION=$(node -p "require('$(dirname "$0")/package.json').version" 2>/dev/null || echo "unknown")

MAX_RETRIES=3
MAX_TURNS=50
ISSUE_FILTER=""
MODEL_FLAG=""
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%H%M%S)
BRANCH="night-queue/${DATE}"
LOG_DIR="/tmp/night-queue-${DATE}-${TIMESTAMP}"

LABEL_PROGRESS="night-queue:in-progress"
LABEL_SOLVED="night-queue:solved"
LABEL_FAILED="night-queue:failed"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

declare -a SOLVED_ISSUES=()
declare -a FAILED_ISSUES=()
declare -a SKIPPED_ISSUES=()
CURRENT_ISSUE=""
START_TIME=$(date +%s)

while [[ $# -gt 0 ]]; do
    case $1 in
        --max-retries) MAX_RETRIES="$2"; shift 2 ;;
        --max-turns)   MAX_TURNS="$2";   shift 2 ;;
        --label)       ISSUE_FILTER="$2"; shift 2 ;;
        --model)       MODEL_FLAG="--model $2"; shift 2 ;;
        -v|--version)  echo "night-queue v${VERSION}"; exit 0 ;;
        -h|--help)     head -16 "$0" | tail -14; exit 0 ;;
        *)             echo "Unknown option: $1"; exit 1 ;;
    esac
done

log()         { echo -e "${DIM}$(date +%H:%M:%S)${NC} ${BLUE}[night-queue]${NC} $1"; }
log_success() { echo -e "${DIM}$(date +%H:%M:%S)${NC} ${GREEN}[night-queue]${NC} $1"; }
log_warn()    { echo -e "${DIM}$(date +%H:%M:%S)${NC} ${YELLOW}[night-queue]${NC} $1"; }
log_error()   { echo -e "${DIM}$(date +%H:%M:%S)${NC} ${RED}[night-queue]${NC} $1"; }
log_header()  { echo -e "\n${BOLD}═══ $1 ═══${NC}\n"; }

cleanup() {
    local exit_code=$?

    if [ -n "$CURRENT_ISSUE" ]; then
        log_warn "Interrupted while working on issue #${CURRENT_ISSUE}"
        gh issue edit "$CURRENT_ISSUE" --remove-label "$LABEL_PROGRESS" 2>/dev/null || true
        gh issue edit "$CURRENT_ISSUE" --add-label "$LABEL_FAILED" 2>/dev/null || true
    fi

    if [ $exit_code -ne 0 ] && [ ${#SOLVED_ISSUES[@]} -gt 0 ]; then
        log_warn "Script interrupted but ${#SOLVED_ISSUES[@]} issue(s) were solved."
        log_warn "Branch '${BRANCH}' has your commits. Push manually if needed."
    fi

    log "Logs saved to: ${LOG_DIR}"
}
trap cleanup EXIT

preflight() {
    log_header "Preflight Checks"

    local failed=false

    for cmd in gh claude git jq; do
        if command -v "$cmd" &>/dev/null; then
            log "  $cmd ... found"
        else
            log_error "  $cmd ... NOT FOUND"
            failed=true
        fi
    done

    if ! gh auth status &>/dev/null; then
        log_error "  gh auth ... not authenticated"
        failed=true
    else
        log "  gh auth ... ok"
    fi

    if ! git rev-parse --is-inside-work-tree &>/dev/null; then
        log_error "  git repo ... not inside a git repository"
        failed=true
    else
        log "  git repo ... ok"
    fi

    if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
        log_error "  working tree ... dirty (commit or stash changes first)"
        failed=true
    else
        log "  working tree ... clean"
    fi

    if [ "$failed" = true ]; then
        log_error "Preflight failed. Aborting."
        exit 1
    fi

    mkdir -p "$LOG_DIR"
    log "  log dir ... ${LOG_DIR}"
}

ensure_labels() {
    log "Creating labels (if missing)..."

    gh label create "$LABEL_PROGRESS" --color "fbca04" --description "night-queue is working on this"  --force 2>/dev/null || true
    gh label create "$LABEL_SOLVED"   --color "0e8a16" --description "Solved by night-queue"           --force 2>/dev/null || true
    gh label create "$LABEL_FAILED"   --color "d93f0b" --description "night-queue could not solve this" --force 2>/dev/null || true
}

setup_branch() {
    log_header "Branch Setup"

    local default_branch
    default_branch=$(gh repo view --json defaultBranchRef -q '.defaultBranchRef.name')
    log "Default branch: ${default_branch}"

    git fetch origin "$default_branch" --quiet

    if git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
        log_warn "Branch ${BRANCH} already exists, adding timestamp suffix"
        BRANCH="${BRANCH}-${TIMESTAMP}"
    fi

    git checkout -b "$BRANCH" "origin/${default_branch}" --quiet
    log_success "Created branch: ${BRANCH}"
}

fetch_issues() {
    local args=(--state open --json "number,title,body,labels" --limit 200)

    if [ -n "$ISSUE_FILTER" ]; then
        args+=(--label "$ISSUE_FILTER")
    fi

    gh issue list "${args[@]}"
}

process_issue() {
    local issue_number=$1
    local issue_title="$2"
    local attempt=0
    local solved=false
    local issue_log="${LOG_DIR}/issue-${issue_number}.md"
    local checkpoint
    checkpoint=$(git rev-parse HEAD)

    CURRENT_ISSUE="$issue_number"

    log_header "Issue #${issue_number}: ${issue_title}"

    gh issue edit "$issue_number" \
        --remove-label "$LABEL_SOLVED" \
        --remove-label "$LABEL_FAILED" \
        2>/dev/null || true
    gh issue edit "$issue_number" --add-label "$LABEL_PROGRESS"

    {
        echo "# Issue #${issue_number}: ${issue_title}"
        echo ""
        echo "**Started:** $(date)"
        echo ""
    } > "$issue_log"

    while [ "$attempt" -lt "$MAX_RETRIES" ] && [ "$solved" = false ]; do
        attempt=$((attempt + 1))
        log "Attempt ${attempt}/${MAX_RETRIES}"

        git reset --hard "$checkpoint" --quiet 2>/dev/null || true
        git clean -fd --quiet 2>/dev/null || true

        echo "## Attempt ${attempt}" >> "$issue_log"
        echo "" >> "$issue_log"

        local prompt
        prompt="You are an automated assistant solving a GitHub issue in this repository.

First, read the full issue details by running:
  gh issue view ${issue_number}

Then:
1. Explore the codebase to understand the project structure and conventions
2. Implement a complete, correct fix for the issue
3. Run any existing tests to verify your fix doesn't break anything
4. If tests fail because of your changes, fix them

Rules:
- Do NOT create any git commits
- Do NOT push anything
- Match the existing code style exactly
- Only change what is necessary to solve the issue

When you are done, output a line that says NIGHT_QUEUE_SUMMARY followed by a 2-3 sentence
description of what you changed and why."

        local attempt_log="${LOG_DIR}/issue-${issue_number}-attempt-${attempt}.log"
        local claude_exit=0

        # shellcheck disable=SC2086
        claude -p "$prompt" \
            --dangerously-skip-permissions \
            --max-turns "$MAX_TURNS" \
            $MODEL_FLAG \
            > "$attempt_log" 2>&1 || claude_exit=$?

        if [ "$claude_exit" -ne 0 ]; then
            log_warn "Claude exited with code ${claude_exit}"
            echo "**Claude exited with code ${claude_exit}**" >> "$issue_log"
            echo "" >> "$issue_log"
            continue
        fi

        local changed_files
        changed_files=$(git diff --name-only 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null)

        if [ -z "$changed_files" ]; then
            log_warn "No file changes detected"
            echo "**No file changes detected**" >> "$issue_log"
            echo "" >> "$issue_log"
            continue
        fi

        log_success "Changes detected in:"
        echo "$changed_files" | while IFS= read -r f; do
            log "  ${f}"
        done

        local summary
        summary=$(grep -A 20 "NIGHT_QUEUE_SUMMARY" "$attempt_log" 2>/dev/null | tail -n +2 | head -10 || echo "No summary provided.")

        {
            echo "### Summary"
            echo "$summary"
            echo ""
            echo "### Changed Files"
            echo "$changed_files" | while IFS= read -r f; do echo "- \`${f}\`"; done
            echo ""
        } >> "$issue_log"

        git add -A
        git commit -m "fix: resolve #${issue_number} - ${issue_title}

Automated fix by night-queue.
Closes #${issue_number}" --quiet

        solved=true

        log_success "Solved issue #${issue_number} on attempt ${attempt}"
    done

    gh issue edit "$issue_number" --remove-label "$LABEL_PROGRESS" 2>/dev/null || true

    {
        echo "**Finished:** $(date)"
        echo "**Status:** $([ "$solved" = true ] && echo "SOLVED" || echo "FAILED after ${MAX_RETRIES} attempts")"
    } >> "$issue_log"

    if [ "$solved" = true ]; then
        gh issue edit "$issue_number" --add-label "$LABEL_SOLVED"
        SOLVED_ISSUES+=("${issue_number}|${issue_title}")
    else
        gh issue edit "$issue_number" --add-label "$LABEL_FAILED"
        FAILED_ISSUES+=("${issue_number}|${issue_title}")
        git reset --hard "$checkpoint" --quiet 2>/dev/null || true
        git clean -fd --quiet 2>/dev/null || true
    fi

    CURRENT_ISSUE=""
}

create_pr() {
    log_header "Creating Pull Request"

    local default_branch
    default_branch=$(gh repo view --json defaultBranchRef -q '.defaultBranchRef.name')
    local elapsed=$(( $(date +%s) - START_TIME ))
    local duration
    duration="$(( elapsed / 3600 ))h $(( (elapsed % 3600) / 60 ))m $(( elapsed % 60 ))s"
    local pr_body="${LOG_DIR}/pr-body.md"
    local total_processed=$(( ${#SOLVED_ISSUES[@]} + ${#FAILED_ISSUES[@]} ))

    {
        echo "## night-queue Run Summary"
        echo ""
        echo "| Metric | Value |"
        echo "|--------|-------|"
        echo "| Date | ${DATE} |"
        echo "| Duration | ${duration} |"
        echo "| Issues processed | ${total_processed} |"
        echo "| Solved | ${#SOLVED_ISSUES[@]} |"
        echo "| Failed | ${#FAILED_ISSUES[@]} |"
        echo "| Skipped | ${#SKIPPED_ISSUES[@]} |"
        echo ""

        if [ ${#SOLVED_ISSUES[@]} -gt 0 ]; then
            echo "### Solved Issues"
            echo ""
            echo "| Issue | Title |"
            echo "|-------|-------|"
            for entry in "${SOLVED_ISSUES[@]}"; do
                local num="${entry%%|*}"
                local title="${entry#*|}"
                echo "| #${num} | ${title} |"
            done
            echo ""
        fi

        if [ ${#FAILED_ISSUES[@]} -gt 0 ]; then
            echo "### Failed Issues"
            echo ""
            echo "| Issue | Title |"
            echo "|-------|-------|"
            for entry in "${FAILED_ISSUES[@]}"; do
                local num="${entry%%|*}"
                local title="${entry#*|}"
                echo "| #${num} | ${title} |"
            done
            echo ""
        fi

        echo "---"
        echo ""
        echo "### Chain Logs"
        echo ""

        for log_file in "${LOG_DIR}"/issue-*.md; do
            if [ ! -f "$log_file" ]; then
                continue
            fi

            local issue_num
            issue_num=$(basename "$log_file" | grep -oE '[0-9]+')

            echo "<details>"
            echo "<summary>Issue #${issue_num} Log</summary>"
            echo ""
            head -c 40000 "$log_file"
            echo ""
            echo "</details>"
            echo ""
        done
    } > "$pr_body"

    local body_size
    body_size=$(wc -c < "$pr_body")
    if [ "$body_size" -gt 60000 ]; then
        log_warn "PR body is ${body_size} bytes, truncating to fit GitHub limits"
        head -c 59000 "$pr_body" > "${pr_body}.tmp"
        {
            echo ""
            echo ""
            echo "---"
            echo "*Log truncated. Full logs available at: ${LOG_DIR}*"
        } >> "${pr_body}.tmp"
        mv "${pr_body}.tmp" "$pr_body"
    fi

    git push origin "$BRANCH" --quiet
    log_success "Pushed branch to origin"

    local pr_url
    pr_url=$(gh pr create \
        --base "$default_branch" \
        --head "$BRANCH" \
        --title "night-queue: Automated fixes (${DATE})" \
        --body-file "$pr_body")

    log_success "Pull request created: ${pr_url}"
}

main() {
    echo -e "${BOLD}"
    echo '        _       _     _                                  '
    echo '  _ __ (_) __ _| |__ | |_       __ _ _   _  ___ _   _  ___'
    echo ' | '"'"'_ \| |/ _` | '"'"'_ \| __| ___/ _` | | | |/ _ \ | | |/ _ \'
    echo ' | | | | | (_| | | | | |_|___| (_| | |_| |  __/ |_| |  __/'
    echo ' |_| |_|_|\__, |_| |_|\__|    \__, |\__,_|\___|\__,_|\___|'
    echo '          |___/                   |_|                     '
    echo -e "${NC}"
    echo -e "  ${DIM}Automated overnight issue solver${NC}"
    echo ""

    preflight
    ensure_labels
    setup_branch

    log_header "Fetching Issues"

    local issues
    issues=$(fetch_issues)
    local total
    total=$(echo "$issues" | jq length)

    if [ "$total" -eq 0 ]; then
        log "No open issues found. Going back to sleep."
        exit 0
    fi

    log "Found ${total} open issue(s)"

    for i in $(seq 0 $((total - 1))); do
        local number title labels
        number=$(echo "$issues" | jq -r ".[$i].number")
        title=$(echo "$issues" | jq -r ".[$i].title")
        labels=$(echo "$issues" | jq -r "[.[$i].labels[].name] | join(\",\")" 2>/dev/null || echo "")

        if echo "$labels" | grep -q "night-queue:"; then
            log "Skipping #${number} (already has a night-queue label)"
            SKIPPED_ISSUES+=("${number}|${title}")
            continue
        fi

        process_issue "$number" "$title" || true
    done

    if [ ${#SOLVED_ISSUES[@]} -gt 0 ]; then
        create_pr
    else
        log_warn "No issues were solved. No PR created."
    fi

    log_header "night-queue Complete"

    local elapsed=$(( $(date +%s) - START_TIME ))
    log "Duration: $(( elapsed / 3600 ))h $(( (elapsed % 3600) / 60 ))m $(( elapsed % 60 ))s"
    log_success "Solved: ${#SOLVED_ISSUES[@]}"
    if [ ${#FAILED_ISSUES[@]} -gt 0 ]; then
        log_error "Failed: ${#FAILED_ISSUES[@]}"
    fi
    if [ ${#SKIPPED_ISSUES[@]} -gt 0 ]; then
        log_warn "Skipped: ${#SKIPPED_ISSUES[@]}"
    fi
    log "Logs: ${LOG_DIR}"
}

main "$@"

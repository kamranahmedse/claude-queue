.PHONY: help install build dev setup clean build-package publish

# Port for development
DEV_PORT := 3334

# Paths
SKILLS_SRC := $(PWD)/skills
SKILLS_DEST := $(HOME)/.claude/skills
CLAUDE_SETTINGS := $(HOME)/.claude.json

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

# ============ Development ============

install: ## Install dependencies
	pnpm install

build: ## Build all packages
	pnpm build

setup: install build install-skills install-mcp ## Full development setup
	@echo "\n✓ Setup complete! Run 'make dev' to start dev server"

dev: ## Start dev server + UI with hot reload
	@echo ""
	@echo "  ┌─────────────────────────────────────────────────────┐"
	@echo "  │  Open http://localhost:5173 in your browser         │"
	@echo "  │  (Port 3334 is the API server - don't use directly) │"
	@echo "  └─────────────────────────────────────────────────────┘"
	@echo ""
	PORT=$(DEV_PORT) pnpm dev

clean: ## Clean build artifacts and node_modules
	rm -rf node_modules packages/*/node_modules packages/*/dist
	@echo "✓ Cleaned"

# ============ Internal targets ============

install-skills:
	@mkdir -p $(SKILLS_DEST)/kanban $(SKILLS_DEST)/kanban-dev
	@cp -r $(SKILLS_SRC)/kanban/* $(SKILLS_DEST)/kanban/
	@cp -r $(SKILLS_SRC)/kanban-dev/* $(SKILLS_DEST)/kanban-dev/
	@echo "✓ Skills installed to $(SKILLS_DEST)"

install-mcp:
	@if [ ! -f $(CLAUDE_SETTINGS) ]; then echo '{}' > $(CLAUDE_SETTINGS); fi
	@node -e '\
		const fs = require("fs"); \
		const settings = JSON.parse(fs.readFileSync("$(CLAUDE_SETTINGS)", "utf-8")); \
		settings.mcpServers = settings.mcpServers || {}; \
		settings.mcpServers["claude-board-dev"] = { \
			type: "stdio", \
			command: "node", \
			args: ["$(PWD)/packages/mcp/dist/index.js"], \
			env: { KANBAN_SERVER_URL: "http://localhost:$(DEV_PORT)" } \
		}; \
		fs.writeFileSync("$(CLAUDE_SETTINGS)", JSON.stringify(settings, null, 2)); \
	'
	@echo "✓ MCP 'claude-board-dev' configured (port $(DEV_PORT))"

# ============ Publishing ============

build-package: ## Build npm package for publishing
	@echo "Building npm package..."
	cd packages/cli && node scripts/build.js

publish: build-package ## Publish to npm (requires npm login)
	@echo "\nPublishing to npm..."
	cd packages/cli && npm publish
	@echo "\n✓ Published claude-board to npm!"

.PHONY: help install build dev dev-server dev-ui start clean typecheck \
        install-skills watch-skills setup setup-dev test-api \
        build-package publish publish-dry-run

# Ports
DEV_PORT := 3334
PROD_PORT := 3333

# Paths
SKILLS_SRC := $(PWD)/skills
SKILLS_DEST := $(HOME)/.claude/skills
CLAUDE_SETTINGS := $(HOME)/.claude.json

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ============ Setup ============

install: ## Install dependencies
	pnpm install

build: ## Build all packages
	pnpm build

setup: install build install-skills install-mcp ## Full production setup
	@echo "\n✓ Setup complete! Run 'make start' to start the server"

setup-dev: install build install-skills install-mcp-dev ## Full development setup
	@echo "\n✓ Dev setup complete! Run 'make dev' to start dev server"

clean: ## Clean build artifacts and node_modules
	rm -rf node_modules packages/*/node_modules packages/*/dist
	@echo "✓ Cleaned"

# ============ Development ============

dev: ## Start dev server (port 3334) + UI with hot reload
	PORT=$(DEV_PORT) pnpm dev

dev-server: ## Start only dev server with hot reload
	PORT=$(DEV_PORT) pnpm dev:server

dev-ui: ## Start only UI dev server
	pnpm dev:ui

# ============ Production ============

start: ## Start production server (port 3333)
	PORT=$(PROD_PORT) node packages/server/dist/index.js

# ============ Skills ============

install-skills: ## Copy skills to ~/.claude/skills/
	@mkdir -p $(SKILLS_DEST)/kanban $(SKILLS_DEST)/kanban-dev
	@cp -r $(SKILLS_SRC)/kanban/* $(SKILLS_DEST)/kanban/
	@cp -r $(SKILLS_SRC)/kanban-dev/* $(SKILLS_DEST)/kanban-dev/
	@echo "✓ Skills installed to $(SKILLS_DEST)"
	@ls -la $(SKILLS_DEST)/kanban/ $(SKILLS_DEST)/kanban-dev/

watch-skills: ## Watch and auto-copy skills on change
	@echo "Watching $(SKILLS_SRC) for changes..."
	@echo "Press Ctrl+C to stop"
	@while true; do \
		fswatch -1 $(SKILLS_SRC) && \
		cp -r $(SKILLS_SRC)/kanban/* $(SKILLS_DEST)/kanban/ && \
		cp -r $(SKILLS_SRC)/kanban-dev/* $(SKILLS_DEST)/kanban-dev/ && \
		echo "✓ Skills updated at $$(date +%H:%M:%S)"; \
	done

# ============ MCP Config ============

install-mcp: ## Configure MCP for production (port 3333)
	@if [ ! -f $(CLAUDE_SETTINGS) ]; then echo '{}' > $(CLAUDE_SETTINGS); fi
	@node -e '\
		const fs = require("fs"); \
		const settings = JSON.parse(fs.readFileSync("$(CLAUDE_SETTINGS)", "utf-8")); \
		settings.mcpServers = settings.mcpServers || {}; \
		settings.mcpServers["claude-kanban"] = { \
			type: "stdio", \
			command: "node", \
			args: ["$(PWD)/packages/mcp/dist/index.js"], \
			env: { KANBAN_SERVER_URL: "http://localhost:$(PROD_PORT)" } \
		}; \
		fs.writeFileSync("$(CLAUDE_SETTINGS)", JSON.stringify(settings, null, 2)); \
	'
	@echo "✓ MCP 'claude-kanban' configured (port $(PROD_PORT))"

install-mcp-dev: ## Configure MCP for development (port 3334)
	@if [ ! -f $(CLAUDE_SETTINGS) ]; then echo '{}' > $(CLAUDE_SETTINGS); fi
	@node -e '\
		const fs = require("fs"); \
		const settings = JSON.parse(fs.readFileSync("$(CLAUDE_SETTINGS)", "utf-8")); \
		settings.mcpServers = settings.mcpServers || {}; \
		settings.mcpServers["claude-kanban-dev"] = { \
			type: "stdio", \
			command: "node", \
			args: ["$(PWD)/packages/mcp/dist/index.js"], \
			env: { KANBAN_SERVER_URL: "http://localhost:$(DEV_PORT)" } \
		}; \
		fs.writeFileSync("$(CLAUDE_SETTINGS)", JSON.stringify(settings, null, 2)); \
	'
	@echo "✓ MCP 'claude-kanban-dev' configured (port $(DEV_PORT))"

uninstall-mcp: ## Remove MCP configurations
	@node -e '\
		const fs = require("fs"); \
		if (!fs.existsSync("$(CLAUDE_SETTINGS)")) process.exit(0); \
		const settings = JSON.parse(fs.readFileSync("$(CLAUDE_SETTINGS)", "utf-8")); \
		if (settings.mcpServers) { \
			delete settings.mcpServers["claude-kanban"]; \
			delete settings.mcpServers["claude-kanban-dev"]; \
			fs.writeFileSync("$(CLAUDE_SETTINGS)", JSON.stringify(settings, null, 2)); \
		} \
	'
	@echo "✓ MCP configs removed"

# ============ Testing ============

typecheck: ## Run TypeScript type checking
	pnpm typecheck

test-api: ## Test API endpoints (requires running server)
	@echo "Testing health endpoint..."
	@curl -s http://localhost:$(DEV_PORT)/api/health | jq . || curl -s http://localhost:$(PROD_PORT)/api/health | jq .

# ============ Logs ============

logs: ## View server logs
	@tail -f $(HOME)/.claude-kanban/server.log 2>/dev/null || echo "No logs found. Start server with --detach first."

# ============ Publishing ============

build-package: ## Build the npm package for publishing
	@echo "Building npm package..."
	cd packages/cli && node scripts/build.js

publish-dry-run: build-package ## Test publishing without actually publishing
	@echo "\nDry run publishing..."
	cd packages/cli && npm publish --dry-run
	@echo "\n✓ Dry run complete. Run 'make publish' to actually publish."

publish: build-package ## Publish to npm (requires npm login)
	@echo "\nPublishing to npm..."
	cd packages/cli && npm publish
	@echo "\n✓ Published claude-kanban to npm!"

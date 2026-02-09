.PHONY: patch minor major publish

patch:
	npm version patch --no-git-tag-version
	@echo "Bumped to $$(node -p "require('./package.json').version")"

minor:
	npm version minor --no-git-tag-version
	@echo "Bumped to $$(node -p "require('./package.json').version")"

major:
	npm version major --no-git-tag-version
	@echo "Bumped to $$(node -p "require('./package.json').version")"

publish: patch
	git add -A
	git commit -m "v$$(node -p "require('./package.json').version")"
	git tag "v$$(node -p "require('./package.json').version")"
	npm publish
	git push origin main --tags
	@echo "Published v$$(node -p "require('./package.json').version")"

publish-minor: minor
	git add -A
	git commit -m "v$$(node -p "require('./package.json').version")"
	git tag "v$$(node -p "require('./package.json').version")"
	npm publish
	git push origin main --tags
	@echo "Published v$$(node -p "require('./package.json').version")"

publish-major: major
	git add -A
	git commit -m "v$$(node -p "require('./package.json').version")"
	git tag "v$$(node -p "require('./package.json').version")"
	npm publish
	git push origin main --tags
	@echo "Published v$$(node -p "require('./package.json').version")"

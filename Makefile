build:
	rm ./sayly.zip && pn build:zip

# make release [TYPE=patch|minor|major]: bump the version and push a tag that publishes it
TYPE ?= patch
release:
	bash scripts/release.sh $(TYPE)

.PHONY: build release

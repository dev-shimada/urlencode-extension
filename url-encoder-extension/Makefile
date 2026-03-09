.PHONY: all setup build package clean help

# デフォルトターゲット
all: build

## setup: Node.js / make / zip を自動インストール (Debian/Ubuntu)
setup:
	bash dev.sh setup

## build: TypeScriptをコンパイルし dist/ を生成する
build:
	bash dev.sh build

## package: .zip を release/ に生成する
package:
	bash dev.sh package

## clean: dist/ と release/ を削除する
clean:
	bash dev.sh clean

## help: このヘルプを表示する
help:
	@grep -E '^## ' Makefile | sed 's/^## /  /'

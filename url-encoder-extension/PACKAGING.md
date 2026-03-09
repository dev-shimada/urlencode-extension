# パッケージング手順

## 前提条件

Debian / Ubuntu 環境で動作します。必要なツール (Node.js / make / zip) は `setup` コマンドで自動インストールできます。

## ローカルでのビルドとパッケージング

### dev.sh を使う方法 (推奨)

```bash
# 初回: 必要なツールをインストール (Node.js / make / zip)
./dev.sh setup

# ビルド
./dev.sh build

# パッケージング (.zip)
./dev.sh package

# dist/ と release/ を削除
./dev.sh clean
```

### make を使う方法

```bash
make setup
make build
make package
make clean
```

### npm scripts を使う方法

```bash
npm run build
npm run package
```

`release/` ディレクトリに以下のファイルが生成されます。

```
release/
  url-encoder-extension.zip   # Web Store 提出用 / アンパック読み込み用
```

## インストール方法

### Chrome Web Store (推奨)

*(審査通過後に利用可能)*

### 手動インストール (.zip / アンパック)

1. `url-encoder-extension.zip` をダウンロードして解凍
2. Chrome で `chrome://extensions/` を開く
3. **デベロッパーモード** をオンにする
4. **パッケージ化されていない拡張機能を読み込む** → 解凍したフォルダを選択

## GitHub Actions による自動リリース

バージョンタグをプッシュすると自動的に `.zip` がリリースに添付されます。

```bash
git tag v1.0.0
git push origin v1.0.0
```

ワークフローファイル: `.github/workflows/release.yml`

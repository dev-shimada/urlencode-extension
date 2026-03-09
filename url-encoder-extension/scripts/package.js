#!/usr/bin/env node
/**
 * Chrome拡張機能のパッケージングスクリプト
 *
 * 生成物:
 *   - release/url-encoder-extension.zip  (Web Store提出用 / アンパック読み込み用)
 *
 * 使い方:
 *   node scripts/package.js
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIST_DIR = path.join(ROOT, "dist");
const RELEASE_DIR = path.join(ROOT, "release");
const OUT_ZIP = path.join(RELEASE_DIR, "url-encoder-extension.zip");

// --- zip生成 ---
function createZip(sourceDir, outPath) {
  const zipResult = spawnSync("zip", ["-r", outPath, "."], {
    cwd: sourceDir,
    encoding: "utf8",
  });
  if (zipResult.status === 0) {
    return;
  }
  throw new Error("zip コマンドが見つかりません。\n  sudo apt-get install -y zip  でインストールしてください。");
}

// --- メイン ---
function main() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error("Error: dist/ ディレクトリが見つかりません。先に npm run build を実行してください。");
    process.exit(1);
  }

  if (!fs.existsSync(RELEASE_DIR)) {
    fs.mkdirSync(RELEASE_DIR, { recursive: true });
  }

  console.log("[1/1] .zip を生成中...");
  if (fs.existsSync(OUT_ZIP)) fs.unlinkSync(OUT_ZIP);
  createZip(DIST_DIR, OUT_ZIP);
  console.log(`  生成: ${OUT_ZIP}`);

  const zipSize = (fs.statSync(OUT_ZIP).size / 1024).toFixed(1);
  console.log("\n===== パッケージング完了 =====");
  console.log(`  ${path.relative(ROOT, OUT_ZIP)} (${zipSize} KB)`);
}

main();

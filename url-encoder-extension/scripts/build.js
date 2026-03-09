const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "..");
const distDir = path.join(__dirname, "..", "dist");

// distディレクトリが存在しない場合は作成
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// コピーするファイル一覧
const filesToCopy = [
  "manifest.json",
  "popup.html",
  "popup.css",
];

// ファイルをdistにコピー
filesToCopy.forEach((file) => {
  const src = path.join(srcDir, file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${file}`);
  } else {
    console.warn(`Warning: ${file} not found`);
  }
});

// TypeScriptのコンパイル結果 (popup.js) をdistのルートに配置
const compiledJs = path.join(distDir, "popup.js");
const srcJs = path.join(distDir, "popup.js");

// TSCがsrc/popup.tsをdist/popup.jsに出力するので、そのままにする
// ただしdist内にsrc/が作られるので、dist/src/popup.js -> dist/popup.jsに移動
const tscOutput = path.join(distDir, "src", "popup.js");
if (fs.existsSync(tscOutput)) {
  fs.copyFileSync(tscOutput, compiledJs);
  console.log("Moved: dist/src/popup.js -> dist/popup.js");
}

// アイコンディレクトリのコピー
const iconsDir = path.join(srcDir, "icons");
const distIconsDir = path.join(distDir, "icons");
if (fs.existsSync(iconsDir)) {
  if (!fs.existsSync(distIconsDir)) {
    fs.mkdirSync(distIconsDir);
  }
  const icons = fs.readdirSync(iconsDir);
  icons.forEach((icon) => {
    fs.copyFileSync(
      path.join(iconsDir, icon),
      path.join(distIconsDir, icon)
    );
    console.log(`Copied icon: ${icon}`);
  });
}

console.log("\nBuild complete! Load the 'dist' directory as an unpacked extension in Chrome.");

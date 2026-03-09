import fs from "fs";
import path from "path";

const srcDir = path.join(__dirname, "..");
const distDir = path.join(__dirname, "..", "dist");

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const filesToCopy = ["manifest.json", "popup.html", "popup.css"];

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

// TSC が src/popup.ts を dist/src/popup.js に出力する場合、dist/popup.js へ移動
const tscOutput = path.join(distDir, "src", "popup.js");
const compiledJs = path.join(distDir, "popup.js");
if (fs.existsSync(tscOutput)) {
  fs.copyFileSync(tscOutput, compiledJs);
  console.log("Moved: dist/src/popup.js -> dist/popup.js");
}

const iconsDir = path.join(srcDir, "icons");
const distIconsDir = path.join(distDir, "icons");
if (fs.existsSync(iconsDir)) {
  if (!fs.existsSync(distIconsDir)) {
    fs.mkdirSync(distIconsDir);
  }
  fs.readdirSync(iconsDir).forEach((icon) => {
    fs.copyFileSync(path.join(iconsDir, icon), path.join(distIconsDir, icon));
    console.log(`Copied icon: ${icon}`);
  });
}

console.log("\nBuild complete! Load the 'dist' directory as an unpacked extension in Chrome.");

#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const iconsDir = path.join(root, "icons");
const source = path.join(iconsDir, "maskit-icon-source.png");

if (!fs.existsSync(source)) {
  console.error("Missing icons/maskit-icon-source.png");
  process.exit(1);
}

if (process.platform === "win32") {
  const script = `
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile('${source.replace(/'/g, "''")}')
foreach ($size in 16,48,128) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($src, 0, 0, $size, $size)
  $bmp.Save('${iconsDir.replace(/'/g, "''")}\\icon' + $size + '.png', [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
$src.Dispose()
`;
  execSync(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`, {
    stdio: "inherit"
  });
} else {
  execSync(
    `for size in 16 48 128; do sips -z $size $size "${source}" --out "${iconsDir}/icon$size.png"; done`,
    { stdio: "inherit", shell: "/bin/bash" }
  );
}

console.log("Icons generated: icon16.png, icon48.png, icon128.png");

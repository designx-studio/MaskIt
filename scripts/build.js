#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const pkg = require(path.join(root, "package.json"));
const extensionFiles = ["manifest.json", "settings.js", "browser-rules.js", "detector.js", "sanitizer.js", "editors.js", "content.js", "background.js", "popup.html", "popup.css", "popup.js", "options.html", "options.css", "options.js", "privacy-policy.html", "icons/icon16.png", "icons/icon48.png", "icons/icon128.png"];
function rmrf(target){if(fs.existsSync(target))fs.rmSync(target,{recursive:true,force:true})}
function copyFile(relPath,destDir){const src=path.join(root,relPath),dest=path.join(destDir,relPath);if(!fs.existsSync(src))throw new Error(`Missing required file: ${relPath}`);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest)}
function copyDir(relDir,destDir){const src=path.join(root,relDir),dest=path.join(destDir,relDir);if(!fs.existsSync(src))throw new Error(`Missing required directory: ${relDir}`);fs.cpSync(src,dest,{recursive:true})}
function zipDir(source,outZip){execFileSync("zip",["-qr",outZip,"."],{cwd:source,stdio:"inherit"})}
function buildExtension(name,modifier){const staging=path.join(distDir,`maskit-${name}`),out=path.join(distDir,`maskit-${name}.zip`);rmrf(staging);fs.mkdirSync(staging,{recursive:true});extensionFiles.forEach(file=>copyFile(file,staging));const manifestPath=path.join(staging,"manifest.json");const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));manifest.version=pkg.version;if(modifier)modifier(manifest);fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+"\n");zipDir(staging,out);rmrf(staging)}
function buildMcp(){const staging=path.join(distDir,"maskit-mcp"),out=path.join(distDir,"maskit-mcp.tar.gz");rmrf(staging);fs.mkdirSync(staging,{recursive:true});copyDir("mcp-server",staging);copyDir("engine",staging);copyDir("maskit-core",staging);if(fs.existsSync(path.join(root,"CORE_CONTRACT.md")))copyFile("CORE_CONTRACT.md",staging);execFileSync("tar",["-czf",out,"-C",distDir,"maskit-mcp"],{stdio:"inherit"});rmrf(staging)}
execFileSync(process.execPath, [path.join(__dirname, "generate-browser-rules.js")], { stdio: "inherit" });
rmrf(distDir);fs.mkdirSync(distDir,{recursive:true});
buildExtension("chrome");buildExtension("edge");buildExtension("opera");buildExtension("firefox",manifest=>{manifest.browser_specific_settings={gecko:{id:"maskit@maskit.local",strict_min_version:"109.0"}}});buildExtension("extension");buildMcp();
console.log("Built browser and MCP artifacts.");

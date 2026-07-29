# MaskIt MSI Builder script
# Publishes MaskIt.Agent and bundles it into an MSI installer using WiX.

$ErrorActionPreference = "Stop"

# Define signing variables (Task 3)
$SIGNING_ENABLED = if ($env:SIGNING_ENABLED) { $env:SIGNING_ENABLED -eq "true" } else { $false }
$CERTIFICATE_PATH = $env:CERTIFICATE_PATH
$CERTIFICATE_PASSWORD = $env:CERTIFICATE_PASSWORD

Write-Host "--- MaskIt MSI Build Process Started ---"
Write-Host "Signing Enabled: $SIGNING_ENABLED"

# Paths
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Resolve-Path (Join-Path $scriptDir "..")
$projectPath = Join-Path $rootDir "maskit-agent\Maskit.Agent\Maskit.Agent.csproj"
$publishDir = Join-Path $rootDir "dist\maskit-windows-agent\publish"
$wxsPath = Join-Path $scriptDir "MaskIt.Agent.wxs"
$outMsi = Join-Path $rootDir "dist\MaskIt.Agent.msi"

# 1. Publish Windows Agent
Write-Host "Publishing MaskIt Agent in Release mode..."
if (Test-Path $publishDir) {
    Remove-Item $publishDir -Recurse -Force
}
dotnet publish $projectPath -c Release -o $publishDir -r win-x64 --self-contained false

# Ensure the rules folder is present next to the executable
Write-Host "Syncing shared rules..."
$rulesDest = Join-Path $publishDir "maskit-core\rules"
New-Item -ItemType Directory -Path $rulesDest -Force | Out-Null
Copy-Item (Join-Path $rootDir "maskit-core\rules\*") $rulesDest -Force

# 2. Check for WiX Toolset
$wixType = "none"
if (Get-Command candle -ErrorAction SilentlyContinue) {
    $wixType = "v3"
    Write-Host "Found WiX Toolset v3 (candle/light)."
} elseif (Get-Command wix -ErrorAction SilentlyContinue) {
    $wixType = "v4"
    Write-Host "Found WiX Toolset v4 (wix)."
} else {
    Write-Host "WiX Toolset not found in PATH. Installing WiX Toolset v4 via dotnet tool..."
    try {
        dotnet tool install --global wix | Out-Null
        $env:PATH += ";$HOME\.dotnet\tools"
        if (Get-Command wix -ErrorAction SilentlyContinue) {
            $wixType = "v4"
            Write-Host "Successfully installed and verified WiX Toolset v4."
        } else {
            throw "Failed to locate 'wix' command after installation."
        }
    } catch {
        Write-Error "Could not install WiX. Please ensure .NET SDK is fully operational."
        exit 1;
    }
}

# 3. Build MSI using WiX
if ($wixType -eq "v3") {
    Write-Host "Compiling installer using WiX v3..."
    $wixObj = Join-Path $scriptDir "MaskIt.Agent.wixobj"
    & candle -nologo -out $wixObj $wxsPath -dPublishDir=$publishDir
    & light -nologo -out $outMsi $wixObj -ext WixUtilExtension
    if (Test-Path $wixObj) { Remove-Item $wixObj -Force }
} elseif ($wixType -eq "v4") {
    Write-Host "Converting and compiling installer using WiX v4..."
    $v4Wxs = Join-Path $scriptDir "MaskIt.Agent.v4.wxs"
    if (Test-Path $v4Wxs) { Remove-Item $v4Wxs -Force }
    
    # Copy file and convert in-place
    Copy-Item $wxsPath $v4Wxs -Force
    & wix convert $v4Wxs
    
    # Ensure the util extension is added/registered
    & wix extension add WixToolset.Util.wixext | Out-Null
    
    # Build MSI (options placed before source file)
    & wix build -ext WixToolset.Util.wixext -d PublishDir=$publishDir -o $outMsi $v4Wxs
    
    if (Test-Path $v4Wxs) { Remove-Item $v4Wxs -Force }
}

Write-Host "MSI compiled successfully: $outMsi"

# 4. Handle Code Signing (Task 3)
if ($SIGNING_ENABLED) {
    if ([string]::IsNullOrWhiteSpace($CERTIFICATE_PATH) -or !(Test-Path $CERTIFICATE_PATH)) {
        Write-Warning "Code signing requested, but CERTIFICATE_PATH is invalid or missing: $CERTIFICATE_PATH"
    } else {
        Write-Host "Signing the MSI package..."
        # Locate signtool
        $signtool = Get-Command signtool -ErrorAction SilentlyContinue
        if ($signtool) {
            & signtool sign /f $CERTIFICATE_PATH /p $CERTIFICATE_PASSWORD /tr http://timestamp.digicert.com /td sha256 /fd sha256 $outMsi
            Write-Host "MSI signed successfully."
        } else {
            Write-Warning "signtool.exe was not found in PATH. Skipping signing."
        }
    }
} else {
    Write-Host "Code signing is disabled (evaluation/unsigned build)."
}

Write-Host "--- MaskIt MSI Build Completed Successfully ---"

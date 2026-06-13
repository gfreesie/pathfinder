# ============================================================================
#  Pathfinder — move off OneDrive + push to GitHub
#  Run this in PowerShell:  ./migrate-to-local-and-github.ps1
#  (right-click > Run with PowerShell, or run from a PowerShell window)
# ============================================================================

param(
  [string]$GitHubUser = "gfreesie",                 # <-- change if your GitHub username differs
  [string]$RepoName   = "pathfinder",
  [string]$Dest       = "$env:USERPROFILE\dev\pathfinder",
  [switch]$Private                                  # omit for a PUBLIC repo (your choice)
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false    # robocopy/git use non-zero "success" codes
$Source = $PSScriptRoot                              # this script lives in the pathfinder folder

Write-Host "==> Source: $Source"
Write-Host "==> Dest:   $Dest"

# 1. Copy the project to a plain local path (skip node_modules / dist)
New-Item -ItemType Directory -Force -Path $Dest | Out-Null
robocopy $Source $Dest /E /XD node_modules dist .git | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with code $LASTEXITCODE" }
$global:LASTEXITCODE = 0                             # robocopy codes 0-7 mean success
Set-Location $Dest

# 2. Initialise git + first commit
if (-not (Test-Path "$Dest\.git")) { git init | Out-Null }
git add .
git commit -m "Pathfinder: custom portfolio builder, dark-mode starfield, persistence, share, mobile + transition polish" | Out-Null
git branch -M main

# 3. Create the GitHub repo and push
$visibility = if ($Private) { "--private" } else { "--public" }
$hasGh = $null -ne (Get-Command gh -ErrorAction SilentlyContinue)

if ($hasGh) {
  Write-Host "==> Creating GitHub repo with gh CLI ($visibility)..."
  gh repo create $RepoName $visibility --source=. --remote=origin --push
} else {
  Write-Host "==> GitHub CLI (gh) not found."
  Write-Host "    1) Create an empty repo at https://github.com/new named '$RepoName' (no README)."
  Write-Host "    2) Then run these two lines:"
  Write-Host "         git remote add origin https://github.com/$GitHubUser/$RepoName.git"
  Write-Host "         git push -u origin main"
}

# 4. Install deps and verify the build in the clean location
Write-Host "==> Installing dependencies + building..."
npm install
npm run build

Write-Host ""
Write-Host "==> Done. Work out of: $Dest"
Write-Host "==> You can now delete the OneDrive copy of this project."

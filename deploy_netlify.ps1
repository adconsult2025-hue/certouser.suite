# Quick deploy script for Netlify (assumes Netlify CLI installed and site already linked)
Param(
  [string]$SiteDir = "/mnt/data/merge_work_20251010_194351/CERtoUSER_Suite_MERGED_20251010"
)

Write-Host "Deploying from $SiteDir"
Set-Location $SiteDir

# Optional: install deps in functions if present
if (Test-Path ".\netlify\functions\package.json") { 
  Set-Location ".\netlify\functions"
  if (-not (Test-Path "node_modules")) { npm install }
  Set-Location $SiteDir
}

# Deploy to production
netlify deploy --prod --dir="$SiteDir"
# Script to batch rename icons according to the new naming convention

# 1. Rename Panel Switches (View Controls) in LeftToolBottomBar
# Prefix: "view"
$bottomBarPath = Join-Path $PSScriptRoot "..\Asset\Icon\Layout\MainArea\ToolBar\LeftToolBar\LeftToolBottomBar"
if (Test-Path $bottomBarPath) {
    Write-Host "Processing LeftToolBottomBar..."
    Get-ChildItem -Path $bottomBarPath -Filter "*.svg" | ForEach-Object {
        # Avoid double renaming if script is run twice
        if ($_.Name -notlike "view*") {
            $newName = "view" + $_.Name
            Rename-Item -Path $_.FullName -NewName $newName
            Write-Host "  Renamed: $($_.Name) -> $newName"
        }
    }
} else {
    Write-Error "Path not found: $bottomBarPath"
}

# 2. Rename Bitmap Tools in LeftToolTopBar
# Prefix: "bitmap"
$topBarPath = Join-Path $PSScriptRoot "..\Asset\Icon\Layout\MainArea\ToolBar\LeftToolBar\LeftToolTopBar"
if (Test-Path $topBarPath) {
    Write-Host "Processing LeftToolTopBar..."
    Get-ChildItem -Path $topBarPath -Filter "*.svg" | ForEach-Object {
        # Avoid double renaming
        if ($_.Name -notlike "bitmap*") {
            $newName = "bitmap" + $_.Name
            Rename-Item -Path $_.FullName -NewName $newName
            Write-Host "  Renamed: $($_.Name) -> $newName"
        }
    }
} else {
    Write-Error "Path not found: $topBarPath"
}

Write-Host "Renaming complete."

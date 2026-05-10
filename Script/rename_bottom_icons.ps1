# Script to batch rename icons in BottomSidePanel according to IconNamingConvention.md
# Context: Animation and Layer View Controls
# Prefix: "view" (Based on convention example "viewAnimationD.svg")

# Target Directory
$targetPath = Join-Path $PSScriptRoot "..\Asset\Icon\Layout\MainArea\PanelUni\SidePanel\BottomSidePanel"

if (Test-Path $targetPath) {
    Write-Host "Processing BottomSidePanel Icons..."
    Write-Host "Target Directory: $targetPath"
    
    Get-ChildItem -Path $targetPath -Filter "*.svg" | ForEach-Object {
        # Avoid double renaming if script is run multiple times
        if ($_.Name -notlike "view*") {
            # Construct new name: view{OriginalName}
            $newName = "view" + $_.Name
            
            try {
                Rename-Item -Path $_.FullName -NewName $newName -ErrorAction Stop
                Write-Host "  [SUCCESS] Renamed: $($_.Name) -> $newName"
            }
            catch {
                Write-Error "  [FAILED] Could not rename $($_.Name): $_"
            }
        }
        else {
            Write-Host "  [SKIP] $($_.Name) already follows the convention."
        }
    }
} else {
    Write-Error "Path not found: $targetPath"
}

Write-Host "Renaming operation complete."

$rootPath = "d:\Files\DevCoding\VSCode\VisualVigorWeb\Asset\Icon\Layout\MainArea\ToolBar\TopToolBar"

# Define mappings
$leftMappings = @{
    "Brightness" = "adjustBrightness"
    "ColorCurve" = "adjustColorCurve"
    "ColorTemperature" = "adjustTemperature"
    "Contrast" = "adjustContrast"
    "Exposure" = "adjustExposure"
    "Script" = "adjustScript"
    "ToolBox" = "adjustToolBox"
}

$rightMappings = @{
    "Grid" = "assistGrid"
    "Indicator" = "assistIndicator"
    "MousePos" = "assistMousePos"
    "ResetDualPanel" = "assistResetView"
    "SnapGrid" = "assistSnap"
}

function Rename-Icons {
    param (
        [string]$subFolder,
        [hashtable]$mappings
    )

    $folderPath = Join-Path $rootPath $subFolder
    Write-Host "Processing $subFolder..."

    foreach ($key in $mappings.Keys) {
        $targetName = $mappings[$key]
        
        # Rename Dark theme icons
        $oldPathD = Join-Path $folderPath "${key}D.svg"
        $newPathD = Join-Path $folderPath "${targetName}D.svg"
        if (Test-Path $oldPathD) {
            Rename-Item -Path $oldPathD -NewName "${targetName}D.svg"
            Write-Host "Renamed ${key}D.svg to ${targetName}D.svg"
        }

        # Rename Light theme icons
        $oldPathL = Join-Path $folderPath "${key}L.svg"
        $newPathL = Join-Path $folderPath "${targetName}L.svg"
        if (Test-Path $oldPathL) {
            Rename-Item -Path $oldPathL -NewName "${targetName}L.svg"
            Write-Host "Renamed ${key}L.svg to ${targetName}L.svg"
        }
    }
}

Rename-Icons -subFolder "TopToolLeftBar" -mappings $leftMappings
Rename-Icons -subFolder "TopToolRightBar" -mappings $rightMappings

Write-Host "Top ToolBar Icon Renaming Complete."
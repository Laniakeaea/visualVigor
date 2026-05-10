# Rename Right ToolBar Icons (Vector Tools)
$targetDir = "D:\Files\DevCoding\VSCode\VisualVigorWeb\Asset\Icon\Layout\MainArea\ToolBar\RightToolBar\RightToolTopBar"

# Mapping: OriginalPrefix -> NewName (without 'vector' prefix, which will be added)
$mapping = @{
    "Pointer"        = "Select"
    "FreeDrawPath"   = "FreePath"
    "LineVec"        = "Line"
    "CurveVec"       = "Curve"
    "RectangleVec"   = "Rectangle"
    "EllipseVec"     = "Ellipse"
    "PolygonVec"     = "Polygon"
    "FreePolygonVec" = "FreeForm"
    "Text"           = "Text"
    "Group"          = "Group"
}

# Suffixes to handle
$suffixes = @("L", "D")

Write-Host "Starting Icon Renaming in: $targetDir"

if (-not (Test-Path $targetDir)) {
    Write-Error "Directory not found: $targetDir"
    exit 1
}

foreach ($pair in $mapping.GetEnumerator()) {
    $originalPrefix = $pair.Key
    $newName = $pair.Value
    
    foreach ($suffix in $suffixes) {
        $oldName = "${originalPrefix}${suffix}.svg"
        $oldPath = Join-Path $targetDir $oldName
        
        $finalName = "vector${newName}${suffix}.svg"
        $newPath = Join-Path $targetDir $finalName
        
        if (Test-Path $oldPath) {
            Write-Host "Renaming $oldName -> $finalName"
            Rename-Item -Path $oldPath -NewName $finalName
        } elseif (Test-Path $newPath) {
            Write-Host "Skipping $oldName (Already renamed to $finalName)"
        } else {
            Write-Warning "File not found: $oldName"
        }
    }
}

Write-Host "Renaming Complete."

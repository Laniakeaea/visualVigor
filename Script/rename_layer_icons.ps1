$sourceDir = "d:\Files\DevCoding\VSCode\VisualVigorWeb\Asset\Icon\Layout\MainArea\PanelUni\SidePanel\LeftSidePanel\LayerListGroup"

$mapping = @{
    "AddLayer" = "layerAdd";
    "CopyLayer" = "layerCopy";
    "DelLayer" = "layerDelete";
    "Hide" = "layerHide";
    "Show" = "layerShow";
    "LayerBit" = "layerBitmap";
    "LayerVec" = "layerVector";
    "LayerDown" = "layerMoveDown";
    "LayerUp" = "layerMoveUp";
    "Lock" = "layerLock";
    "UnLock" = "layerUnlock";
    "PasteLayer" = "layerPaste";
}

Get-ChildItem -Path $sourceDir -Filter "*.svg" | ForEach-Object {
    $oldName = $_.Name
    $baseName = $_.BaseName
    
    # Determine Suffix (Last character)
    $suffix = $baseName.Substring($baseName.Length - 1)
    if ($suffix -ne 'L' -and $suffix -ne 'D') {
        Write-Host "Skipping $oldName (Unknown suffix)"
        return
    }

    # Determine Key (Everything before suffix)
    $key = $baseName.Substring(0, $baseName.Length - 1)

    if ($mapping.ContainsKey($key)) {
        $newNameCore = $mapping[$key]
        $newName = "${newNameCore}${suffix}.svg"
        
        if ($oldName -ne $newName) {
            Rename-Item -Path $_.FullName -NewName $newName
            Write-Host "Renamed: $oldName -> $newName"
        }
    } else {
        Write-Host "No mapping found for: $oldName"
    }
}

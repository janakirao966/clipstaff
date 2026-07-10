Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param (
        [string]$InputPath,
        [string]$OutputPath,
        [int]$Width,
        [int]$Height
    )
    $img = [System.Drawing.Image]::FromFile($InputPath)
    $newImg = New-Object System.Drawing.Bitmap($Width, $Height)
    $g = [System.Drawing.Graphics]::FromImage($newImg)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $Width, $Height)
    $newImg.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $newImg.Dispose()
    $img.Dispose()
}

$baseDir = "c:\Users\janak\Downloads\_Projects\clipboard pro version\public\icons"
$source = Join-Path $baseDir "icon128.png"

Write-Host "Resizing icons..."
Resize-Image $source (Join-Path $baseDir "icon16.png") 16 16
Resize-Image $source (Join-Path $baseDir "icon48.png") 48 48
Resize-Image $source (Join-Path $baseDir "icon128_real.png") 128 128

# Replace the 128 with the real one
Move-Item (Join-Path $baseDir "icon128_real.png") (Join-Path $baseDir "icon128.png") -Force

Write-Host "Done!"

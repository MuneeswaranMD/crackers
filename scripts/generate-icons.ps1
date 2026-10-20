Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\Muneeswaran\.gemini\antigravity-ide\brain\8cac9f44-b982-462a-9574-28f937bab3b8\.user_uploaded\media_1792506317186.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found at $srcPath"
    exit 1
}

$src = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Img($img, [int]$w, [int]$h, [double]$padPercent = 0.0) {
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    if ($padPercent -gt 0) {
        $padW = [int]($w * $padPercent)
        $padH = [int]($h * $padPercent)
        $destRect = New-Object System.Drawing.Rectangle $padW, $padH, ($w - 2 * $padW), ($h - 2 * $padH)
        $g.DrawImage($img, $destRect)
    } else {
        $destRect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
        $g.DrawImage($img, $destRect)
    }
    $g.Dispose()
    return $bmp
}

# Helper to save ICO safely
$code = @"
using System;
using System.Runtime.InteropServices;
public class NativeMethods {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool DestroyIcon(IntPtr hIcon);
}
"@
Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue

function Save-Ico($bitmap, [string]$destPath) {
    $hIcon = $bitmap.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($hIcon)
    $stream = New-Object System.IO.FileStream $destPath, ([System.IO.FileMode]::Create)
    $icon.Save($stream)
    $stream.Close()
    [NativeMethods]::DestroyIcon($hIcon) | Out-Null
}

$publicDir = "c:\Users\Muneeswaran\Documents\invoice\public"
$iconsDir = "$publicDir\icons"
$srcAppDir = "c:\Users\Muneeswaran\Documents\invoice\src\app"
$tauriIconsDir = "c:\Users\Muneeswaran\Documents\invoice\src-tauri\icons"

New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null
New-Item -ItemType Directory -Force -Path $tauriIconsDir | Out-Null

# 1. public/logo.png (Copy original high-res 500x500)
Copy-Item $srcPath "$publicDir\logo.png" -Force

# 2. Resized standard icons
$sizes = @(16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 384, 512)
foreach ($s in $sizes) {
    $resized = Resize-Img $src $s $s 0
    $outPath = "$iconsDir\icon-${s}x${s}.png"
    $resized.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $resized.Dispose()
}

# 3. Maskable icons (padded ~8% to avoid circle clipping cutting into border)
foreach ($s in @(192, 512)) {
    $maskable = Resize-Img $src $s $s 0.08
    $outPath = "$iconsDir\icon-maskable-${s}x${s}.png"
    $maskable.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $maskable.Dispose()
}

# 4. Standard public & app icons
Copy-Item "$iconsDir\icon-512x512.png" "$publicDir\app-icon.png" -Force
Copy-Item "$iconsDir\icon-180x180.png" "$publicDir\apple-touch-icon.png" -Force
Copy-Item "$iconsDir\icon-32x32.png" "$publicDir\favicon.png" -Force
Copy-Item "$iconsDir\icon-512x512.png" "$srcAppDir\icon.png" -Force
Copy-Item "$iconsDir\icon-180x180.png" "$srcAppDir\apple-icon.png" -Force

# 5. Generate ICO files (32x32 / 48x48)
$icoBmp = Resize-Img $src 32 32 0
Save-Ico $icoBmp "$publicDir\favicon.ico"
Save-Ico $icoBmp "$srcAppDir\favicon.ico"
Save-Ico $icoBmp "$tauriIconsDir\icon.ico"
$icoBmp.Dispose()

# 6. Tauri desktop icons
Copy-Item "$iconsDir\icon-32x32.png" "$tauriIconsDir\32x32.png" -Force
Copy-Item "$iconsDir\icon-128x128.png" "$tauriIconsDir\128x128.png" -Force
Copy-Item "$iconsDir\icon-128x128.png" "$tauriIconsDir\128x128@2x.png" -Force

$src.Dispose()
Write-Host "All icons generated successfully!"

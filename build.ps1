Function Info($msg) {
    Write-Host -ForegroundColor DarkGreen "`nINFO: $msg`n"
  }

Function Error($msg) {
  Write-Host `n`n
  Write-Error $msg
  exit 1
}

Function CheckReturnCodeOfPreviousCommand($msg) {
  if(-Not $?) {
    Error "${msg}. Error code: $LastExitCode"
  }
}

Function GetVersion() {
  $gitCommand = Get-Command -ErrorAction Stop -Name git

  try { $tag = & $gitCommand describe --exact-match --tags HEAD 2>$null } catch { }
  if(-Not $?) {
      $tag = "v0.0-dev"
      Info "The commit is not tagged. Use '$tag' as a version instead"
  }

  $commitHash = & $gitCommand rev-parse --short HEAD
  CheckReturnCodeOfPreviousCommand "Failed to get git commit hash"

  return "$($tag.Substring(1))~$commitHash"
}

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root = Resolve-Path "$PSScriptRoot"
$buildDir = "$root/build"
$version = GetVersion

Info "Remove the build directory if it exists"
Remove-Item $buildDir -Force -Recurse -ErrorAction SilentlyContinue > $null
New-Item $buildDir -Force -ItemType "directory" > $null

Info "Download ExifTool"
Invoke-WebRequest -Uri https://exiftool.org/exiftool-13.30_64.zip -OutFile $buildDir/exiftool.zip
[System.IO.Compression.ZipFile]::ExtractToDirectory("$buildDir/exiftool.zip", "$buildDir")
Rename-Item -Path $buildDir/exiftool-13.30_64 -NewName $buildDir/exiftool
Rename-Item -Path "$buildDir/exiftool/exiftool(-k).exe" -NewName $buildDir/exiftool/exiftool.exe

Info "Generate ExifTool tag names database 'TagNamesDatabase.txt' file"
[xml] $exifToolTagNamesDatabaseXml = & $buildDir/exiftool/exiftool.exe -listx -lang en

$allExifToolTagNames = @()
foreach ($table in $exifToolTagNamesDatabaseXml.taginfo.table) {
  $group0Name = $table.g0
  foreach ($tag in $table.tag) {
    $allExifToolTagNames += "`"${group0Name}:$($tag.name)`": `"$($tag.desc.InnerText)`","
  }
}

Set-Content -Path $root/doc/TagNamesDatabase.txt -Encoding UTF8 -Value $allExifToolTagNames

Info "Copy the script to the build directory"
New-Item -Force -ItemType "directory" $buildDir > $null
Copy-Item -Force -Path $root/src/exiftool-columns.js -Destination $buildDir > $null

Info "Insert the version=$version in the script"
(Get-Content $buildDir/exiftool-columns.js).Replace(
    "  data.version = `"0.0-dev`"",
    "  data.version = `"$version`"") | Set-Content $buildDir/exiftool-columns.js

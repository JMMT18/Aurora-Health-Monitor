# Compila y graba el firmware de Aurora con ESP-IDF 6 en una carpeta propia (idf6/), sin tocar build/ ni sdkconfig.
#   .\flash.ps1                 -> compila y graba en COM14
#   .\flash.ps1 -Port COM5      -> otro puerto
#   .\flash.ps1 -Monitor        -> ademas abre el monitor serial (salir con Ctrl+])
param([string]$Port = "COM14", [switch]$Monitor)
if (-not (Get-Command idf.py -ErrorAction SilentlyContinue)) {
    $env:IDF_PATH = "C:\esp\v6.0.2\esp-idf"
    $env:IDF_TOOLS_PATH = "C:\Users\juanm\.espressif"
    . "$env:IDF_PATH\export.ps1" *> $null      # equivale a get-idf
}
Set-Location $PSScriptRoot
$idfArgs = @("-B", "idf6/build", "-D", "SDKCONFIG=idf6/sdkconfig", "-p", $Port, "build", "flash")
if ($Monitor) { $idfArgs += "monitor" }
idf.py @idfArgs
exit $LASTEXITCODE

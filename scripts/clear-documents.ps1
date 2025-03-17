# PowerShell script to clear documents.json
Write-Host "Clearing documents.json file..."
$documentsPath = Join-Path -Path $PSScriptRoot -ChildPath "..\documents.json"
Set-Content -Path $documentsPath -Value "[]" -Force
Write-Host "Documents cleared successfully!" 
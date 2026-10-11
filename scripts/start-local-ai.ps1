param([string]$BackendPath = 'D:\spring boot\E-Shop', [string]$Model = 'qwen2.5:1.5b', [switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
Push-Location $BackendPath
try {
    $env:OLLAMA_MODEL = $Model
    $compose = @('-f', 'compose.yaml', '-f', 'compose.ai.yaml', '-f', 'compose.local.yaml', '-f', 'compose.ollama.yaml')
    & docker compose @compose up -d ollama ai-db
    if ($LASTEXITCODE -ne 0) { throw 'Could not start the local AI dependencies.' }
    & docker compose @compose exec -T ollama ollama pull $Model
    if ($LASTEXITCODE -ne 0) { throw 'Model download failed. Check free disk space and network access.' }
    if (!$SkipBuild) {
        foreach ($service in @('api-gateway', 'auth-service', 'catalog-service', 'order-service', 'payment-service', 'notification-service', 'ai-service', 'ai-inference')) {
            & docker compose @compose build $service
            if ($LASTEXITCODE -ne 0) { throw "Build failed: $service" }
        }
    }
    $databaseReady = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        & docker compose @compose exec -T ai-db pg_isready -U eshop -d ai_db | Out-Null
        if ($LASTEXITCODE -eq 0) { $databaseReady = $true; break }
        Start-Sleep -Seconds 2
    }
    if (!$databaseReady) { throw 'AI database did not become ready. Existing data has been preserved.' }
    $migration = 'ai-service/src/main/resources/db/upgrade/20261009_ai_enum_constraints.sql'
    Get-Content -Raw $migration | & docker compose @compose exec -T ai-db psql -v ON_ERROR_STOP=1 -U eshop -d ai_db
    if ($LASTEXITCODE -ne 0) { throw 'AI schema migration failed.' }
    & docker compose @compose up -d api-gateway auth-service catalog-service order-service payment-service notification-service ai-service ai-inference
    if ($LASTEXITCODE -ne 0) { throw 'AI stack startup failed.' }
    Write-Host 'AI services started. Allow time for service registration before chatting.'
} finally {
    Pop-Location
}

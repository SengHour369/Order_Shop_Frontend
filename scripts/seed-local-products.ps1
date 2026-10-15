#Requires -Version 7.0
[CmdletBinding()]
param(
    [Parameter(Mandatory)][SecureString]$AdminPassword,
    [string]$AdminUsername = 'admin',
    [string]$ApiBase = 'http://localhost:8080',
    [long]$SubCategoryId = 0,
    [string]$ImagePath = (Join-Path $PSScriptRoot '../public/images/product-placeholder.svg')
)

$ErrorActionPreference = 'Stop'
if (([Uri]$ApiBase).Host -notin @('localhost','127.0.0.1','::1')) { throw 'This seed is for local development only.' }
if (!(Test-Path -LiteralPath $ImagePath -PathType Leaf)) { throw 'Product image file is missing.' }
$products = @(Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'sample-products.json') | ConvertFrom-Json)
if ($products.Count -ne 10 -or @($products.name | Select-Object -Unique).Count -ne 10) { throw 'Expected ten distinct products.' }
foreach ($product in $products) { if ($product.price -le 0 -or $product.quantity -lt 0) { throw 'Invalid sample price or quantity.' } }

$credential = [Net.NetworkCredential]::new($AdminUsername,$AdminPassword)
$login = Invoke-RestMethod -Method Post -Uri "$ApiBase/api/v1/public/email/username/login" -ContentType 'application/json' -Body (@{CriteriaValue=$AdminUsername;Password=$credential.Password} | ConvertTo-Json) -TimeoutSec 20
$credential = $null
if (!$login.access_token) { throw 'Admin sign-in did not return a token.' }
$headers = @{Authorization='Bearer '+$login.access_token}
$login = $null

function Invoke-Json([string]$Path,[object]$Body) {
    Invoke-RestMethod -Method Post -Uri ($ApiBase+$Path) -Headers $headers -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 10) -TimeoutSec 30
}
function Get-Items([object]$Data) {
    if ($null -eq $Data) { return @() }
    if ($Data -is [Array]) { return $Data }
    if ($Data.PSObject.Properties.Name -contains 'content') { return @($Data.content) }
    if ($Data.PSObject.Properties.Name -contains 'payload') { return @($Data.payload) }
    throw 'Unexpected catalog response; no writes were attempted for this item.'
}

try {
    $categories = Invoke-Json '/api/v1/subcategories/get/all' @{page=1;size=100}
    $available = @(Get-Items $categories.data)
    if ($SubCategoryId -eq 0) {
        $category = $available | Where-Object { $_.id -gt 0 -and $_.deleted -ne $true -and $_.status -ne $false } | Select-Object -First 1
        if (!$category) { throw 'Create an active subcategory before running this seed.' }
        $SubCategoryId = [long]$category.id
    } elseif (!($available | Where-Object { $_.id -eq $SubCategoryId })) { throw 'The selected subcategory was not found.' }

    foreach ($product in $products) {
        $found = Invoke-Json '/api/v1/products/get/all' @{criteria_type=1;criteria_value=$product.name;page=1;size=100}
        $existing = @(Get-Items $found.data) | Where-Object { $_.name -eq $product.name } | Select-Object -First 1
        if ($existing) { Write-Output ([pscustomobject]@{Name=$product.name;Id=$existing.id;Status='Already exists'}); continue }
        $skus = @(@{description=$product.description;price=$product.price;quantity=$product.quantity;is_default=$true;inventory=@{quantity=$product.quantity;warehouse_location='E-Shop Demo Warehouse';lowStockThreshold=5}}) | ConvertTo-Json -Depth 8 -AsArray -Compress
        # Product Service owns product, image, SKU, inventory and audit writes. Never retry an uncertain create automatically.
        $created = Invoke-RestMethod -Method Post -Uri "$ApiBase/api/v1/products/create/" -Headers $headers -Form @{
            name=$product.name;description=$product.description;is_active='true';sub_category_id=[string]$SubCategoryId;skus=$skus;files=Get-Item -LiteralPath $ImagePath
        } -TimeoutSec 120
        $id = $created.data.id
        if (!$id) { throw 'Product Service did not confirm a resource ID. Inspect the catalog before retrying.' }
        $verified = Invoke-Json '/api/v1/products/get/all' @{criteria_type=5;criteria_value=[string]$id;page=1;size=1}
        if ($verified.data.name -ne $product.name) { throw 'Product readback did not match. Inspect the catalog before retrying.' }
        Write-Output ([pscustomobject]@{Name=$product.name;Id=$id;Status='Created and verified'})
    }
} finally { $headers = $null }

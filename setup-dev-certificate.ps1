$ErrorActionPreference = 'Stop'

$certificateDirectory = Join-Path $PSScriptRoot '.certs'
$pfxPath = Join-Path $certificateDirectory 'mysite.com.pfx'
$cerPath = Join-Path $certificateDirectory 'mysite.com.cer'
$envPath = Join-Path $certificateDirectory 'https.env'
$generatedFiles = @($pfxPath, $cerPath, $envPath) | Where-Object { Test-Path -LiteralPath $_ }

function Add-CertificateToCurrentUserRoot {
    param([string]$CertificatePath)

    $trustedCertificate = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($CertificatePath)
    $rootStore = [System.Security.Cryptography.X509Certificates.X509Store]::new('Root', 'CurrentUser')
    try {
        $rootStore.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
        $matchingCertificates = $rootStore.Certificates.Find(
            [System.Security.Cryptography.X509Certificates.X509FindType]::FindByThumbprint,
            $trustedCertificate.Thumbprint,
            $false
        )
        if ($matchingCertificates.Count -eq 0) {
            $rootStore.Add($trustedCertificate)
        }
    }
    finally {
        $rootStore.Close()
        $trustedCertificate.Dispose()
    }
}

if ($generatedFiles.Count -eq 3) {
    Add-CertificateToCurrentUserRoot -CertificatePath $cerPath
    Write-Output 'Re-trusted the existing mysite.com development certificate.'
    return
}

if (!(Test-Path -LiteralPath $certificateDirectory)) {
    New-Item -ItemType Directory -Path $certificateDirectory | Out-Null
}

$randomBytes = New-Object byte[] 32
$randomGenerator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $randomGenerator.GetBytes($randomBytes)
}
finally {
    $randomGenerator.Dispose()
}
$password = [System.BitConverter]::ToString($randomBytes).Replace('-', '')
$securePassword = ConvertTo-SecureString $password -AsPlainText -Force

$certificate = Get-ChildItem -Path 'Cert:\CurrentUser\My' |
    Where-Object { $_.FriendlyName -eq 'mysite.com local development' -and $_.HasPrivateKey } |
    Select-Object -First 1

if ($null -eq $certificate) {
    $certificate = New-SelfSignedCertificate `
    -DnsName 'mysite.com' `
    -CertStoreLocation 'Cert:\CurrentUser\My' `
    -FriendlyName 'mysite.com local development' `
    -Type SSLServerAuthentication `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -HashAlgorithm SHA256 `
    -KeyExportPolicy Exportable `
    -NotAfter (Get-Date).AddYears(1)
}

Export-PfxCertificate -Cert $certificate -FilePath $pfxPath -Password $securePassword -Force | Out-Null
Export-Certificate -Cert $certificate -FilePath $cerPath -Type CERT -Force | Out-Null
[System.IO.File]::WriteAllText(
    $envPath,
    "ASPNETCORE_Kestrel__Certificates__Default__Password=$password`r`n",
    [System.Text.Encoding]::ASCII
)
Add-CertificateToCurrentUserRoot -CertificatePath $cerPath

Write-Output 'Created and trusted the local HTTPS certificate for mysite.com.'

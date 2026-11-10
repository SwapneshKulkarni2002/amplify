$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Speech

$outputDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\dist\demo-audio'))
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$scenes = @(
    @{ caption = 'Amplify helps communities fund the distribution of a message. Backing supports its reach, not the cause itself.' },
    @{ caption = 'Anyone can browse without an account, search by topic, and open a campaign to understand its story.' },
    @{ caption = 'Campaign pages make sources, intended audiences, channels, and planning estimates visible before anyone backs the message.' },
    @{ caption = 'Choose an amount and see how it could support message distribution. Reach is an estimate, never a guarantee.' },
    @{ caption = 'Checkout shows the contribution, the three percent demo fee, and estimated reach. This payment is simulated.' },
    @{ caption = 'This prototype never charges a card. Its local receipt and campaign totals are for demonstration only.' },
    @{ caption = 'Creators can start from editable demo copy, then add a title, category, creator name, and clear summary.' },
    @{ caption = 'The story explains its context and provides links readers can assess for themselves before making a decision.' },
    @{ caption = 'Story and advertising visuals have separate roles. The placement preview shows how a concise message may appear.' },
    @{ caption = 'Set a location, audience, and channels. The budget and timeline shape a plan, while actual reach depends on final setup.' },
    @{ caption = 'Review the complete campaign, choose its funding goal, and confirm the community policies before submitting.' },
    @{ caption = 'A submitted campaign stays in review until approval. No distribution starts before review. All figures here are illustrative.' }
)

$manifest = @()
for ($i = 0; $i -lt $scenes.Count; $i++) {
    $number = ($i + 1).ToString('00')
    $fileName = "scene-$number.wav"
    $filePath = Join-Path $outputDir $fileName
    Write-Output "Writing narration: $filePath"
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    try {
        $synth.SetOutputToWaveFile($filePath)
        $synth.Rate = 0
        $synth.Volume = 100
        $synth.Speak($scenes[$i].caption)
    } finally {
        $synth.Dispose()
    }

    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $bytesPerSecond = [System.BitConverter]::ToInt32($bytes, 28)
    $durationSeconds = [Math]::Round(($bytes.Length - 44) / $bytesPerSecond, 3)
    $manifest += [PSCustomObject]@{
        caption = $scenes[$i].caption
        audioFile = $fileName
        durationSeconds = $durationSeconds
    }
}

$json = ConvertTo-Json -InputObject @($manifest) -Depth 4
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $outputDir 'manifest.json'), $json, $utf8)
Write-Output "Prepared $($manifest.Count) narration clips in $outputDir"

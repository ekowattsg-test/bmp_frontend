# PowerShell equivalent of start-dev.sh
# Loads .env variables and starts Vite dev server

# Check if .env exists
if (Test-Path ".env") {
    Get-Content .env |
        Where-Object { $_ -and ($_ -notmatch '^#') } |
        ForEach-Object {
            if ($_ -match '^(.*?)=(.*)$') {
                $name = $matches[1]
                $value = $matches[2]
                [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
            }
        }
}

npm run dev

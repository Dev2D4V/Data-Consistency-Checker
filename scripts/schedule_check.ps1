# Data Consistency Checker - Scheduled Check Script (PowerShell)
# This script triggers a consistency check via the API

# Configuration
$ApiBaseUrl = "http://localhost:3000/api"
$LogFile = "C:\Logs\consistency-checker.log"
$Collection = "users"

# Function to log messages
function Log-Message {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "$Timestamp - $Message"
    
    # Create log directory if it doesn't exist
    $LogDir = Split-Path $LogFile -Parent
    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
    
    Add-Content -Path $LogFile -Value $LogEntry
}

# Function to trigger consistency check
function Trigger-Check {
    Log-Message "Starting scheduled consistency check for collection: $Collection"
    
    try {
        # Prepare request body
        $Body = @{
            collection = $Collection
        } | ConvertTo-Json
        
        # Make API call
        $Response = Invoke-RestMethod -Uri "$ApiBaseUrl/check" `
            -Method Post `
            -ContentType "application/json" `
            -Body $Body `
            -ErrorAction Stop
        
        Log-Message "Consistency check triggered successfully"
        Log-Message "Response: $($Response | ConvertTo-Json -Compress)"
        
    } catch [System.Net.WebException] {
        $HttpStatusCode = $_.Exception.Response.StatusCode
        $StatusCodeValue = [int]$HttpStatusCode
        
        if ($StatusCodeValue -eq 409) {
            Log-Message "Consistency check already in progress, skipping"
        } else {
            Log-Message "Failed to trigger consistency check (HTTP $StatusCodeValue)"
            Log-Message "Error: $($_.Exception.Message)"
            exit 1
        }
    } catch {
        Log-Message "Unexpected error: $($_.Exception.Message)"
        exit 1
    }
}

# Function to check if server is running
function Test-Server {
    try {
        $Response = Invoke-RestMethod -Uri "$ApiBaseUrl/health" `
            -Method Get `
            -ErrorAction Stop `
            -TimeoutSec 10
        
        return $true
    } catch {
        return $false
    }
}

# Main execution
function Main {
    Log-Message "=== Scheduled Consistency Check Started ==="
    
    # Check if server is running
    if (-not (Test-Server)) {
        Log-Message "ERROR: Server is not running at $ApiBaseUrl"
        exit 1
    }
    
    Log-Message "Server is running, proceeding with consistency check"
    
    # Trigger the consistency check
    Trigger-Check
    
    Log-Message "=== Scheduled Consistency Check Completed ==="
}

# Execute main function
Main

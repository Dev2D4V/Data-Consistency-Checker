#!/bin/bash

# Data Consistency Checker - Scheduled Check Script
# This script triggers a consistency check via the API

# Configuration
API_BASE_URL="http://localhost:3000/api"
LOG_FILE="/var/log/consistency-checker.log"
COLLECTION="users"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Function to trigger consistency check
trigger_check() {
    log_message "Starting scheduled consistency check for collection: $COLLECTION"
    
    # Make API call to trigger the check
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "{\"collection\": \"$COLLECTION\"}" \
        "$API_BASE_URL/check")
    
    # Extract HTTP status code (last line of response)
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 200 ]; then
        log_message "Consistency check triggered successfully"
        log_message "Response: $response_body"
    elif [ "$http_code" -eq 409 ]; then
        log_message "Consistency check already in progress, skipping"
    else
        log_message "Failed to trigger consistency check (HTTP $http_code)"
        log_message "Response: $response_body"
        exit 1
    fi
}

# Function to check if server is running
check_server() {
    health_response=$(curl -s -w "\n%{http_code}" "$API_BASE_URL/health" 2>/dev/null)
    http_code=$(echo "$health_response" | tail -n1)
    
    if [ "$http_code" -eq 200 ]; then
        return 0
    else
        return 1
    fi
}

# Main execution
main() {
    log_message "=== Scheduled Consistency Check Started ==="
    
    # Check if server is running
    if ! check_server; then
        log_message "ERROR: Server is not running at $API_BASE_URL"
        exit 1
    fi
    
    log_message "Server is running, proceeding with consistency check"
    
    # Trigger the consistency check
    trigger_check
    
    log_message "=== Scheduled Consistency Check Completed ==="
}

# Execute main function
main "$@"

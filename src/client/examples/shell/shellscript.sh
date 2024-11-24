#!/bin/bash

# Import the RPC client library
source "$(dirname "$0")/../../library/client.shell.sh"

# Function to run tests for a specific protocol
run_protocol_tests() {
    local protocol=$1
    echo -e "\n=== Running ${protocol^^} Tests ==="

    # Initialize client with debug mode
    init_client "127.0.0.1" 9101 9102 "$protocol" true
    echo "${protocol^^} client initialized successfully"

    # Test echo extension
    echo -e "\nTesting echo extension (${protocol^^})"
    local echo_result
    echo_result=$(echo_message "Hello RPC!" "$protocol")
    echo "Echo result: $echo_result"

    # Test date extension
    echo -e "\nTesting date extension (${protocol^^})"
    local date_result
    date_result=$(get_current_date "$protocol")
    echo "Current date: $date_result"

    # Test server information
    echo -e "\nTesting server information (${protocol^^})"
    local server_info
    server_info=$(get_server_info "$protocol")
    echo "Server info: $server_info"

    # Test extension management
    echo -e "\nTesting extension management (${protocol^^})"
    local extensions
    extensions=$(list_extensions "$protocol")
    echo "Available extensions: $extensions"

    # Test port validation
    echo -e "\nTesting port validation (${protocol^^})"
    local port_type
    if [ "$protocol" = "tcp" ]; then
        port_type="TCP"
    else
        port_type="UDP"
    fi
    local port_validation
    port_validation=$(validate_port 8080 "$port_type" "$protocol")
    echo "Port validation result: $port_validation"

    echo -e "\n${protocol^^} tests completed successfully"
    
    # Cleanup
    close_client
    sleep 0.5
}

# Function to make a random request
make_random_request() {
    local protocol=$1
    local methods=(
        "echo_message \"Hello RPC!\""
        "get_current_date"
        "get_server_info"
        "list_extensions"
        "validate_port 8080 TCP"
        "validate_port 8080 UDP"
    )
    
    local random_index=$((RANDOM % ${#methods[@]}))
    local method_cmd=${methods[$random_index]}
    
    echo -e "\nMaking random request using $protocol"
    eval "$method_cmd $protocol"
}

# Function to run random protocol tests
run_random_tests() {
    local protocols=("tcp" "udp")
    local request_count=0
    local max_requests=12  # 60 seconds / 5 seconds = 12 requests
    local start_time=$(date +%s)
    
    echo -e "\n=== Running Random Protocol Tests ==="
    
    while [ $request_count -lt $max_requests ] && [ $(($(date +%s) - start_time)) -lt 60 ]; do
        local random_index=$((RANDOM % ${#protocols[@]}))
        local protocol=${protocols[$random_index]}
        
        echo -e "\n[Request $((request_count + 1))] Using ${protocol^^} protocol"
        
        # Initialize client for this request
        init_client "127.0.0.1" 9101 9102 "$protocol" true
        
        make_random_request "$protocol"
        
        # Cleanup
        close_client
        
        request_count=$((request_count + 1))
        
        if [ $request_count -lt $max_requests ]; then
            echo "Waiting 5 seconds before next request..."
            sleep 5
        fi
    done
    
    echo -e "\nCompleted all random protocol tests!"
}

# Main function
main() {
    echo "Starting test suite..."

    # Run TCP tests
    run_protocol_tests "tcp"
    
    # Add delay between protocol tests
    sleep 2
    
    # Run UDP tests
    run_protocol_tests "udp"
    
    # Run random protocol tests
    run_random_tests

    echo -e "\nAll tests completed successfully!"
}

# Execute main if script is run directly
if [ "$0" = "${BASH_SOURCE[0]}" ]; then
    main "$@"
fi

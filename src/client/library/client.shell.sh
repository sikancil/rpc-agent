#!/bin/bash

# RPC Client Library for Shell
# This library provides functions for making RPC calls over TCP and UDP

# Default configuration
DEFAULT_HOST="127.0.0.1"
DEFAULT_PORT_TCP=9101
DEFAULT_PORT_UDP=9102
DEFAULT_PROTOCOL="tcp"
DEFAULT_TIMEOUT=5
DEFAULT_DEBUG=false

# Initialize client configuration
init_client() {
    local host=${1:-$DEFAULT_HOST}
    local tcp_port=${2:-$DEFAULT_PORT_TCP}
    local udp_port=${3:-$DEFAULT_PORT_UDP}
    local protocol=${4:-$DEFAULT_PROTOCOL}
    local debug=${5:-$DEFAULT_DEBUG}

    export RPC_HOST=$host
    export RPC_PORT_TCP=$tcp_port
    export RPC_PORT_UDP=$udp_port
    export RPC_PROTOCOL=$protocol
    export RPC_DEBUG=$debug
    export RPC_REQUEST_ID=1

    if [ "$RPC_DEBUG" = true ]; then
        echo "RPC Client initialized with:"
        echo "Host: $RPC_HOST"
        echo "TCP Port: $RPC_PORT_TCP"
        echo "UDP Port: $RPC_PORT_UDP"
        echo "Protocol: $RPC_PROTOCOL"
    fi
}

# Debug logging
debug_log() {
    if [ "$RPC_DEBUG" = true ]; then
        echo "[DEBUG] $*" >&2
    fi
}

# Create JSON-RPC request
create_request() {
    local method=$1
    local params=$2
    local id=${3:-$RPC_REQUEST_ID}
    echo "{\"jsonrpc\":\"2.0\",\"method\":\"${method}\",\"params\":${params},\"id\":${id}}"
}

# Send RPC request
send_rpc_request() {
    local method=$1
    local params=$2
    local protocol=${3:-$RPC_PROTOCOL}
    local request
    local response
    
    request=$(create_request "$method" "$params")
    debug_log "Sending request via $protocol: $request"

    if [ "$protocol" = "tcp" ]; then
        response=$(send_tcp_request "$request")
    else
        response=$(send_udp_request "$request")
    fi

    echo "$response"
    export RPC_REQUEST_ID=$((RPC_REQUEST_ID + 1))
}

# Send TCP request
send_tcp_request() {
    local request=$1
    local response
    
    response=$(echo "$request" | nc -w "$DEFAULT_TIMEOUT" "$RPC_HOST" "$RPC_PORT_TCP")
    if [ $? -ne 0 ]; then
        echo "{\"jsonrpc\":\"2.0\",\"error\":{\"code\":-32000,\"message\":\"TCP request failed\"},\"id\":$RPC_REQUEST_ID}"
        return 1
    fi
    
    echo "$response"
}

# Send UDP request
send_udp_request() {
    local request=$1
    local response
    
    if command -v socat >/dev/null 2>&1; then
        response=$(echo "$request" | socat -t "$DEFAULT_TIMEOUT" -T "$DEFAULT_TIMEOUT" STDIO "UDP4:$RPC_HOST:$RPC_PORT_UDP")
    else
        response=$(echo "$request" | nc -u -w "$DEFAULT_TIMEOUT" "$RPC_HOST" "$RPC_PORT_UDP")
    fi
    
    if [ $? -ne 0 ]; then
        echo "{\"jsonrpc\":\"2.0\",\"error\":{\"code\":-32000,\"message\":\"UDP request failed\"},\"id\":$RPC_REQUEST_ID}"
        return 1
    fi
    
    echo "$response"
}

# Echo method
echo_message() {
    local message=$1
    local protocol=${2:-$RPC_PROTOCOL}
    send_rpc_request "echo.echo" "{\"message\":\"$message\"}" "$protocol"
}

# Get current date
get_current_date() {
    local protocol=${1:-$RPC_PROTOCOL}
    send_rpc_request "date.now" "{}" "$protocol"
}

# Get server info
get_server_info() {
    local protocol=${1:-$RPC_PROTOCOL}
    send_rpc_request "server.system" "{}" "$protocol"
}

# List extensions
list_extensions() {
    local protocol=${1:-$RPC_PROTOCOL}
    send_rpc_request "extensions.list" "{}" "$protocol"
}

# Validate port
validate_port() {
    local port=$1
    local type=${2:-"TCP"}
    local protocol=${3:-$RPC_PROTOCOL}
    send_rpc_request "network.validatePort" "{\"port\":$port,\"type\":\"$type\"}" "$protocol"
}

# Close client (cleanup if needed)
close_client() {
    debug_log "Closing RPC client"
    unset RPC_HOST RPC_PORT_TCP RPC_PORT_UDP RPC_PROTOCOL RPC_DEBUG RPC_REQUEST_ID
}

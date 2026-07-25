#!/bin/bash
# Maskit CI/CD Scan Script
# Scans a file for sensitive data before committing or deploying.
#
# Usage:
#   ./scripts/maskit-scan.sh <file>
#   ./scripts/maskit-scan.sh --exit-on-risk <file>
#
# Exit codes:
#   0 = no sensitive data found
#   1 = sensitive data found (or error)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CLI="$ROOT_DIR/mcp-server/cli.js"

if [ ! -f "$CLI" ]; then
    echo "Error: CLI not found at $CLI"
    exit 1
fi

EXIT_ON_RISK=""
FILE=""

for arg in "$@"; do
    case "$arg" in
        --exit-on-risk)
            EXIT_ON_RISK="--exit-on-risk"
            ;;
        *)
            FILE="$arg"
            ;;
    esac
done

if [ -z "$FILE" ]; then
    echo "Usage: $0 [--exit-on-risk] <file>"
    exit 1
fi

if [ ! -f "$FILE" ]; then
    echo "Error: File not found: $FILE"
    exit 1
fi

node "$CLI" scan-file $EXIT_ON_RISK "$FILE"
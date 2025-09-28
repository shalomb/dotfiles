#!/bin/bash
# Mock aws-sso script for testing
# This script simulates aws-sso behavior without making real AWS calls

set -e

# Mock AWS SSO command
case "$1" in
    "list")
        # Mock list command - return some fake profiles
        cat << 'EOF'
List of AWS roles for SSO Instance: tec [Expires in: 2h 12m]

AccountIdPad | AccountAlias    | RoleName                     | Profile                                   | Expires
===================================================================================================================
011164527032 | tec-man-eng-dev | _Developer-Dev               | 011164527032:_Developer-Dev               | Active
011164527032 | tec-man-eng-dev | AdministratorAccess          | 011164527032:AdministratorAccess          | Active
EOF
        ;;
    "eval")
        # Mock eval command - generate fake AWS credentials
        profile=""
        url_action="open"
        
        # Parse arguments
        while [[ $# -gt 0 ]]; do
            case $1 in
                -p|--profile)
                    profile="$2"
                    shift 2
                    ;;
                --url-action)
                    url_action="$2"
                    shift 2
                    ;;
                *)
                    shift
                    ;;
            esac
        done
        
        # Generate mock credentials
        cat << EOF
export AWS_ACCESS_KEY_ID="ASIA1234567890ABCDEF"
export AWS_SECRET_ACCESS_KEY="mock_secret_key_1234567890abcdef"
export AWS_SESSION_TOKEN="mock_session_token_very_long_string_here"
export AWS_SSO_ACCOUNT_ID="011164527032"
export AWS_SSO_ROLE_NAME="_Developer-Dev"
export AWS_SSO="tec"
export AWS_SSO_DEFAULT_REGION="us-east-1"
export AWS_SSO_PROFILE="$profile"
export AWS_DEFAULT_REGION="us-east-1"
export AWS_SSO_ROLE_ARN="arn:aws:iam::011164527032:role/_Developer-Dev"
export AWS_SSO_SESSION_EXPIRATION="2025-09-28T06:40:02+02:00"
EOF
        
        # If url_action is "print", print a mock URL
        if [[ "$url_action" == "print" ]]; then
            echo "Please open the following URL in your browser:" >&2
            echo "https://mock-aws-signin-url.com/federation?Action=login" >&2
        fi
        ;;
    "console")
        # Mock console command - launch browser
        profile=""
        
        # Parse arguments
        while [[ $# -gt 0 ]]; do
            case $1 in
                -p|--profile)
                    profile="$2"
                    shift 2
                    ;;
                *)
                    shift
                    ;;
            esac
        done
        
        # Mock browser launch - never actually launch a browser
        echo "Mock browser: https://console.aws.amazon.com/console/home?region=us-east-1"
        ;;
    *)
        echo "Mock aws-sso: Unknown command '$1'" >&2
        exit 1
        ;;
esac
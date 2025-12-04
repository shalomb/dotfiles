#!/bin/bash

# CRITICAL: Prevent agent process blocking
# This script contains interactive prompts (read -p) that will cause AI agents

# Additional safety check: ensure stdin is a terminal
# This prevents the script from running in environments where stdin is not
# connected to a terminal (pipes, redirects, background processes, etc.)
[[ -t 0 ]] || return

# AWS CLI completion
aws_completer=$(type -P aws_completer)
if [[ $aws_completer ]]; then
  complete -C "$aws_completer" aws
fi

# AWS environment variables
# https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html#envvars-list-aws_cli_auto_prompt
export AWS_CLI_AUTO_PROMPT='on-partial'
export AWS_DEFAULT_OUTPUT='json'
# export AWS_DEFAULT_REGION='eu-central-1'

# AWS CLI installation function
function install-awscli {
  awscli_src="https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip"
  if uname -m | grep -q aarch64; then
    awscli_src="https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip"
  fi
  ( if cd "$TMP"; then
      echo >&2 "Downloading $awscli_src in $TMP"
      curl -cfsSL "$awscli_src" -o "awscliv2.zip"
      unzip awscliv2.zip
      sudo ./aws/install --update
      aws --version
    fi
  )
}

# AWS SSO Configuration
AWS_SSO_CACHE="$XDG_CACHE_HOME/aws-sso-profile"

# AWS SSO Profile Selection
aws-sso-profile() {
  local account="$1"
  local profile
  if [[ -z $account ]]; then
    if account=$(git rev-parse --show-toplevel); then
      account="${account##*/}"
      account="${account##*tec-}"
      remainder="${account#*-*-}"
      account="${account%-"$remainder"}"
      account="tec-$account-${PWD##*/}"
    else
      account=$(
        source "$AWS_SSO_CACHE"
        echo "$AWS_SSO_PROFILE"
      )
    fi
  fi

  profile=$(aws-sso list 2>&1 | grep "$account" | awk -F'|' '{print $4}' | sed 's/^ *//;s/ *$//')

  if (($(wc -l <<<"$profile") > 1)); then
    echo >&2 "WARNING: Multiple profiles found for '$account'"
    echo >&2 "$profile"
    profile=$(
      for p in TEC Administrator admin TestProd; do
        grep -Ei "$p" <<<"$profile"

      done | grep -Ei -v "ViewOnly|Depl" | head -n 1
    )
    echo -e "\nSelecting '$profile'\n" >&2
  fi

  echo "$profile"
}

# AWS Login Function
# REQUIRES: aws-sso v2.0.0+ (login command added in v2.0.0)
aws-login() {
  # Verify aws-sso v2.0.0+ is installed
  if ! aws-sso login --help >/dev/null 2>&1; then
    echo "ERROR: aws-sso v2.0.0+ required. 'login' command not found." >&2
    echo "Current version may be v1.x. Please upgrade:" >&2
    echo "  go install github.com/synfinatic/aws-sso-cli/cmd/aws-sso@v2.1.0" >&2
    return 1
  fi
  local console=0
  local creds_file=""
  local account_arg=""
  local role_suffix=""
  local args=()
  
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      -c)
        console=1
        shift
        ;;
      -*)
        echo "Unknown option: $1" >&2
        return 1
        ;;
      *)
        if [[ -z "$account_arg" ]]; then
          # First positional argument - check for account:role format
          if [[ "$1" == *:* ]]; then
            # Split account:role
            account_arg="${1%%:*}"
            role_suffix="${1#*:}"
          else
            account_arg="$1"
          fi
          args+=("$account_arg")
        elif [[ -z "$creds_file" && -n "${2:-}" && "${2:-}" != "-c" ]]; then
          # Second argument is likely a file path
          creds_file="$2"
          shift 2
          continue
        fi
        shift
        ;;
    esac
  done
  
  # Get the base profile (may include default role)
  local base_profile
  base_profile=$(aws-sso-profile "${args[@]}")
  
  # Construct full profile with role if specified
  local profile="$base_profile"
  if [[ -n "$role_suffix" ]]; then
    # Replace the role part (everything after first colon) with user-specified role
    profile="${base_profile%%:*}:${role_suffix}"
    echo "Using profile: $profile (account: ${base_profile%%:*}, role: $role_suffix)" >&2
  else
    echo "Using profile: $profile" >&2
  fi
  
  # Perform SSO authentication with proper browser control
  if [[ $console -eq 1 ]]; then
    # Allow browser for console access
    aws-sso login --url-action=open
    aws-sso eval -p "$profile" 2>&1 | grep -v "^+" >"$AWS_SSO_CACHE"
  else
    # Prevent browser launch by using print action
    # Get credentials and show any SSO URL if needed
    echo "Getting AWS SSO credentials..." >&2
    aws-sso login --url-action=print
    aws-sso eval -p "$profile" 2>&1 | grep -v "^+" >"$AWS_SSO_CACHE"
  fi
  
  source "$AWS_SSO_CACHE"
  
  # Handle credential export
  if [[ -n "$creds_file" ]]; then
    aws-whoami "$creds_file"
  else
    aws-whoami
  fi
  
  # Handle console launch
  if [[ $console -eq 1 ]]; then
    aws-console
  fi
}

# AWS Console Function
aws-console() {
  if (($# > 0)); then
    x-www-browser "https://${AWS_REGION:-$AWS_DEFAULT_REGION}.console.aws.amazon.com/$1"
  else
    aws-sso console -p "${AWS_SSO_PROFILE:-$(aws-sso-profile "$@")}"
  fi
}

# AWS STS MFA Session Function
function aws-sts-mfa-session {
  local AWS_MFA_AUTH_CODE
  : ${AWS_MFA_AUTH_CODE:=''}
  : ${AWS_MFA_PROFILE:=default}
  : ${STS_SESSION_CACHE:=~/.aws/sts-mfa-session.json}
  : ${STS_SESSION_DURATION:=86400} #24 hours

  function _aws { command aws "$@" --profile "$AWS_MFA_PROFILE"; }

  function new-sts-session {
    local mfa_device

    if ! mfa_device=$(
      _aws iam list-mfa-devices | jq -cer .MFADevices[0].SerialNumber
    ); then
      echo >&2 "ERROR: No MFA devices listed. Is \$AWS_MFA_PROFILE ($AWS_MFA_PROFILE) set?"
      return 1
    fi

    if [[ -z $AWS_MFA_AUTH_CODE ]]; then
      read -p "Enter the MFA token for $mfa_device: " -r AWS_MFA_AUTH_CODE
    fi

    if session_object=$(_aws sts get-session-token \
      --duration-seconds "$STS_SESSION_DURATION" \
      --serial-number    "$mfa_device" \
      --token-code       "$AWS_MFA_AUTH_CODE"); then
      echo "$session_object" > "$STS_SESSION_CACHE"
    else
      echo >&2 "ERROR: Unable to get an STS token. Check MFA token ($AWS_MFA_AUTH_CODE) for correctness."
      return 1
    fi

    aws-load-sts-session-from-file "$STS_SESSION_CACHE"
  }

  if [[ $1 == test ]]; then command aws sts get-caller-identity; return $?; fi
  if [[ $1 == @(refresh|login) ]]; then new-sts-session; ec=$?; command aws sts get-caller-identity; return $?; fi

  if [[ -z $AWS_ACCESS_KEY_ID             ||
        -z $AWS_SECRET_ACCESS_KEY         ||
        -z $AWS_SESSION_TOKEN             ||
        -z $AWS_SESSION_TOKEN_EXPIRY_TIME
    ]]; then
      aws-load-sts-session-from-file "$STS_SESSION_CACHE"
  fi

  local now=$(date +%s)
  (( now > AWS_SESSION_TOKEN_EXPIRY_TIME )) && { new-sts-session || return $?; }

  command aws "$@"
}

# AWS Load STS Session from File
function aws-load-sts-session-from-file {
  local sts_session_cache="${1:-$STS_SESSION_CACHE}"
  if ! jq -Scer .Credentials "$sts_session_cache" &>/dev/null; then
    echo >&2 "Unable to load .Credentials from '$sts_session_cache'"
  fi
  function pluck { jq -cer "$@" "$sts_session_cache"; }
  export AWS_ACCESS_KEY_ID=$(pluck '.Credentials.AccessKeyId')
  export AWS_SECRET_ACCESS_KEY=$(pluck '.Credentials.SecretAccessKey')
  export AWS_SESSION_TOKEN=$(pluck '.Credentials.SessionToken')
  export AWS_SESSION_TOKEN_EXPIRY_TIME=$(
    date '+%s' -d $(pluck '.Credentials.Expiration') || true
  )
  export AWS_ASSUMED_ROLE_ID=$(pluck '.AssumedRoleUser.AssumedRoleId')
  export AWS_ASSUMED_ROLE_ARN=$(pluck '.AssumedRoleUser.Arn')
}

# AWS Whoami Function
function aws-whoami {
  local export_file="${1:-}"
  
  if [[ -n "$export_file" ]]; then
    # Export AWS credentials to file (unmasked for actual use)
    env | /bin/grep '^AWS' | sort | while IFS='=' read -r key value; do
      echo "export $key=\"$value\""
    done > "$export_file"
    echo "AWS credentials exported to: $export_file"
    return 0
  fi
  
  # Original behavior when no file argument provided
  env |
    perl -ne '
      s/(AWS_(?:SECRET_ACCESS_KEY|SESSION_TOKEN)=)(.*)/
        $1 . q[X] x 32/ex;
      /^AWS/ and print
    ' | sort | grep -P '.*='
  if [[ -n $AWS_SSO_ACCOUNT_ID ]]; then
    echo
    aws-sso list -P AccountId="$AWS_SSO_ACCOUNT_ID"
  fi
  command aws sts get-caller-identity --output json | jq -S .
}
#!/bin/bash

# Dry run option
DRY_RUN=true  # Set to 'false' to execute

# Set variables for the user pool and client settings
USER_POOL_NAME="HopoUserPool"
CLIENT_NAME="webapp"

# Function to either run or simulate a command
run_command() {
    if [ "$DRY_RUN" = true ]; then
        echo "Dry Run: $@"
    else
        eval "$@"
    fi
}

# Create user pool
USER_POOL_ID=$(run_command "aws cognito-idp create-user-pool \
    --pool-name '$USER_POOL_NAME' \
    --policies 'PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}' \
    --auto-verified-attributes 'email' 'phone_number' \
    --device-configuration 'ChallengeRequiredOnNewDevice=false,DeviceOnlyRememberedOnUserPrompt=true' \
    --mfa-configuration 'ON' \
    --email-verification-message 'Please verify your email by using this code: {####}' \
    --email-verification-subject 'Your verification code' \
    --sms-verification-message 'Your verification code is {####}' \
    --account-recovery-setting 'RecoveryMechanisms=[{Priority=1,Name=verified_email},{Priority=2,Name=verified_phone_number}]' \
    --query 'UserPool.Id' \
    --output text")

echo "User Pool ID: $USER_POOL_ID"

# Create user pool client
CLIENT_ID=$(run_command "aws cognito-idp create-user-pool-client \
    --user-pool-id '$USER_POOL_ID' \
    --client-name '$CLIENT_NAME' \
    --generate-secret \
    --access-token-validity 1440 \
    --refresh-token-validity 43200 \
    --id-token-validity 1440 \
    --explicit-auth-flows 'ALLOW_USER_PASSWORD_AUTH' 'ALLOW_REFRESH_TOKEN_AUTH' 'ALLOW_CUSTOM_AUTH' \
    --query 'UserPoolClient.ClientId' \
    --output text")

echo "User Pool Client ID: $CLIENT_ID"

# Output details for .env configuration
if [ "$DRY_RUN" = false ]; then
    echo "Writing Cognito details to .env file."
    cat <<EOT >> .env
COGNITO_USER_POOL_ID=$USER_POOL_ID
COGNITO_CLIENT_ID=$CLIENT_ID
EOT
else
    echo "Dry Run: .env file not created. Would contain:"
    echo "COGNITO_USER_POOL_ID=$USER_POOL_ID"
    echo "COGNITO_CLIENT_ID=$CLIENT_ID"
fi

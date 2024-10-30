#NOTE THIS IS Taken Direct FROM FDZ, it needs Revising


#!/bin/bash

# Export the environment variables for this stage from .env
export $(grep -v '^#' .env | xargs)
echo AWS_REGION: $AWS_REGION
echo AWS_ACCESS_KEY_ID: $AWS_ACCESS_KEY_ID

if [ -z "$VPC" ]
then
  echo "Missing environment variable 'VPC'"
  exit 1
fi

if [ -z "$STAGE" ]
then
  echo "Missing environment variable 'STAGE' e.g. 'dev'"
  exit 1
fi

WP=$VPC/$STAGE
echo WP: $WP
echo WP_NAME: $WP_NAME

# Install dependencies
npm install

# Deploy to Serverless stage
SLS_DEBUG=* \
AWS_REGION=$AWS_REGION \
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
SERVICE=$SERVICE \
VPC=$VPC \
STAGE=$STAGE \
WP=$WP \
WP_NAME=$WP_NAME \
bash ./cicd/deploy-sls.sh
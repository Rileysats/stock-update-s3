#!/bin/bash
set -e

# Change to the project root (parent of scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

zip -r stock-update.zip src .env node_modules package.json package-lock.json
npm run build:buy

# Configuration
STACK_NAME="stock-update-stack"

# Export AWS credentials
source .env
export AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION=$AWS_REGION

# Package the CloudFormation stack
echo "Packaging CloudFormation stack..."
aws cloudformation package \
    --template-file infrastructure/stack.yaml \
    --s3-bucket $AWS_ARTIFACT_BUCKET \
    --output-template-file packaged.yaml


# Deploy the CloudFormation stack
echo "Deploying CloudFormation stack: $STACK_NAME"
aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name $STACK_NAME \
  --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
  --parameter-overrides \
    StockBucketName="$AWS_DATA_BUCKET"

# Clean up
rm packaged.yaml stock-update.zip 
rm -r dist
echo "Deployment complete."
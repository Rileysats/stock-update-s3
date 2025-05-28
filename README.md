# Stock Update Lambda Project

A TypeScript-based AWS Lambda project for managing stock transactions using S3 bucket storage.

## Overview

This project implements two AWS Lambda functions to handle stock transactions:
- Buy Stock Lambda: Processes stock purchase transactions
- Sell Stock Lambda: Processes stock sale transactions

## Architecture

- **AWS Lambda Functions**: TypeScript-based serverless functions
- **Amazon S3**: Storage for stock information
- **AWS CloudFormation**: Infrastructure as Code (IaC) deployment

## Project Structure

```
├── src/
│   ├── functions/
│   │   ├── buyStock/
│   │   └── sellStock/
├── infrastructure/
│   └── cloudformation.yml
├── scripts/
│   └── deploy.sh
└── README.md
```

## Prerequisites

- Node.js (v14 or later)
- AWS CLI configured with appropriate credentials
- TypeScript
- AWS SAM CLI (for local testing)

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Deployment

To deploy the application:

```bash
# Deploy using the deployment script
./scripts/deploy.sh
```

## Lambda Functions

### Buy Stock Lambda
- Handles stock purchase transactions
- Updates stock quantities in S3
- Validates purchase requests

### Sell Stock Lambda
- Processes stock sale transactions
- Updates stock quantities in S3
- Validates available stock before sale

## Configuration

The CloudFormation template (`infrastructure/cloudformation.yml`) defines:
- Lambda functions
- S3 bucket
- IAM roles and permissions
- Other required AWS resources

## Development

```bash
# Run tests
npm test

# Local development using SAM
sam local invoke BuyStockFunction
sam local invoke SellStockFunction
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch
3. Submit a pull request
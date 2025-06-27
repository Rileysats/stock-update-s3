# Stock Update S3 Lambda Project

A TypeScript-based AWS Lambda project for managing stock buy/sell transactions, with S3 as persistent storage and infrastructure managed via AWS SAM/CloudFormation.

## Overview

This project provides serverless functions to process stock buy and sell orders, triggered via API Gateway or other AWS services. It includes:
- **Buy Stock Lambda**: Handles stock purchase requests
- **Sell Stock Lambda**: Handles stock sale requests
- **Parser Lambda**: Parses incoming trade signals and routes them to the correct function
- **S3 Bucket**: Stores stock data
- **IAM Roles**: Securely manages Lambda permissions

## Architecture

- **AWS Lambda**: TypeScript-based functions for buy, sell, and parser logic
- **Amazon S3**: Stores and updates stock information
- **API Gateway**: Exposes endpoints for trade signals
- **CloudFormation/SAM**: Infrastructure as Code (see `infrastructure/stack.yaml`)

## Project Structure

```
├── infrastructure/
│   └── stack.yaml                # CloudFormation/SAM template
├── scripts/
│   └── deploy.sh                 # Deployment script
├── src/
│   ├── functions/
│   │   ├── buy/
│   │   │   ├── index.ts
│   │   │   └── __tests__/index.test.ts
│   │   ├── sell/
│   │   │   ├── index.ts
│   │   │   └── __tests__/index.test.ts
│   │   ├── parser/
│   │   │   └── index.ts
│   │   └── shared/
│   │       ├── helpers.ts
│   │       ├── local-helpers.ts
│   │       └── types.ts
│   ├── local_buy.ts
│   └── local_sell.ts
├── jest.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Prerequisites

- Node.js (v14 or later)
- AWS CLI configured with credentials
- AWS SAM CLI (for local testing/deployment)
- TypeScript

## Installation

```bash
npm install
npm run build
```

## Deployment

```bash
./scripts/deploy.sh
```

This script will package and deploy the stack using AWS SAM and CloudFormation, as defined in `infrastructure/stack.yaml`.

## Lambda Functions

### Buy Stock Lambda
- Processes stock purchase transactions
- Updates S3 with new stock quantities
- Validates purchase requests

### Sell Stock Lambda
- Processes stock sale transactions
- Updates S3 with new stock quantities
- Validates available stock before sale

### Parser Lambda
- Receives trade signals (e.g., from API Gateway)
- Parses and routes requests to the appropriate Lambda (buy or sell)

## API Usage: Triggering the sms-parser Lambda

The `sms-parser` Lambda is triggered via an HTTP POST request to the API Gateway endpoint defined in your stack. This endpoint is typically:

```
POST /prod/trade-signal
```

### Example Request

```
POST https://<api-id>.execute-api.<region>.amazonaws.com/prod/trade-signal
Content-Type: application/json

{
  "symbol": "AAPL",
  "price": 200.5,
  "quantity": 10,
  "action": "BUY"
}
```

- `symbol`: Stock symbol (string)
- `price`: Price per share (number)
- `quantity`: Number of shares (number)
- `action`: "BUY" or "SELL" (string, case-insensitive)

### Example Response

```
{
  "statusCode": 200,
  "body": "BUY order for AAPL received."
}
```

The parser Lambda will route the request to the appropriate buy or sell Lambda based on the `action` field.

## Configuration

All AWS resources (Lambdas, S3, IAM roles, API Gateway) are defined in `infrastructure/stack.yaml`.

## Development

```bash
# Run tests
npm test

# Local development using SAM
sam local invoke BuyStockFunction
sam local invoke SellStockFunction
sam local invoke SmsParserFunction
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch
3. Submit a pull request
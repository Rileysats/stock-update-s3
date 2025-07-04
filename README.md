# Stock Update S3 Lambda Project

A TypeScript-based AWS Lambda project for managing stock buy/sell transactions, with S3 as persistent storage and infrastructure managed via AWS SAM/CloudFormation.

---

## Overview

This project provides a serverless backend for processing stock buy and sell orders. It is designed for easy integration with automation tools like the iPhone Shortcuts app, allowing you to trigger trades via simple HTTP POST requests.

**Key Components:**
- **Buy Stock Lambda:** Handles stock purchase requests.
- **Sell Stock Lambda:** Handles stock sale requests.
- **Parser Lambda:** Receives trade signals and routes them to the correct function.
- **S3 Bucket:** Stores and updates your stock portfolio.
- **IAM Roles:** Securely manages Lambda permissions.
- **API Gateway:** Exposes a REST endpoint for trade signals.

---

## Architecture

- **AWS Lambda:** TypeScript-based functions for buy, sell, and parser logic.
- **Amazon S3:** Stores and updates stock portfolio data.
- **API Gateway:** Exposes a `/trade-signal` endpoint for triggering trades.
- **CloudFormation/SAM:** Infrastructure as Code (see [`infrastructure/stack.yaml`](infrastructure/stack.yaml)).

---

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
│   ├── local_buy.ts              # Local test runner for buy
│   └── local_sell.ts             # Local test runner for sell
├── jest.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## Prerequisites

- Node.js (v14 or later)
- AWS CLI configured with credentials
- AWS SAM CLI (for local testing/deployment)
- TypeScript

---

## Installation

```bash
npm install
npm run build
```

---

## Deployment

```bash
./scripts/deploy.sh
```
This script will package and deploy the stack using AWS SAM and CloudFormation, as defined in [`infrastructure/stack.yaml`](infrastructure/stack.yaml).

---

## Lambda Functions

### Buy Stock Lambda
- Processes stock purchase transactions.
- Updates S3 with new stock quantities.
- Validates purchase requests.

### Sell Stock Lambda
- Processes stock sale transactions.
- Updates S3 with new stock quantities.
- Validates available stock before sale.

### Parser Lambda
- Receives trade signals (e.g., from API Gateway or iPhone Shortcuts).
- Parses and routes requests to the appropriate Lambda (buy or sell).

---

## API Usage: Triggering the sms-parser Lambda

You can trigger the `sms-parser` Lambda via an HTTP POST request to the API Gateway endpoint. This is ideal for use with the iPhone Shortcuts app or any HTTP client.

**Endpoint:**
```
POST https://<api-id>.execute-api.<region>.amazonaws.com/prod/trade-signal
```

**Request Headers:**
```
Content-Type: application/json
```

**Request Body Example:**
```json
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

**Example Success Response:**
```json
{
  "statusCode": 200,
  "body": "BUY order for AAPL received."
}
```

**How to use with iPhone Shortcuts:**
- Use the "Get Contents of URL" action.
- Set method to POST.
- Set the URL to your API Gateway endpoint.
- Set the request body as JSON (see above).
- Set the header `Content-Type` to `application/json`.

---

## Configuration

All AWS resources (Lambdas, S3, IAM roles, API Gateway) are defined in [`infrastructure/stack.yaml`](infrastructure/stack.yaml).

---

## Development

```bash
# Run tests
npm test

# Local development using SAM
sam local invoke BuyStockFunction
sam local invoke SellStockFunction
sam local invoke SmsParserFunction

# Or use the provided local runners
npm run build
node src/local_buy.ts
node src/local_sell.ts
```

---

## License

MIT

---

## Contributing

1. Fork the repository
2. Create your feature branch
3. Submit a pull request

---
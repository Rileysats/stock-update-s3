import { Context } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { Readable } from 'stream';
import { handler } from '../index';

// Mock S3 Client
const s3Mock = mockClient(S3Client);

// Mock portfolio data
const mockPortfolio = {
    stocks: [
        {
            symbol: "VAS.AX",
            quantity: 19,
            averagePrice: 98.87
        }
    ],
    lastUpdated: new Date().toISOString()
};

describe('Sell Stock Lambda Function', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        s3Mock.reset();
        
        // Set up environment variables
        process.env.BUCKET_NAME = 'test-bucket';
        process.env.AWS_REGION = 'us-east-1';

        // Mock S3 getObject response
        s3Mock.on(GetObjectCommand).resolves({
            Body: Readable.from([JSON.stringify(mockPortfolio)]) as any
        });

        // Mock S3 putObject response
        s3Mock.on(PutObjectCommand).resolves({});
    });

    it('should sell existing stock successfully', async () => {
        const event = {
            symbol: 'VAS.AX',
            quantity: 5,
            price: 100.00
        };

        const context = {} as Context;
        const result = await handler(event, context);

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toHaveProperty('message', 'Transaction processed successfully');
        
        // Verify S3 calls
        const putCall = s3Mock.commandCalls(PutObjectCommand)[0];
        const savedData = JSON.parse(putCall.args[0].input.Body as string);
        
        // Verify updated stock data
        expect(savedData.stocks[0]).toEqual({
            symbol: 'VAS.AX',
            quantity: 14,  // Original 19 - 5 sold
            averagePrice: expect.any(Number)
        });
    });

    it('should reject selling non-existent stock', async () => {
        const event = {
            symbol: 'NONEXISTENT',
            quantity: 5,
            price: 100.00
        };

        const context = {} as Context;
        const result = await handler(event, context);

        expect(result.statusCode).toBe(404);
        expect(JSON.parse(result.body)).toHaveProperty('message', 'Stock with symbol NONEXISTENT not found in portfolio');
    });

    it('should reject selling more than available quantity', async () => {
        const event = {
            symbol: 'VAS.AX',
            quantity: 25,  // Try to sell more than the 19 available
            price: 100.00
        };

        const context = {} as Context;
        const result = await handler(event, context);

        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).message).toContain('Insufficient quantity');
    });

    it('should handle invalid input', async () => {
        const event = {
            symbol: '',
            quantity: 0,
            price: 0
        };

        const context = {} as Context;
        const result = await handler(event, context);

        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body)).toHaveProperty('message');
    });
});
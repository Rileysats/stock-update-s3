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

describe('Buy Stock Lambda Function', () => {
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

    it('should handle new stock purchase successfully', async () => {
        const event = {
            symbol: 'AAPL',
            quantity: 10,
            price: 150.00,
            type: 'BUY' as const
        };

        const context = {} as Context;
        const result = await handler(event, context);

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toHaveProperty('message', 'Transaction processed successfully');
        expect(s3Mock.calls()).toHaveLength(2); // One get, one put

        // Verify the data sent to S3
        const putCall = s3Mock.commandCalls(PutObjectCommand)[0];
        const savedData = JSON.parse(putCall.args[0].input.Body as string);

        const newStock = {
            symbol: event.symbol,
            quantity: event.quantity,
            averagePrice: event.price
        }
        
        mockPortfolio.stocks.push(newStock);
        expect(savedData.stocks).toEqual(mockPortfolio.stocks);
        expect(savedData.lastUpdated).toBeDefined();
    });

    it('should update existing stock holding', async () => {
        const event = {
            symbol: 'VAS.AX',
            quantity: 5,
            price: 100.00,
            type: 'BUY' as const
        };

        const context = {} as Context;
        const result = await handler(event, context);

        expect(result.statusCode).toBe(200);
        expect(s3Mock.calls()).toHaveLength(2);
    });

    it('should reject invalid input', async () => {
        const event = {
            symbol: '',
            quantity: 0,
            price: 0,
            type: 'BUY' as const
        };

        const context = {} as Context;
        const result = await handler(event, context);

        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body)).toHaveProperty('message');
        expect(s3Mock.calls()).toHaveLength(0);
    });

    it('should handle S3 errors gracefully', async () => {
        s3Mock.on(GetObjectCommand).rejects(new Error('S3 Error'));

        const event = {
            symbol: 'AAPL',
            quantity: 10,
            price: 150.00,
            type: 'BUY' as const
        };

        const context = {} as Context;
        const result = await handler(event, context);

        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body)).toHaveProperty('error');
    });
});
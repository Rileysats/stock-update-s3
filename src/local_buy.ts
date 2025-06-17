import { handler } from './functions/buy/index';

async function runLocal() {
    // Test transaction
    const event = {
        symbol: 'REXR',
        quantity: 5,
        price: 40
    };

    // Mock context
    const context = {
        awsRequestId: 'local-test',
        callbackWaitsForEmptyEventLoop: true,
        functionName: 'sell-stock-local',
        functionVersion: 'local',
        invokedFunctionArn: 'local',
        memoryLimitInMB: '128',
        logGroupName: 'local',
        logStreamName: 'local',
        getRemainingTimeInMillis: () => 1000,
        done: () => {},
        fail: () => {},
        succeed: () => {}
    };

    try {
        // Set environment variables
        process.env.AWS_REGION = 'ap-southeast-2';
        process.env.BUCKET_NAME = 'your-bucket-name';
        process.env.NODE_ENV = 'local';

        const result = await handler(event, context);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

runLocal();
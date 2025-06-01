import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { StockHolding, StockTransaction } from '../../shared/types';
import { Readable } from 'stream';

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
});

// async function getStockHolding(symbol: string): Promise<StockHolding | null> {
async function getStockHolding(): Promise<StockHolding | null> {
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: `stocks/portfolio.json`
        });
        
        const response = await s3Client.send(command);
        const stream = response.Body as Readable;
        const chunks: Buffer[] = [];
        
        for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
        }
        
        const data = Buffer.concat(chunks).toString('utf8');

        console.log('Retrieved stock holding data:', data);

        return JSON.parse(data);
    } catch (error) {
        if ((error as any).name === 'NoSuchKey') {
            return null;
        }
        throw error;
    }
}

async function updateStockHolding(holding: StockHolding): Promise<void> {
    try {
        const command = new PutObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: `stocks/portfolio.json`,
            Body: JSON.stringify(holding),
            ContentType: 'application/json'
        });     

        await s3Client.send(command);
    }
    catch (error) {
        console.error('Error updating stock holding:', error);
        throw error;
    }
}

export const handler = async (
    // event: APIGatewayProxyEvent,
    event: StockTransaction,
    context: Context
): Promise<APIGatewayProxyResult> => {
    try {
        // Parse the incoming request body

        // const transaction: StockTransaction = JSON.parse(event);
        const transaction: StockTransaction = event;
        console.log('Received transaction:', transaction);

        // Validate the input
        // if (!transaction.symbol || !transaction.quantity || !transaction.price) {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             message: 'Missing required fields: symbol, quantity, or price'
        //         })
        //     };
        // }

        // Access environment variables
        const bucketName = process.env.BUCKET_NAME;
        if (!bucketName) {
            throw new Error('RECEIPT_BUCKET environment variable is not set');
        }

        await getStockHolding()

        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Transaction processed successfully',
                transaction
            })
        };

    } catch (error) {
        console.error('Error processing transaction:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            })
        };
    }
};
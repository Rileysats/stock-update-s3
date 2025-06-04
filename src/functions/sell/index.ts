import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Portfolio, StockHolding, StockTransaction } from '../../shared/types';
import { Readable } from 'stream';


export const handler = async (
    // event: APIGatewayProxyEvent,
    event: StockTransaction,
    context: Context
): Promise<APIGatewayProxyResult> => {
    try {
        const transaction: StockTransaction = event;
        console.log('Received transaction:', transaction);

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
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getStockPortfolio, getStockHolding } from '../../shared/helpers';
import { Portfolio, StockHolding, StockTransaction } from '../../shared/types';
import { Readable } from 'stream';

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
});

async function updateStockHolding(updatedStock: StockHolding, portfolio: Portfolio): Promise<void> {
    try {
        const stockIndex = portfolio.stocks.findIndex(
            stock => stock.symbol === updatedStock.symbol
        );

        if (stockIndex === -1) { // If stock does not exist, add it
            console.log(`Adding new stock holding for ${updatedStock.symbol}`);
            portfolio.stocks.push(updatedStock);
        } else { // If stock exists, update it
            console.log(`Updating existing stock holding for ${updatedStock.symbol}`);
            portfolio.stocks[stockIndex] = updatedStock;
        }

        portfolio.lastUpdated = new Date().toISOString();
        console.log('Updated portfolio:', portfolio);

        const command = new PutObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: 'stocks/portfolio.json',
            Body: JSON.stringify(portfolio, null, 2),
            ContentType: 'application/json'
        });     

        await s3Client.send(command);
    } catch (error) {
        console.error('Error updating stock holding:', error);
        throw error;
    }
}


async function calculateUpdatedHolding(
    transaction: StockTransaction,
    existingHolding: StockHolding | null
): Promise<StockHolding> {
    if (!existingHolding) {
        // If no existing holding, create a new one
        return {
            symbol: transaction.symbol,
            quantity: transaction.quantity,
            averagePrice: transaction.price
        };
    }

    // Update existing holding
    const totalCost = existingHolding.averagePrice * existingHolding.quantity + transaction.price * transaction.quantity;
    const totalQuantity = existingHolding.quantity + transaction.quantity;

    return {
        ...existingHolding,
        quantity: totalQuantity,
        averagePrice: totalCost / totalQuantity
    };
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
        if (!transaction.symbol || !transaction.quantity || !transaction.price) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Missing required fields: symbol, quantity, or price'
                })
            };
        }

        // Access environment variables
        const bucketName = process.env.BUCKET_NAME;
        if (!bucketName) {
            throw new Error('RECEIPT_BUCKET environment variable is not set');
        }

        const portfolio: Portfolio = await getStockPortfolio();

        const stockData: StockHolding | null = await getStockHolding(transaction.symbol, portfolio)

        let updatedStockData: StockHolding ;
        if (!stockData) {
            console.log(`No existing stock holding found for ${transaction.symbol}. Creating new holding.`);
            updatedStockData = {
                symbol: transaction.symbol,
                quantity: transaction.quantity,
                averagePrice: transaction.price
            };
        } else {
            console.log(`Found existing stock holding for ${transaction.symbol}:`, stockData);
            updatedStockData = await calculateUpdatedHolding(transaction, stockData)
            console.log('Updated stock holding:', updatedStockData);
        }
    


        await updateStockHolding(updatedStockData, portfolio)

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
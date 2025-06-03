import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Portfolio, StockHolding, StockTransaction } from '../../shared/types';
import { Readable } from 'stream';

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
});

async function getStockPortfolio(): Promise<Portfolio> {
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
        const portfolio: Portfolio = JSON.parse(data);

        if (!portfolio.stocks || !Array.isArray(portfolio.stocks)) {
            console.warn('No stocks array found in portfolio');
            return { stocks: [], lastUpdated: new Date().toISOString() };
        }

        console.log('Retrieved stock holding data:', portfolio);

        return portfolio;
    } catch (error) {
    if ((error as any).name === 'NoSuchKey') { // TODO: Why this??
        console.log('Portfolio file not found, returning empty array');
        return { stocks: [], lastUpdated: new Date().toISOString() };
    }
    throw error;
    }
}

async function getStockHolding(symbol: string, portfolio: Portfolio): Promise<StockHolding | null> {
    // Find the specific stock in the portfolio
    const stockHolding = portfolio.stocks.find(
        (stock: StockHolding) => stock.symbol === symbol
    );

    return stockHolding || null;
}

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
        const updatedStockData: StockHolding = await calculateUpdatedHolding(transaction, stockData)
        console.log('Updated stock holding:', updatedStockData);


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
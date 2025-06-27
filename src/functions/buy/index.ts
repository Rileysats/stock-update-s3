import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getStockPortfolio, getStockHolding, updateStockHolding } from '../../shared/helpers';
import { Portfolio, StockHolding, StockTransaction } from '../../shared/types';
import { getLocalStockPortfolio, getLocalStockHolding, updateLocalStockHolding } from '../../shared/local-helpers';

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
});

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
    event: StockTransaction,
    context: Context
): Promise<APIGatewayProxyResult> => {
    try {
        const isLocal = process.env.NODE_ENV === 'local';
        console.log('Environment:', isLocal ? 'Local' : 'Cloud');
        const getPortfolio = isLocal ? getLocalStockPortfolio : getStockPortfolio;
        const getHolding = isLocal ? getLocalStockHolding : getStockHolding;
        const updateHolding = isLocal ? updateLocalStockHolding : updateStockHolding;

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

        const portfolio: Portfolio = await getPortfolio();

        const stockData: StockHolding | null = await getHolding(transaction.symbol, portfolio)

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
    
        const stockIndex = portfolio.stocks.findIndex(
            stock => stock.symbol === updatedStockData.symbol
        );

        if (stockIndex === -1) { // If stock does not exist, add it
            console.log(`Adding new stock holding for ${updatedStockData.symbol}`);
            portfolio.stocks.push(updatedStockData);
        } else { // If stock exists, update it
            console.log(`Updating existing stock holding for ${updatedStockData.symbol}`);
            portfolio.stocks[stockIndex] = updatedStockData;
        }

        await updateHolding(portfolio)

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
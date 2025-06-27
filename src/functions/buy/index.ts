import { APIGatewayProxyResult, Context } from 'aws-lambda';
import { getStockPortfolio, getStockHolding, updateStockHolding } from '../../shared/helpers';
import { Portfolio, StockHolding, StockTransaction } from '../../shared/types';
import { getLocalStockPortfolio, getLocalStockHolding, updateLocalStockHolding } from '../../shared/local-helpers';

// Calculate the updated stock holding after a buy transaction
function calculateUpdatedHolding(
    transaction: StockTransaction,
    existingHolding: StockHolding | null
): StockHolding {
    if (!existingHolding) {
        return {
            symbol: transaction.symbol,
            quantity: transaction.quantity,
            averagePrice: transaction.price
        };
    }
    const totalCost = existingHolding.averagePrice * existingHolding.quantity + transaction.price * transaction.quantity;
    const totalQuantity = existingHolding.quantity + transaction.quantity;
    return {
        ...existingHolding,
        quantity: totalQuantity,
        averagePrice: totalCost / totalQuantity
    };
}

// Validate the incoming transaction
function validateTransaction(transaction: StockTransaction): string | null {
    if (!transaction.symbol) return 'Missing required field: symbol';
    if (!transaction.quantity) return 'Missing required field: quantity';
    if (!transaction.price) return 'Missing required field: price';
    return null;
}

export const handler = async (
    event: StockTransaction,
    context: Context
): Promise<APIGatewayProxyResult> => {
    try {
        const isLocal = process.env.NODE_ENV === 'local';
        const getPortfolio = isLocal ? getLocalStockPortfolio : getStockPortfolio;
        const getHolding = isLocal ? getLocalStockHolding : getStockHolding;
        const updateHolding = isLocal ? updateLocalStockHolding : updateStockHolding;

        const transaction: StockTransaction = event;
        console.log('Received transaction:', transaction);

        // Validate input
        const validationError = validateTransaction(transaction);
        if (validationError) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: validationError })
            };
        }

        // Check environment variable
        const bucketName = process.env.BUCKET_NAME;
        if (!bucketName) {
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'BUCKET_NAME environment variable is not set' })
            };
        }

        // Get portfolio and holding
        const portfolio: Portfolio = await getPortfolio();
        const stockData: StockHolding | null = await getHolding(transaction.symbol, portfolio);

        // Calculate updated holding
        const updatedStockData: StockHolding = calculateUpdatedHolding(transaction, stockData);
        console.log('Updated stock holding:', updatedStockData);

        // Update or add the stock in the portfolio
        const stockIndex = portfolio.stocks.findIndex(stock => stock.symbol === updatedStockData.symbol);
        if (stockIndex === -1) {
            portfolio.stocks.push(updatedStockData);
            console.log(`Added new stock holding for ${updatedStockData.symbol}`);
        } else {
            portfolio.stocks[stockIndex] = updatedStockData;
            console.log(`Updated existing stock holding for ${updatedStockData.symbol}`);
        }

        await updateHolding(portfolio);

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
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getStockPortfolio, getStockHolding, updateStockHolding } from '../../shared/helpers';
import { Portfolio, StockHolding, StockTransaction } from '../../shared/types';
import { getLocalStockPortfolio, getLocalStockHolding, updateLocalStockHolding } from '../../shared/local-helpers';

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
});

export const handler = async (
    // event: APIGatewayProxyEvent,
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

        // TODO: BELOW NEEDS REFACTORING
        // Make checks more efficient
        // More resuable code

        // check if stock if not in portfolio, return error
        const portfolio: Portfolio = await getPortfolio();
        const stockHolding: StockHolding | null = await getHolding(transaction.symbol, portfolio);

        if (!stockHolding) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: `Stock with symbol ${transaction.symbol} not found in portfolio`
                })
            };
        }

        // Calculate the updated stock holding  
        let updatedStock: StockHolding;
        if (stockHolding.quantity < transaction.quantity) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: `Insufficient quantity for stock ${transaction.symbol}. Available: ${stockHolding.quantity}, Requested: ${transaction.quantity}`
                })
            };
        } else if (stockHolding.quantity === transaction.quantity) {
            console.log(`Removing stock holding for ${transaction.symbol} as quantity is zero after transaction.`);
            updatedStock = { ...stockHolding, quantity: 0 };

            // Create a new array without the stock to remove
            const updatedStocks = portfolio.stocks.filter(stock => stock.symbol !== transaction.symbol);

            // Create new portfolio object
            const updatedPortfolio = {
                stocks: updatedStocks,
                lastUpdated: new Date().toISOString()
            };

            await updateHolding(updatedPortfolio);

        } else {
            console.log(`Updating stock holding for ${transaction.symbol}.`);
            updatedStock = {
                ...stockHolding,
                quantity: stockHolding.quantity - transaction.quantity
            };
            const stockIndex = portfolio.stocks.findIndex(
                stock => stock.symbol === updatedStock.symbol
            );

            portfolio.stocks[stockIndex] = updatedStock;
            await updateHolding(portfolio);
        }

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
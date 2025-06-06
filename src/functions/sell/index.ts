import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getStockPortfolio, getStockHolding } from '../../shared/helpers';
import { Portfolio, StockHolding, StockTransaction } from '../../shared/types';
import { Readable } from 'stream';

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
});

// async function getStockPortfolio(): Promise<Portfolio> {
//     try {
//         const command = new GetObjectCommand({
//             Bucket: process.env.BUCKET_NAME,
//             Key: `stocks/portfolio.json`
//         });
        
//         const response = await s3Client.send(command);
//         const stream = response.Body as Readable;
//         const chunks: Buffer[] = [];
        
//         for await (const chunk of stream) {
//             chunks.push(Buffer.from(chunk));
//         }
        
//         const data = Buffer.concat(chunks).toString('utf8');
//         const portfolio: Portfolio = JSON.parse(data);

//         if (!portfolio.stocks || !Array.isArray(portfolio.stocks)) {
//             console.warn('No stocks array found in portfolio');
//             return { stocks: [], lastUpdated: new Date().toISOString() };
//         }

//         console.log('Retrieved stock holding data:', portfolio);

//         return portfolio;
//     } catch (error) {
//     if ((error as any).name === 'NoSuchKey') { // TODO: Why this??
//         console.log('Portfolio file not found, returning empty array');
//         return { stocks: [], lastUpdated: new Date().toISOString() };
//     }
//     throw error;
//     }
// }

// async function getStockHolding(symbol: string, portfolio: Portfolio): Promise<StockHolding | null> {
//     // Find the specific stock in the portfolio
//     const stockHolding = portfolio.stocks.find(
//         (stock: StockHolding) => stock.symbol === symbol
//     );

//     return stockHolding || null;
// }

export const handler = async (
    // event: APIGatewayProxyEvent,
    event: StockTransaction,
    context: Context
): Promise<APIGatewayProxyResult> => {
    try {
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

        // check if stock if not in portfolio, return error
        const portfolio: Portfolio = await getStockPortfolio();
        const stockHolding: StockHolding | null = await getStockHolding(transaction.symbol, portfolio);

        if (!stockHolding) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: `Stock with symbol ${transaction.symbol} not found in portfolio`
                })
            };
        }

        // Calculate the updated stock holding  
        let updatedStockData: StockHolding;
        if (stockHolding.quantity < transaction.quantity) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: `Insufficient quantity for stock ${transaction.symbol}. Available: ${stockHolding.quantity}, Requested: ${transaction.quantity}`
                })
            };
        } else if (stockHolding.quantity === transaction.quantity) {
            console.log(`Removing stock holding for ${transaction.symbol} as quantity is zero after transaction.`);
            updatedStockData = { ...stockHolding, quantity: 0 };
        } else {
            console.log(`Updating stock holding for ${transaction.symbol}.`);
            updatedStockData = {
                ...stockHolding,
                quantity: stockHolding.quantity - transaction.quantity,
                averagePrice: ((stockHolding.averagePrice * stockHolding.quantity) - (transaction.price * transaction.quantity)) / (stockHolding.quantity - transaction.quantity)
            };
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
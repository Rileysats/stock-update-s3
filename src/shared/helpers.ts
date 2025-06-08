import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Portfolio, StockHolding } from './types';
import { Readable } from 'stream';

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
});

export async function getStockPortfolio(): Promise<Portfolio> {
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
        if ((error as any).name === 'NoSuchKey') {
            console.log('Portfolio file not found, returning empty array');
            return { stocks: [], lastUpdated: new Date().toISOString() };
        }
        throw error;
    }
}

export async function getStockHolding(symbol: string, portfolio: Portfolio): Promise<StockHolding | null> {
    const stockHolding = portfolio.stocks.find(
        (stock: StockHolding) => stock.symbol === symbol
    );
    return stockHolding || null;
}

export async function updateStockHolding(portfolio: Portfolio): Promise<void> {
    try {
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

export const s3ClientInstance = s3Client;
import fs from 'fs/promises';
import path from 'path';
import { Portfolio, StockHolding } from './types';

const LOCAL_PORTFOLIO_PATH = path.join(__dirname, '../../portfolio.json');

export async function getLocalStockPortfolio(): Promise<Portfolio> {
    try {
        const data = await fs.readFile(LOCAL_PORTFOLIO_PATH, 'utf8');
        const portfolio: Portfolio = JSON.parse(data);
        
        if (!portfolio.stocks || !Array.isArray(portfolio.stocks)) {
            return { stocks: [], lastUpdated: new Date().toISOString() };
        }
        
        return portfolio;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return { stocks: [], lastUpdated: new Date().toISOString() };
        }
        throw error;
    }
}

export async function updateLocalStockHolding(portfolio: Portfolio): Promise<void> {
    await fs.writeFile(
        LOCAL_PORTFOLIO_PATH,
        JSON.stringify(portfolio, null, 2),
        'utf8'
    );
}

export async function getLocalStockHolding(symbol: string, portfolio: Portfolio): Promise<StockHolding | null> {
    return portfolio.stocks.find(stock => stock.symbol === symbol) || null;
}
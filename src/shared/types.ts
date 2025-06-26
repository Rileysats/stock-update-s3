export interface StockTransaction {
    symbol: string;             // Stock symbol (e.g., 'AAPL')
    quantity: number;           // Number of shares
    price: string;             // Price per share
    timestamp?: Date;          // Optional transaction timestamp
}

export interface StockHolding {
    symbol: string;
    quantity: number;
    averagePrice: number;
}

export interface Portfolio {
    stocks: StockHolding[];
    lastUpdated: string;
}
// Example of extending interfaces
// export interface StockHolding extends Pick<StockTransaction, 'symbol' | 'quantity'> {
//     averageCost: number;
//     lastUpdated: Date;
// }
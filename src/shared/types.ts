export interface StockTransaction {
    symbol: string;             // Stock symbol (e.g., 'AAPL')
    quantity: number;           // Number of shares
    price: number;             // Price per share
    timestamp?: Date;          // Optional transaction timestamp
    type: 'BUY' | 'SELL';     // Transaction type using union type
}

export interface StockHolding {
    symbol: string;
    quantity: number;
    averagePrice: number;
}

// Example of extending interfaces
// export interface StockHolding extends Pick<StockTransaction, 'symbol' | 'quantity'> {
//     averageCost: number;
//     lastUpdated: Date;
// }
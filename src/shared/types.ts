export interface StockTransaction {
    symbol: string;
    quantity: number;
    price: number;
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
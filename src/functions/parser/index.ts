import { Lambda } from 'aws-sdk';
import { StockTransaction } from '../../shared/types';

const querystring = require('querystring');
const lambda = new Lambda();

export const handler = async (event: any) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const parsed = JSON.parse(event.body);
  const { symbol, price, quantity } = parsed as StockTransaction;
  const action = parsed.action;
  console.log('Parsed body:', { symbol, price, quantity, action });

  const payload: StockTransaction = {
    symbol,
    quantity,
    price: typeof price === 'number' ? price : 0,
  };

  const targetFunction = action === 'BUY' ? 'buyStockLambda' : 'sellStockLambda';

  await lambda.invoke({
    FunctionName: targetFunction,
    Payload: JSON.stringify(payload),
  }).promise();

  return {
    statusCode: 200,
    body: `${action} order for ${symbol} received.`,
  };
};
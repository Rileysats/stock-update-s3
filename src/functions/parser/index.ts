// smsParserLambda.ts
import { Lambda } from 'aws-sdk';

const lambda = new Lambda();

export const handler = async (event: any) => {
  const parsedBody = JSON.parse(event.body);
  console.log('Parsed body:', parsedBody);

  const smsText = parsedBody.Body?.trim().toUpperCase() || '';
  console.log('Received SMS:', smsText);
  const match = smsText.match(/(BUY|SELL)\s+([A-Z.]+)\s+(\d+)(?:\s+@(\w+)(?:\s+(\d+(\.\d+)?))?)?/);

  if (!match) {
    return {
      statusCode: 400,
      body: 'Invalid command format',
    };
  }

  const [ , action, symbol, quantity, orderType = 'MARKET', price = null ] = match;

  const payload = {
    action,
    symbol,
    quantity: parseInt(quantity),
    orderType,
    price: price ? parseFloat(price) : undefined,
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

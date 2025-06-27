import { Lambda } from 'aws-sdk';
import { StockTransaction } from '../../shared/types';

const lambda = new Lambda();

export const handler = async (event: any) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const parsed = JSON.parse(event.body);
  const payload: StockTransaction  = parsed;

  const action = parsed.action?.toUpperCase();
  console.log('Parsed body:', JSON.stringify(payload, null, 2));

  const targetFunction = action === 'BUY' ? 'buy-stock' : 'sell-stock';

  await lambda.invoke({
    FunctionName: targetFunction,
    Payload: JSON.stringify(payload),
  }).promise();

  return {
    statusCode: 200,
    body: `${action} order for ${payload.symbol} received.`,
  };
};

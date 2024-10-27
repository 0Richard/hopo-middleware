// src/resolvers/js/dwelling/getMyDwelling.js
import { util } from '@aws-appsync/utils';
import { calculateTotals } from '../../utils/calculations';

export function request(ctx) {
  const sub_id = ctx.identity.sub;

  return {
    operation: 'Query',
    query: {
      expression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionValues: util.dynamodb.toMapValues({
        ':pk': `SUB#${sub_id}`,
        ':sk': 'DWELLING#'
      })
    },
    limit: 1
  };
}

export function response(ctx) {
  if (!ctx.result.items || ctx.result.items.length === 0) {
    return null;
  }

  const dwelling = ctx.result.items[0];
  
  // Get rooms count
  const roomsResult = util.dynamodb.query({
    operation: 'Query',
    query: {
      expression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionValues: {
        ':pk': `SUB#${ctx.identity.sub}`,
        ':sk': 'ROOM#'
      }
    }
  });

  // Get items and calculate totals
  const itemsResult = util.dynamodb.query({
    operation: 'Query',
    query: {
      expression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionValues: {
        ':pk': `SUB#${ctx.identity.sub}`,
        ':sk': 'ITEM#'
      }
    }
  });

  const totals = calculateTotals(itemsResult.items);

  return {
    ...dwelling,
    totalRooms: roomsResult.items.length,
    totalItems: totals.itemCount,
    totalValue: totals.totalValue
  };
}

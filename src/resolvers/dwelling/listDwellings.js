// src/resolvers/dwelling/listDwellings.js
import { createQueryExpression } from '../../utils/dynamodb';
import { isAdmin } from '../../utils/auth';

export function request(ctx) {
  const sub_id = ctx.identity.sub;
  
  if (!isAdmin(ctx)) {
    return {
      operation: 'Query',
      query: createQueryExpression(`SUB#${sub_id}`, 'DWELLING#')
    };
  }

  // Admin query logic
  return {
    operation: 'Scan'
  };
}

export function response(ctx) {
  return ctx.result.items;
}
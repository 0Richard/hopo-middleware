// src/resolvers/dwelling/getDwelling.js
import { createKey, handleResult } from '../../utils/dynamodb';
import { validateOwnership } from '../../utils/auth';

export function request(ctx) {
  const { id } = ctx.args;
  const sub_id = ctx.identity.sub;

  return {
    operation: 'GetItem',
    key: createKey(sub_id, 'DWELLING', id)
  };
}

export function response(ctx) {
  const result = ctx.result;
  if (result) {
    validateOwnership(ctx, result.sub_id);
  }
  return handleResult(result);
}
// src/utils/dynamodb.js
import { util } from '@aws-appsync/utils';

export function createKey(sub_id, type, id) {
  return util.dynamodb.toKey({
    PK: `SUB#${sub_id}`,
    SK: `${type}#${id}`
  });
}

export function createQueryExpression(pk, sk_prefix) {
  return {
    expression: 'PK = :pk and begins_with(SK, :sk)',
    expressionValues: util.dynamodb.toMapValues({
      ':pk': pk,
      ':sk': sk_prefix
    })
  };
}

export function handleResult(result) {
  if (!result) return null;
  // Common result transformation logic
  return result;
}
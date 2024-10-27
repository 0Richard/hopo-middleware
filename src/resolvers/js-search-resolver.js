// src/resolvers/js/search/search.js
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const sub_id = ctx.identity.sub;
  const { term, entityType } = ctx.args;
  
  // Base query for user's data
  const baseQuery = {
    PK: `SUB#${sub_id}`
  };

  if (entityType) {
    return {
      operation: 'Query',
      query: {
        expression: 'PK = :pk AND begins_with(SK, :sk)',
        expressionValues: util.dynamodb.toMapValues({
          ':pk': baseQuery.PK,
          ':sk': `${entityType.toUpperCase()}#`
        }),
        filter: buildSearchFilter(term)
      }
    };
  }

  // Search across all entity types
  return {
    operation: 'Query',
    query: {
      expression: 'PK = :pk',
      expressionValues: util.dynamodb.toMapValues({
        ':pk': baseQuery.PK
      }),
      filter: buildSearchFilter(term)
    }
  };
}

export function response(ctx) {
  const items = ctx.result.items || [];

  // Group results by entity type
  const results = {
    dwellings: [],
    rooms: [],
    items: []
  };

  items.forEach(item => {
    switch (item.type) {
      case 'dwelling':
        results.dwellings.push(item);
        break;
      case 'room':
        results.rooms.push(item);
        break;
      case 'item':
        results.items.push(item);
        break;
    }
  });

  return results;
}

function buildSearchFilter(term) {
  return {
    expression: 'contains(#name, :term)',
    expressionNames: {
      '#name': 'name'
    },
    expressionValues: util.dynamodb.toMapValues({
      ':term': term.toLowerCase()
    })
  };
}

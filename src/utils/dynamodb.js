// src/utils/dynamodb.js
export function buildFilterExpression(filters) {
    const expressions = [];
    const expressionNames = {};
    const expressionValues = {};
  
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        expressions.push(`#${key} = :${key}`);
        expressionNames[`#${key}`] = key;
        expressionValues[`:${key}`] = value;
      }
    });
  
    return {
      expression: expressions.join(' AND '),
      expressionNames,
      expressionValues: util.dynamodb.toMapValues(expressionValues)
    };
  }
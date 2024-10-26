'use strict'

/**
 *@namespace Dependencies
 */
import { Logger } from "./320_fnu_logHandler_wp.js";
import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
  QueryCommand,
  ScanCommand,
  PutItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { getEnvVars } from "./350_fnu_environmentVariables_wp.js";

/**
 * Environment variables.
 *
 * @const {object}
 */
const environment = getEnvVars();

/**
 * A client for accessing the DynamoDB database.
 *
 * @const {DynamoDBClient}
 */
const client = new DynamoDBClient(environment.awsClientConfig);

/**
 * @namespace functions
 */

/**
 * Get an item from DynamoDB table using the specified key.
 *
 * @memberof Shared_Functions
 * @param {string} tableName The name of the DynamoDB table to be written to.
 * @param {object} key The key object.
 * @param {string} key.name The name of the key to use (e.g. 'id', 'name', etc.).
 * @param {string} key.value The value of the key to use (e.g. '123456789').
 * @param {string} [attributes=undefined] Comma separated list of attributes to retrieve for the item. Default will return all attributes.
 * @returns {(Item|undefined)} The Dynamo DB Item object or undefined if not found.
 */
export async function getItemFromDynamoDB(
  tableName,
  key,
  attributes = undefined
) {
  const params = {
    TableName: tableName,
    Key: {
      [key.name]: { S: key.value },
    },
    ProjectionExpression: attributes,
  };
  try {
    const command = new GetItemCommand(params);
    const response = await client.send(command);
    return response.Item;
  } catch (error) {
    console.error(error);
    return false;
  }
}

/**
 * Create a new item in a DynamoDB table.
 *
 * @memberof Shared_Functions
 * @param {string} tableName - The name of the DynamoDB table to be written to.
 * @param {(object|null)} key - The key object. If null will default to 'id' as the key name and the value of the 'id' attribute.
 * @param {string} key.name The name of the key to use (e.g. 'id', 'name', etc.).
 * @param {object} attributes Object of attribute key/value pairs e.g. { "aggregate_user_balance_wxx": { N: 11.123456.toString() } } to update on the item. The values must be an object with the key specifying the value type e.g. S for string or N for number. Decimals must be type N and value converted to string. Ensure you supply the partition key as part of the attributes object.
 * @returns {boolean} - True/false depending on successful create. Will return false if the item already exists.
 */
export async function createItemInDynamoDB(tableName, key = null, attributes) {
  if (key === null) {
    key = {
      name: "id",
      value: attributes.id,
    }
  }
  // Set the key value.
  attributes[key.name] = key.value;

  // Add the created_at and updated_at attributes.
  const timestamp = new Date().toISOString();
  attributes.created_at = timestamp;
  attributes.updated_at = timestamp;

  // Convert attributes object into DynamoDB Record using the 
  // marshall helper function from the @aws-sdk/util-dynamodb package.
  const params = {
    TableName: tableName,
    Item: marshall(attributes),
    ConditionExpression: `attribute_not_exists(${key.name})`,
  };

  try {
    const command = new PutItemCommand(params);
    await client.send(command);
    return true;
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      Logger.error(`Error: Item with key name '${key.name}' value '${key.value}' already exists in table '${tableName}'.`);
    }
    else {
      console.error(error);
    }
    return false;
  }
}

/**
 * Update an existing item in a DynamoDB table using the specified key.
 *
 * @memberof Shared_Functions
 * @param {string} tableName - The name of the DynamoDB table to be written to.
 * @param {object} key - The key object.
 * @param {string} key.name The name of the key to use (e.g. 'id', 'name', etc.).
 * @param {string} key.value The value of the key to use (e.g. '123456789').
 * @param {object} attributes Object of attribute key/value pairs e.g. { "aggregate_user_balance_wxx": { N: 11.123456.toString() } } to update on the item. The values must be an object with the key specifying the value type e.g. S for string or N for number. Decimals must be type N and value converted to string.
 * @returns {boolean} - True/false depending on successful update.
 */
export async function updateItemInDynamoDB(tableName, key, attributes) {
  // Update the updated_at attribute.
  attributes.updated_at = {
    S: new Date().toISOString()
  };

  const updateExpression = Object.keys(attributes)
    .map((key) => `#${key} = :${key}`)
    .join(", ");

  const expressionAttributeNames = Object.keys(attributes).reduce(
    (acc, key) => {
      acc[`#${key}`] = key;
      return acc;
    },
    {}
  );

  const expressionAttributeValues = Object.entries(attributes).reduce(
    (acc, [key, value]) => {
      acc[`:${key}`] = value;
      return acc;
    },
    {}
  );

  const params = {
    TableName: tableName,
    Key: {
      [key.name]: { S: key.value },
    },
    UpdateExpression: `SET ${updateExpression}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    // ReturnValues: 'ALL_NEW'
  };
  try {
    const command = new UpdateItemCommand(params);
    await client.send(command);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

/**
 * Delete an item from DynamoDB table using the specified key.
 *
 * @memberof Shared_Functions
 * @param {string} tableName The name of the DynamoDB table to be written to.
 * @param {object} key The key object.
 * @param {string} key.name The name of the key to use (e.g. 'id', 'name', etc.).
 * @param {string} key.value The value of the key to use (e.g. '123456789').
 * @returns {boolean} - True/false depending on successful deletion.
 */
export async function deleteItemInDynamoDB(
  tableName,
  key
) {
  const params = {
    TableName: tableName,
    Key: {
      [key.name]: { S: key.value },
    }
  };
  try {
    const command = new DeleteItemCommand(params);
    await client.send(command);
    return true;
  } catch (error) {
    Logger.error(`fn deleteItemItemDynamoDB unable to delete item with key name '${key.name}' value '${key.value}' from table '${tableName}'.`);
    console.error(error);
    return false;
  }
}

/**
 * Scan items from DynamoDB table using the specified key.
 *
 * @memberof Shared_Functions
 * @param {string} tableName The name of the DynamoDB table to be written to.
 * @param {object} key The key object.
 * @param {string} key.name The name of the key to use (e.g. 'id', 'name', etc.).
 * @param {string} key.value The value of the key to use (e.g. '123456789').
 * @param {string} [attributes=undefined] Comma separated list of attributes to retrieve for the item. Default will return all attributes.
 * @returns {(array<Item>|null)} The array of Dynamo DB Item objects or null if not found.
 */
export async function scanItemFromDynamoDB(
  tableName,
  key,
  attributes = undefined
) {
  const filterExpression = `#${key.name} = :value`;
  const expressionAttributeNames = {
    [`#${key.name}`]: key.name,
  };
  const expressionAttributeValues = {
    ":value": { S: key.value },
  };

  const params = {
    TableName: tableName,
    FilterExpression: filterExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ProjectionExpression: attributes,
  };

  try {
    const command = new ScanCommand(params);
    const response = await client.send(command);

    if (response.Count > 0) {
      return response.Items;
    } else {
      return null;
    }
  } catch (error) {
    console.error(error);
    return false;
  }
}

/**
 * Query items from DynamoDB table using the specified key.
 *
 * @memberof Shared_Functions
 * @param {string} tableName The name of the DynamoDB table to be written to.
 * @param {object} key The key object.
 * @param {string} key.name The name of the key to use (e.g. 'id', 'name', etc.).
 * @param {string} key.value The value of the key to use (e.g. '123456789').
 * @param {string} key.index The name of the index to use (e.g. 'id-index', 'name-index', etc.).
 * @param {object} [filterConditions=undefined] The filter conditions object of key/value pairs.
 * @param {string} [attributes=undefined] Comma separated list of attributes to retrieve for the item. Default will return all attributes.
 * @returns {(array<Item>|null)} The array of Dynamo DB Item objects or null if not found.
 */
export async function queryItemsFromDynamoDB(
  tableName,
  key,
  filterConditions,
  attributes = undefined
) {
  const keyConditionExpression = `#${key.name} = :${key.name}`;
  const expressionAttributeNames = {
    [`#${key.name}`]: key.name,
  };
  const expressionAttributeValues = {
    [`:${key.name}`]: marshall({ value: key.value }).value,
  };

  const filterExpressionParts = [];
  if (filterConditions) {
    for (const [filterKey, filterValue] of Object.entries(filterConditions)) {
      filterExpressionParts.push(`#${filterKey} = :${filterKey}`);
      expressionAttributeNames[`#${filterKey}`] = filterKey;
      expressionAttributeValues[`:${filterKey}`] = marshall({ value: filterValue }).value;
    }
  }

  const params = {
    TableName: tableName,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  };

  if (key.index) {
    params.IndexName = key.index;
  }
  if (attributes) {
    params.ProjectionExpression = attributes;
  }
  if (filterExpressionParts.length > 0) {
    params.FilterExpression = filterExpressionParts.join(" AND ");
  }

  try {
    const command = new QueryCommand(params);
    const response = await client.send(command);
    if (response.Count > 0) {
      return response.Items;
    } else {
      return null;
    }
  } catch (error) {
    console.error(error);
    return false;
  }
}

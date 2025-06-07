import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const field = ctx.info.fieldName;
  const args = ctx.args || {};
  const sub = ctx.identity.sub;

  switch (field) {
    // Dwelling operations
    case 'getDwelling':
      return {
        operation: 'GetItem',
        key: util.dynamodb.toMapValues({
          PK: `SUB#${sub}`,
          SK: `DWELLING#${args.id}`
        })
      };
    case 'listDwellings':
      return {
        operation: 'Query',
        query: {
          expression: 'PK = :pk AND begins_with(SK, :sk) AND isDeleted = :nd',
          expressionValues: util.dynamodb.toMapValues({
            ':pk': `SUB#${sub}`,
            ':sk': 'DWELLING#',
            ':nd': false
          })
        }
      };
    case 'adminListDwellings':
      return {
        operation: 'Scan',
        filter: {
          expression:
            'attribute_exists(PK) AND begins_with(SK, :sk) AND isDeleted = :nd',
          expressionValues: util.dynamodb.toMapValues({
            ':sk': 'DWELLING#',
            ':nd': false
          })
        }
      };
    case 'createDwelling': {
      const id = util.autoId();
      return {
        operation: 'PutItem',
        key: util.dynamodb.toMapValues({
          PK: `SUB#${sub}`,
          SK: `DWELLING#${id}`
        }),
        attributeValues: util.dynamodb.toMapValues({
          sub_id: sub,
          name: args.input.name,
          dwellingType: args.input.dwellingType,
          address: args.input.address,
          created: util.time.nowISO8601(),
          updated: util.time.nowISO8601(),
          isDeleted: false
        })
      };
    }
    case 'updateDwelling':
      return {
        operation: 'UpdateItem',
        key: util.dynamodb.toMapValues({
          PK: `SUB#${sub}`,
          SK: `DWELLING#${args.id}`
        }),
        update: {
          expression: 'SET #name = :name, #dwellingType = :dwellingType',
          expressionNames: {
            '#name': 'name',
            '#dwellingType': 'dwellingType'
          },
          expressionValues: util.dynamodb.toMapValues({
            ':name': args.input.name,
            ':dwellingType': args.input.dwellingType
          })
        }
      };
    case 'deleteDwelling':
      return {
        operation: 'UpdateItem',
        key: util.dynamodb.toMapValues({
          PK: `SUB#${sub}`,
          SK: `DWELLING#${args.id}`
        }),
        update: {
          expression: 'SET isDeleted = :deleted',
          expressionValues: util.dynamodb.toMapValues({ ':deleted': true })
        }
      };

    // Room operations
    case 'getRoom':
      return {
        operation: 'GetItem',
        key: util.dynamodb.toMapValues({
          PK: `SUB#${sub}`,
          SK: `ROOM#${args.id}`
        })
      };
    case 'listRooms':
      return {
        operation: 'Query',
        query: {
          expression: 'PK = :pk AND begins_with(SK, :sk) AND isDeleted = :nd',
          expressionValues: util.dynamodb.toMapValues({
            ':pk': `SUB#${sub}`,
            ':sk': 'ROOM#',
            ':nd': false
          })
        }
      };
    case 'createRoom': {
      const id = util.autoId();
      return {
        operation: 'PutItem',
        key: util.dynamodb.toMapValues({
          PK: `SUB#${sub}`,
          SK: `ROOM#${id}`
        }),
        attributeValues: util.dynamodb.toMapValues({
          sub_id: sub,
          dwelling_id: args.input.dwelling_id,
          name: args.input.name,
          roomType: args.input.roomType,
          created: util.time.nowISO8601(),
          updated: util.time.nowISO8601(),
          isDeleted: false
        })
      };
    }
    case 'updateRoom':
      return {
        operation: 'UpdateItem',
        key: util.dynamodb.toMapValues({
          PK: `SUB#${sub}`,
          SK: `ROOM#${args.id}`
        }),
        update: {
          expression: 'SET #name = :name, #roomType = :roomType, #updated = :upd',
          expressionNames: {
            '#name': 'name',
            '#roomType': 'roomType',
            '#upd': 'updated'
          },
          expressionValues: util.dynamodb.toMapValues({
            ':name': args.input.name,
            ':roomType': args.input.roomType,
            ':upd': util.time.nowISO8601()
          })
        }
      };
    case 'deleteRoom':
      return {
        operation: 'UpdateItem',
        key: util.dynamodb.toMapValues({
          PK: `SUB#${sub}`,
          SK: `ROOM#${args.id}`
        }),
        update: {
          expression: 'SET isDeleted = :deleted, updated = :upd',
          expressionValues: util.dynamodb.toMapValues({
            ':deleted': true,
            ':upd': util.time.nowISO8601()
          })
        }
      };

    // Item operations
    case 'getItem':
      return {
        operation: 'GetItem',
        key: util.dynamodb.toMapValues({
          PK: `SUB#${sub}`,
          SK: `ITEM#${args.id}`
        })
      };
    case 'listItems':
      return {
        operation: 'Query',
        query: {
          expression: 'PK = :pk AND begins_with(SK, :sk) AND isDeleted = :nd',
          expressionValues: util.dynamodb.toMapValues({
            ':pk': `SUB#${sub}`,
            ':sk': 'ITEM#',
            ':nd': false
          })
        }
      };
    case 'createItem': {
      const id = util.autoId();
      return {
        operation: 'PutItem',
        key: util.dynamodb.toMapValues({
          PK: `SUB#${sub}`,
          SK: `ITEM#${id}`
        }),
        attributeValues: util.dynamodb.toMapValues({
          sub_id: sub,
          room_id: args.input.room_id,
          name: args.input.name,
          description: args.input.description,
          details: args.input.details,
          price: args.input.price,
          quantity: args.input.quantity,
          retailer: args.input.retailer,
          created: util.time.nowISO8601(),
          updated: util.time.nowISO8601(),
          isDeleted: false
        })
      };
    }
    case 'updateItem':
      return {
        operation: 'UpdateItem',
        key: util.dynamodb.toMapValues({
          PK: `SUB#${sub}`,
          SK: `ITEM#${args.id}`
        }),
        update: {
          expression:
            'SET #name = :name, #description = :description, #details = :details, #price = :price, #quantity = :quantity, #retailer = :retailer, #updated = :upd',
          expressionNames: {
            '#name': 'name',
            '#description': 'description',
            '#details': 'details',
            '#price': 'price',
            '#quantity': 'quantity',
            '#retailer': 'retailer',
            '#updated': 'updated'
          },
          expressionValues: util.dynamodb.toMapValues({
            ':name': args.input.name,
            ':description': args.input.description,
            ':details': args.input.details,
            ':price': args.input.price,
            ':quantity': args.input.quantity,
            ':retailer': args.input.retailer,
            ':upd': util.time.nowISO8601()
          })
        }
      };
    case 'deleteItem':
      return {
        operation: 'UpdateItem',
        key: util.dynamodb.toMapValues({
          PK: `SUB#${sub}`,
          SK: `ITEM#${args.id}`
        }),
        update: {
          expression: 'SET isDeleted = :deleted, updated = :upd',
          expressionValues: util.dynamodb.toMapValues({
            ':deleted': true,
            ':upd': util.time.nowISO8601()
          })
        }
      };
    default:
      return {};
  }
}

export function response(ctx) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  switch (ctx.info.fieldName) {
    case 'listDwellings':
    case 'listRooms':
    case 'listItems':
    case 'adminListDwellings':
      return ctx.result.items || [];
    case 'deleteDwelling':
    case 'deleteRoom':
    case 'deleteItem':
      return true;
    default:
      return ctx.result;
  }
}

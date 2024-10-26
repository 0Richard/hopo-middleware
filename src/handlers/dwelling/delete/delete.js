'use strict'

const AWS = require('aws-sdk')
const Promise = require('bluebird')
const lib = require('../../../lib')

// set the AWS region
AWS.config.update({region: process.env.REGION})

const docClient = new AWS.DynamoDB.DocumentClient()

// lib.Callbacker contains methods which return different responses to client
const Callbacker = lib.Callbacker

module.exports.index = (event, context, callback) => {
  console.log('=============== event:', JSON.stringify(event))

  var callbacker = new Callbacker(callback)

  // retrieve data from "event" object
  var cognitoUser = event.requestContext.authorizer.claims['cognito:username']
  var paths = event.pathParameters
  var dwellingId = paths.dwelling_id

  // use Promise to sequentially execute each step
  // update dwelling object in DynamoDB
  getDwelling(dwellingId)
    .then(function (dwelling) {
      // If dwelling is not found, then return HTTP 404 [Not Found] to client
      // Otherwise proceed to delete dwelling
      if (!dwelling || dwelling.identityId !== cognitoUser) {
        callbacker.makeCallback(null, lib.getResponse404())
      } else {
        var deletedDwelling

        deleteDwelling(dwellingId)
          .then(function (retValue) {
            deletedDwelling = retValue
            return deleteRooms(cognitoUser)
          })
          .then(function () {
            return deleteItems(cognitoUser)
          })
          .then(function () {
            console.log('========== deletedDwelling: ' + JSON.stringify(deletedDwelling))

            // return success response
            callbacker.makeCallback(null, lib.getResponse(deletedDwelling))
          })
      }
    })
    .catch(function (err) {
      console.log(err, err.stack)

      // return error response
      callbacker.makeCallback(err)
    })
}

// get dwelling from DynamoDB using dwellingId
function getDwelling(dwellingId) {
  return new Promise(function (resolve, reject) {
    // query DynamoDB using KeyConditionExpression
    var params = {
      TableName: process.env.DDB_TABLE_DWELLING,
      KeyConditionExpression: 'dwellingId = :dwellingId',
      ExpressionAttributeValues: {
        ':dwellingId': dwellingId
      }
    }

    docClient.query(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      } else {
        resolve(data.Items[0])
      }
    })
  })
}

// delete dwelling object in DynamoDB
function deleteDwelling (dwellingId) {
  return new Promise(function (resolve, reject) {
    var now = new Date().toISOString()
    var values = {
      ':updated': now,
      ':deletedFlag': 1
    }

    var updateExpression = 'set updated = :updated, deletedFlag = :deletedFlag'
    var params = {
      TableName: process.env.DDB_TABLE_DWELLING,
      Key: {
        dwellingId: dwellingId
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW'
    }

    // call DynamoDB "update" API
    docClient.update(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      } else {
        resolve(data.Attributes)
      }
    })
  })
}

function deleteRooms (cognitoUser) {
  return getRooms(cognitoUser)
    .then(function (rooms) {
      return Promise.map(rooms, function (room) {
          return deleteRoom(room)
        })
    })
}

// get rooms from DynamoDB
function getRooms (cognitoUser) {
  return new Promise(function (resolve, reject) {
    // query DynamoDB using secondary index 'identityId-index'
    // add FilterExpression to return only rooms with deletedFlag=0

    var params = {
      TableName: process.env.DDB_TABLE_ROOM,
      IndexName: 'identityId-index',
      KeyConditionExpression: 'identityId = :identityId',
      FilterExpression: 'deletedFlag = :deletedFlag',
      ExpressionAttributeValues: {
        ':identityId': cognitoUser,
        ':deletedFlag': 0
      }
    }

    docClient.query(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      } else {
        resolve(data.Items)
      }
    })
  })
}

// delete room object in DynamoDB
function deleteRoom (room) {
  return new Promise(function (resolve, reject) {
    var now = new Date().toISOString()
    var values = {
      ':updated': now,
      ':deletedFlag': 1
    }

    var updateExpression = 'set updated = :updated, deletedFlag = :deletedFlag'
    var params = {
      TableName: process.env.DDB_TABLE_ROOM,
      Key: {
        roomId: room.roomId
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: values
    }

    // call DynamoDB "update" API
    docClient.update(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

function deleteItems (cognitoUser) {
  return getItems(cognitoUser)
    .then(function (items) {
      return Promise.map(items, function (item) {
          return deleteItem(item)
        })
    })
}

// get items from DynamoDB
function getItems (cognitoUser) {
  return new Promise(function (resolve, reject) {
    // query DynamoDB using secondary index 'identityId-index'
    // add FilterExpression to return only items with deletedFlag=0

    var params = {
      TableName: process.env.DDB_TABLE_ITEM,
      IndexName: 'identityId-index',
      KeyConditionExpression: 'identityId = :identityId',
      FilterExpression: 'deletedFlag = :deletedFlag',
      ExpressionAttributeValues: {
        ':identityId': cognitoUser,
        ':deletedFlag': 0
      }
    }

    docClient.query(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      } else {
        resolve(data.Items)
      }
    })
  })
}

// delete item object in DynamoDB
function deleteItem (item) {
  return new Promise(function (resolve, reject) {
    var now = new Date().toISOString()
    var values = {
      ':updated': now,
      ':deletedFlag': 1
    }

    var updateExpression = 'set updated = :updated, deletedFlag = :deletedFlag'
    var params = {
      TableName: process.env.DDB_TABLE_ITEM,
      Key: {
        itemId: item.itemId
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: values
    }

    // call DynamoDB "update" API
    docClient.update(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

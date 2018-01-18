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
  console.log('=================== event:', JSON.stringify(event))

  var callbacker = new Callbacker(callback)

  // retrieve data from "event" object
  var cognitoUser = event.requestContext.authorizer.claims['cognito:username']
  var paths = event.pathParameters
  var roomId = paths.room_id

  // use Promise to sequentially execute each step
  // get room from DynamoDB using roomId
  getRoom(roomId)
    .then(function (room) {
      // If room is not found, then return HTTP 404 [Not Found] to client
      // Otherwise return the room JSON to client
      if (!room || room.identityId !== cognitoUser) {
        callbacker.makeCallback(null, lib.getResponse404())
      } else {
        // Get the no. of items for current room
        getItemCost(roomId)
          .then(function (itemCostData) {
            room.itemCount = itemCostData[0]
            room.itemCost = itemCostData[1]
            room.itemCostCurrency = itemCostData[2]

            console.log('========== room: ' + JSON.stringify(room))
            callbacker.makeCallback(null, lib.getResponse(room))
          })
      }
    })
    .catch(function (err) {
      console.log(err, err.stack)

      // return success response
      callbacker.makeCallback(err)
    })
}

// get room from DynamoDB using roomId
function getRoom(roomId) {
  return new Promise(function (resolve, reject) {
    // query DynamoDB using KeyConditionExpression
    var params = {
      TableName: process.env.DDB_TABLE_ROOM,
      KeyConditionExpression: 'roomId = :roomId',
      ExpressionAttributeValues: {
        ':roomId': roomId
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

// get itemCount for room
function getItemCost (roomId) {
  return new Promise(function (resolve, reject) {
    // query DynamoDB using secondary index 'roomId-description-index' and KeyConditionExpression
    // add FilterExpression to return only items with deletedFlag=0
    var params = {
      TableName: process.env.DDB_TABLE_ITEM,
      IndexName: 'roomId-description-index',
      KeyConditionExpression: 'roomId = :roomId',
      FilterExpression: 'deletedFlag = :deletedFlag',
      ExpressionAttributeValues: {
        ':roomId': roomId,
        ':deletedFlag': 0
      }
    }

    docClient.query(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      } else {
        var itemCount = 0
        var itemCost = 0
        var itemCostCurrency

        data.Items.forEach(function (item) {
          var quantity = parseFloat(item.quantity) || 0
          var price = parseFloat(item.price) || 0

          itemCount += quantity
          itemCost += quantity * price

          if (item.priceCurrency) {
            itemCostCurrency = item.priceCurrency
          }
        })

        resolve([itemCount, itemCost, itemCostCurrency])
      }
    })
  })
}
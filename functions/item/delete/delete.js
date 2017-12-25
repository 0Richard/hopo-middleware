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
  var itemId = paths.item_id

  // use Promise to sequentially execute each step
  // update item object in DynamoDB
  getItem(itemId)
    .then(function (item) {
      // If item is not found, then return HTTP 404 [Not Found] to client
      // Otherwise proceed to delete item
      if (!item || item.identityId !== cognitoUser) {
        callbacker.makeCallback(null, lib.getResponse404())
      } else {
        deleteItem(itemId)
          .then(function (item) {
            console.log('========== item: ' + JSON.stringify(item))

            // return success response
            callbacker.makeCallback(null, lib.getResponse(item))
          })
      }
    })
    .catch(function (err) {
      console.log(err, err.stack)

      // return error response
      callbacker.makeCallback(err)
    })
}

// get item from DynamoDB using itemId
function getItem(itemId) {
  return new Promise(function (resolve, reject) {
    // query DynamoDB using KeyConditionExpression
    var params = {
      TableName: process.env.DDB_TABLE_ITEM,
      KeyConditionExpression: 'itemId = :itemId',
      ExpressionAttributeValues: {
        ':itemId': itemId
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

// delete item object in DynamoDB
function deleteItem (itemId) {
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
        itemId: itemId
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

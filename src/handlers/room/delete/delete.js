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
  var roomId = paths.room_id

  // use Promise to sequentially execute each step
  // update room object in DynamoDB
  getRoom(roomId)
    .then(function (room) {
      // If room is not found, then return HTTP 404 [Not Found] to client
      // Otherwise proceed to delete room
      if (!room || room.identityId !== cognitoUser) {
        callbacker.makeCallback(null, lib.getResponse404())
      } else if (room.miscRoom && room.miscRoom === 1) {
        callbacker.makeCallback(null, lib.getResponse403('Misc room is not allowed to be deleted'))
      } else {
        deleteRoom(roomId)
          .then(function (room) {
            console.log('========== room: ' + JSON.stringify(room))

            // return success response
            callbacker.makeCallback(null, lib.getResponse(room))
          })
      }
    })
    .catch(function (err) {
      console.log(err, err.stack)

      // return error response
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

// delete room object in DynamoDB
function deleteRoom (roomId) {
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
        roomId: roomId
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

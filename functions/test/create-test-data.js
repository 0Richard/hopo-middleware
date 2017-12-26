'use strict'

const AWS = require('aws-sdk')
const Promise = require('bluebird')
const uuidv1 = require('uuid/v1')
const lib = require('../../lib')

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

  // use Promise to sequentially execute each step
  // get dwelling object in DynamoDB, if it doesn't exist then create a new dwelling
  getDwelling(cognitoUser)
    .then(function (dwelling) {
      if (dwelling) {
        return Promise.resolve(dwelling)
      } else {
        return createDwelling(cognitoUser)
      }
    })
    .then(function (dwelling) {
      console.log('========== dwelling: ' + JSON.stringify(dwelling))
      return createRoom(dwelling, cognitoUser)
    })
    .then(function (room) {
      console.log('========== room: ' + JSON.stringify(room))

      // return success response
      callbacker.makeCallback(null, lib.getResponse(room))
    })
    .catch(function (err) {
      console.log(err, err.stack)

      // return error response
      callbacker.makeCallback(err)
    })
}

// get user's dwelling from DynamoDB
function getDwelling(identityId) {
  return new Promise(function (resolve, reject) {
    // query DynamoDB using KeyConditionExpression
    var params = {
      TableName: process.env.DDB_TABLE_DWELLING,
      IndexName: 'identityId-index',
      KeyConditionExpression: 'identityId = :identityId',
      ExpressionAttributeValues: {
        ':identityId': identityId
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

// create dwelling object in DynamoDB
function createDwelling (cognitoUser) {
  return new Promise(function (resolve, reject) {
    var dwellingId = uuidv1() // use UUID for dwellingId
    var now = new Date().toISOString()

    var dwelling = {
      dwellingId: dwellingId,
      identityId: cognitoUser,
      dwellingName: 'name-' + String(new Date().getTime()),
      dwellingType: 'type-' + String(new Date().getTime()),
      dwellingRooms: 1,
      deletedFlag: 0,
      created: now,
      updated: now
    }

    var params = {
      TableName: process.env.DDB_TABLE_DWELLING,
      Item: dwelling
    }

    // call DynamoDB "put" API
    docClient.put(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      } else {
        resolve(dwelling)
      }
    })
  })
}

// create room object in DynamoDB
function createRoom (dwelling, cognitoUser) {
  return new Promise(function (resolve, reject) {
    var roomId = uuidv1() // use UUID for roomId
    var now = new Date().toISOString()

    var room = {
      roomId: roomId,
      identityId: cognitoUser,
      dwellingId: dwelling.dwellingId,
      roomName: 'name-' + String(new Date().getTime()),
      roomType: 'type-' + String(new Date().getTime()),
      deletedFlag: 0,
      created: now,
      updated: now
    }

    var params = {
      TableName: process.env.DDB_TABLE_ROOM,
      Item: room
    }

    // call DynamoDB "put" API
    docClient.put(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      } else {
        resolve(room)
      }
    })
  })
}
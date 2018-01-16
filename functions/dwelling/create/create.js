'use strict'

const AWS = require('aws-sdk')
const Promise = require('bluebird')
const uuidv1 = require('uuid/v1')
const lib = require('../../../lib')

// set the AWS region
AWS.config.update({region: process.env.REGION})

const docClient = new AWS.DynamoDB.DocumentClient()

// lib.Callbacker contains methods which return different responses to client
const Callbacker = lib.Callbacker

const MISC_ROOM_NAME = 'Misc'

module.exports.index = (event, context, callback) => {
  console.log('=============== event:', JSON.stringify(event))

  var callbacker = new Callbacker(callback)

  // retrieve data from "event" object
  var cognitoUser = event.requestContext.authorizer.claims['cognito:username']
  var dwellingData = JSON.parse(event.body)
  console.log('========== dwellingData: ' + JSON.stringify(dwellingData))

  // validate the request data
  var validateResponse = validateData(dwellingData)
  var validated = validateResponse.validated
  var message = validateResponse.message

  // if validation error, return HTTP 422 [Unprocessable Entity] to client
  if (!validated) {
    callbacker.makeCallback(null, lib.getResponse422(message))
    return
  }

  // use Promise to sequentially execute each step
  // create dwelling object in DynamoDB
  getDwelling(cognitoUser)
    .then(function (dwelling) {
      if (dwelling) {
        var message = 'dwelling already exists'
        callbacker.makeCallback(null, lib.getResponse422(message))
      } else {
        return createDwelling(dwellingData, cognitoUser)
          .then(function (dwelling) {
            return createMiscRoom(dwelling, cognitoUser)
          })
          .then(function (dwelling) {
            console.log('========== dwelling: ' + JSON.stringify(dwelling))

            // return success response
            callbacker.makeCallback(null, lib.getResponse(dwelling))
          })
          .catch(function (err) {
            console.log(err, err.stack)

            // return error response
            callbacker.makeCallback(err)
          })
      }
    })
}

// validate the dwelling data in request
function validateData (dwellingData) {
  var validated
  var message

  var dwellingName = dwellingData.dwellingName
  var dwellingType = dwellingData.dwellingType

  // dwellingName/dwellingType must be present
  if (dwellingName && dwellingType) {
    validated = true
    message = null
  } else {
    validated = false
    message = 'dwellingName/dwellingType is required'
  }

  return {validated, message}
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
function createDwelling (dwellingData, cognitoUser) {
  return new Promise(function (resolve, reject) {
    var dwellingId = uuidv1() // use UUID for dwellingId
    var now = new Date().toISOString()

    var dwelling = {
      dwellingId: dwellingId,
      identityId: cognitoUser,
      dwellingName: dwellingData.dwellingName,
      dwellingType: dwellingData.dwellingType,
      addressLine1: dwellingData.addressLine1,
      addressLine2: dwellingData.addressLine2,
      city: dwellingData.city,
      postCode: dwellingData.postCode,
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

function createMiscRoom (dwelling, cognitoUser) {
  return new Promise(function (resolve, reject) {
    var roomId = uuidv1() // use UUID for roomId
    var now = new Date().toISOString()

    var room = {
      roomId: roomId,
      identityId: cognitoUser,
      dwellingId: dwelling.dwellingId,
      roomName: MISC_ROOM_NAME,
      roomType: MISC_ROOM_NAME,
      miscRoom: 1,
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
        resolve(dwelling)
      }
    })
  })
}

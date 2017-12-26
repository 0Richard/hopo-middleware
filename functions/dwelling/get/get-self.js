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

  // use Promise to sequentially execute each step
  // get dwelling from DynamoDB using identityId
  getDwelling(cognitoUser)
    .then(function (dwelling) {
      if (!dwelling) {
        callbacker.makeCallback(null, lib.getResponse({}))
      } else {
        getRoomCount(dwelling.dwellingId)
          .then(function (roomCount) {
            console.log('========== dwelling: ' + JSON.stringify(dwelling))
            dwelling.roomCount = roomCount
            callbacker.makeCallback(null, lib.getResponse(dwelling))
          })
      }
    })
    .catch(function (err) {
      console.log(err, err.stack)

      // return success response
      callbacker.makeCallback(err)
    })
}

// get dwelling from DynamoDB using identityId
function getDwelling(identityId) {
  return new Promise(function (resolve, reject) {
    // query DynamoDB using secondary index 'identityId-index' and KeyConditionExpression
    // add FilterExpression to return only items with deletedFlag=0
    var params = {
      TableName: process.env.DDB_TABLE_DWELLING,
      IndexName: 'identityId-index',
      KeyConditionExpression: 'identityId = :identityId',
      FilterExpression: 'deletedFlag = :deletedFlag',
      ExpressionAttributeValues: {
        ':identityId': identityId,
        ':deletedFlag': 0
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

// get roomCount for dwelling
function getRoomCount (dwellingId) {
  return new Promise(function (resolve, reject) {
    // query DynamoDB using secondary index 'dwellingId-roomName-index' and KeyConditionExpression
    // add FilterExpression to return only rooms with deletedFlag=0
    var params = {
      TableName: process.env.DDB_TABLE_ROOM,
      IndexName: 'dwellingId-roomName-index',
      KeyConditionExpression: 'dwellingId = :dwellingId',
      FilterExpression: 'deletedFlag = :deletedFlag',
      ExpressionAttributeValues: {
        ':dwellingId': dwellingId,
        ':deletedFlag': 0
      }
    }

    docClient.query(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      } else {
        resolve(data.Items.length)
      }
    })
  })
}
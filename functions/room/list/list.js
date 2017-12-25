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
  var reqParams = event.queryStringParameters

  // validate the request data
  var validateResponse = validateData(reqParams)
  var validated = validateResponse.validated
  var message = validateResponse.message

  // if validation error, return HTTP 400 [Bad Request] to client
  if (!validated) {
    callbacker.makeCallback(null, lib.getResponse400(message))
    return
  }

  // use Promise to sequentially execute each step
  // get rooms from DynamoDB
  getRooms(reqParams)
    .then(function (rooms) {
      console.log('========== rooms: ' + JSON.stringify(rooms))
      Promise
        .map(rooms, function (room) {
          return addItemCount(room)
        })
        .then(function (rooms) {
          // return success response
          callbacker.makeCallback(null, lib.getResponse(rooms))
        })
    })
    .catch(function (err) {
      console.log(err, err.stack)

      // return error response
      callbacker.makeCallback(err)
    })
}

// validate the request data
function validateData (params) {
  var validated
  var message
  var dwellingId = (params ? params.dwellingId : null)

  // dwellingId must be present
  if (dwellingId) {
    validated = true
    message = null
  } else {
    validated = false
    message = 'dwellingId is required'
  }

  return {validated, message}
}

// get rooms from DynamoDB
function getRooms (reqParams) {
  return new Promise(function (resolve, reject) {
    // query DynamoDB using secondary index 'dwellingId-roomName-index' and KeyConditionExpression
    // add FilterExpression to return only rooms with deletedFlag=0
    var dwellingId = reqParams.dwellingId
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
        resolve(data.Items)
      }
    })
  })
}

// get itemCount for room
function addItemCount (room) {
  return new Promise(function (resolve, reject) {
    // query DynamoDB using secondary index 'roomId-description-index' and KeyConditionExpression
    // add FilterExpression to return only items with deletedFlag=0
    var params = {
      TableName: process.env.DDB_TABLE_ITEM,
      IndexName: 'roomId-description-index',
      KeyConditionExpression: 'roomId = :roomId',
      FilterExpression: 'deletedFlag = :deletedFlag',
      ExpressionAttributeValues: {
        ':roomId': room.roomId,
        ':deletedFlag': 0
      }
    }

    docClient.query(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      } else {
        room.itemCount = data.Items.length
        resolve(room)
      }
    })
  })
}
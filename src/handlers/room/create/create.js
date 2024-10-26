'use strict'

const AWS = require('aws-sdk')
const Promise = require('bluebird')
const uuidv1 = require('uuid/v1')
const lib = require('../../../lib')

// set the AWS region
AWS.config.update({region: process.env.REGION})

const docClient = new AWS.DynamoDB.DocumentClient()
const s3 = new AWS.S3()

// lib.Callbacker contains methods which return different responses to client
const Callbacker = lib.Callbacker

module.exports.index = (event, context, callback) => {
  console.log('=============== event:', JSON.stringify(event))

  var callbacker = new Callbacker(callback)

  // retrieve data from "event" object
  var cognitoUser = event.requestContext.authorizer.claims['cognito:username']
  var roomData = JSON.parse(event.body)
  var dwellingId = roomData.dwellingId
  console.log('========== roomData: ' + JSON.stringify(roomData))

  // validate the request data
  var validateResponse = validateData(roomData)
  var validated = validateResponse.validated
  var message = validateResponse.message

  // if validation error, return HTTP 422 [Unprocessable Entity] to client
  if (!validated) {
    callbacker.makeCallback(null, lib.getResponse422(message))
    return
  }

  // use Promise to sequentially execute each step
  // create room object in DynamoDB
  getDwelling(dwellingId)
    .then(function (dwelling) {
      if (!dwelling || dwelling.identityId !== cognitoUser) {
        var message = 'invalid dwellingId'
        callbacker.makeCallback(null, lib.getResponse422(message))
      } else {
        createRoom(roomData, cognitoUser)
          .then(function (room) {
            // upload the roomImage to S3
            return createImage(room, roomData.roomImage)
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
    })
}

// validate the room data in request
function validateData (roomData) {
  var validated
  var message

  var dwellingId = roomData.dwellingId
  var roomName = roomData.roomName
  var roomType = roomData.roomType

  // dwellingId/roomName/roomType must be present
  if (dwellingId && roomName && roomType) {
    validated = true
    message = null
  } else {
    validated = false
    message = 'dwellingId/roomName/roomType is required'
  }

  return {validated, message}
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

// create room object in DynamoDB
function createRoom (roomData, cognitoUser) {
  return new Promise(function (resolve, reject) {
    var roomId = uuidv1() // use UUID for roomId
    var now = new Date().toISOString()

    var room = {
      roomId: roomId,
      identityId: cognitoUser,
      dwellingId: roomData.dwellingId,
      roomName: roomData.roomName,
      roomType: roomData.roomType,
      deletedFlag: 0,
      created: now,
      updated: now
    }

    if (roomData.roomImage) {
      room.roomImage = cognitoUser + '_' + roomId + '_roomImage' + '_' + now + '_img'
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

// upload roomImage to S3
function createImage (room, base64Image) {
  if (!base64Image) {
    return Promise.resolve(room)
  } else {
    return new Promise(function (resolve, reject) {
      // convert the base64 encoded image data to binary buffer
      var imageData = Buffer.from(base64Image.replace(/^data:image\/\w+;base64,/, ''), 'base64')

      // upload to S3 and set the permission to public-read
      var params = {
        Bucket: process.env.IMAGE_BUCKET,
        Key: process.env.RAW_IMAGE_PREFIX + '/' + room.roomImage,
        ContentType: 'image/png',
        ACL: 'public-read',
        Body: imageData
      }

      s3.putObject(params, function (err, data) {
        if (err) {
          console.log(err, err.stack)
          reject(err)
        } else {
          resolve(room)
        }
      })
    })
  }
}

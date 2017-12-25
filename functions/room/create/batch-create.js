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
  var roomsData = JSON.parse(event.body)
  var dwellingId = roomsData.dwellingId
  console.log('========== roomsData: ' + JSON.stringify(roomsData))

  // validate the request data
  var validateResponse = validateData(roomsData)
  var validated = validateResponse.validated
  var message = validateResponse.message

  // if validation error, return HTTP 422 [Unprocessable Entity] to client
  if (!validated) {
    callbacker.makeCallback(null, lib.getResponse422(message))
    return
  }

  // use Promise.map to process all rooms concurrently
  getDwelling(dwellingId)
    .then(function (dwelling) {
      if (!dwelling || dwelling.identityId !== cognitoUser) {
        var message = 'invalid dwellingId'
        callbacker.makeCallback(null, lib.getResponse422(message))
      } else {
        Promise
          .map(roomsData.rooms, function (roomData) {
            return processSingleRoom(roomsData.dwellingId, roomData, cognitoUser)
          })
          .then(function (rooms) {
            console.log('========== rooms: ' + JSON.stringify(rooms))

            // return success response
            callbacker.makeCallback(null, lib.getResponse(rooms))
          })
          .catch(function (err) {
            console.log(err, err.stack)

            // return error response
            callbacker.makeCallback(err)
          })
      }
    })
}

function processSingleRoom (dwellingId, roomData, cognitoUser) {
  // create room object in DynamoDB
  return createRoom(dwellingId, roomData, cognitoUser)
    .then(function (room) {
      // upload the roomImage to S3
      return createImage(room, roomData.roomImage)
    })
}

// validate the room data in request
function validateData (roomsData) {
  var validated = true
  var message = null

  var dwellingId = roomsData.dwellingId
  var rooms = roomsData.rooms

  // dwellingId && rooms must be present
  if (!dwellingId || !rooms || !rooms.length) {
    validated = false
    message = 'dwellingId/rooms is required'
  } else {
    // check each room data
    for (var i=0; i<rooms.length; i++) {
      var roomName = rooms[i].roomName
      var roomType = rooms[i].roomType

      if (!roomName || !roomType) {
        validated = false
        message = 'roomName/roomType is required'
        break
      }
    }
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
function createRoom (dwellingId, roomData, cognitoUser) {
  return new Promise(function (resolve, reject) {
    var roomId = uuidv1() // use UUID for roomId
    var now = new Date().toISOString()

    var room = {
      roomId: roomId,
      identityId: cognitoUser,
      dwellingId: dwellingId,
      roomName: roomData.roomName,
      roomType: roomData.roomType,
      deletedFlag: 0,
      created: now,
      updated: now
    }

    // only set roomImage if it's present in the roomData
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

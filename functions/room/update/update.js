'use strict'

const AWS = require('aws-sdk')
const Promise = require('bluebird')
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
  var paths = event.pathParameters
  var roomId = paths.room_id
  var cognitoUser = event.requestContext.authorizer.claims['cognito:username']
  var roomData = JSON.parse(event.body)
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
  // update room object in DynamoDB
  getRoom(roomId)
    .then(function (room) {
      // If room is not found, then return HTTP 404 [Not Found] to client
      // Otherwise proceed to update room
      if (!room || room.identityId !== cognitoUser) {
        callbacker.makeCallback(null, lib.getResponse404())
      } else if (room.miscRoom && room.miscRoom === 1) {
        callbacker.makeCallback(null, lib.getResponse403('Misc room is not allowed to be updated'))
      } else {
        updateRoom(roomId, roomData, cognitoUser)
          .then(function (room) {
            if (roomData.roomImage) {
              // upload the roomImage to S3
              return updateImage(room, roomData.roomImage, cognitoUser)
            } else {
              return Promise.resolve(room)
            }
          })
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

// validate the room data in request
function validateData (roomData) {
  var validated
  var message

  var roomName = roomData.roomName
  var roomType = roomData.roomType
  var roomImage = roomData.roomImage

  // at least one of roomName/roomType/roomImage must be present
  if (roomName || roomType || roomImage) {
    validated = true
    message = null
  } else {
    validated = false
    message = 'at least one of roomName/roomType/roomImage is required'
  }

  return {validated, message}
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

// update room object in DynamoDB
function updateRoom (roomId, roomData, cognitoUser) {
  return new Promise(function (resolve, reject) {
    var now = new Date().toISOString()
    var conditions = ['updated = :updated']
    var values = {
      ':updated': now
    }

    // prepare the UpdateExpression and ExpressionAttributeValues
    if (roomData.roomName) {
      conditions.push('roomName = :roomName')
      values[':roomName'] = roomData.roomName
    }

    if (roomData.roomType) {
      conditions.push('roomType = :roomType')
      values[':roomType'] = roomData.roomType
    }

    if (roomData.roomImage) {
      conditions.push('roomImage = :roomImage')
      values[':roomImage'] = cognitoUser + '_' + roomId + '_roomImage' + '_' + now + '_img'
    }

    var updateExpression = 'set ' + conditions.join(', ')
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

// upload roomImage to S3
function updateImage (room, base64Image, cognitoUser) {
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

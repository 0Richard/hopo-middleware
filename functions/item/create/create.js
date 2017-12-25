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
  var itemData = JSON.parse(event.body)
  var roomId = itemData.roomId
  console.log('========== itemData: ' + JSON.stringify(itemData))

  // validate the request data
  var validateResponse = validateData(itemData)
  var validated = validateResponse.validated
  var message = validateResponse.message

  // if validation error, return HTTP 422 [Unprocessable Entity] to client
  if (!validated) {
    callbacker.makeCallback(null, lib.getResponse422(message))
    return
  }

  // use Promise to sequentially execute each step
  // create item object in DynamoDB
  getRoom(roomId)
    .then(function (room) {
      if (!room || room.identityId !== cognitoUser) {
        var message = 'invalid roomId'
        callbacker.makeCallback(null, lib.getResponse422(message))
      } else {
        createItem(itemData, cognitoUser)
          .then(function (item) {
            // upload all images (e.g., itemImageFull/receiptImgC/itemImage1/itemImage2) to S3
            return createImages(item, itemData)
          })
          .then(function (item) {
            console.log('========== item: ' + JSON.stringify(item))

            // return success response
            callbacker.makeCallback(null, lib.getResponse(item))
          })
          .catch(function (err) {
            console.log(err, err.stack)

            // return error response
            callbacker.makeCallback(err)
          })
      }
    })
}

// validate the item data in request
function validateData (itemData) {
  var validated
  var message

  var roomId = itemData.roomId
  var description = itemData.description

  // roomId/description must be present
  if (roomId && description) {
    validated = true
    message = null
  } else {
    validated = false
    message = 'roomId/description is required'
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

// create item object in DynamoDB
function createItem (itemData, cognitoUser) {
  return new Promise(function (resolve, reject) {
    var itemId = uuidv1() // use UUID for itemId
    var now = new Date().toISOString()

    var item = {
      itemId: itemId,
      identityId: cognitoUser,
      roomId: itemData.roomId,
      description: itemData.description,
      brand: itemData.brand,
      model: itemData.model,
      serialNumber: itemData.serialNumber,
      quantity: itemData.quantity,
      retailer: itemData.retailer,
      purchaseDate: itemData.purchaseDate,
      price: itemData.price,
      priceCurrency: itemData.priceCurrency,
      deletedFlag: 0,
      created: now,
      updated: now
    }

    // only set image attributes if they are present in the itemData
    var imgNamePrefix = cognitoUser + '_' + itemId + '_'
    var imgNameSuffix = '_' + now + '_img'

    if (itemData.itemImageFull) {
      item.itemImageFull = imgNamePrefix + 'itemImageFull' + imgNameSuffix
    }
    if (itemData.receiptImgC) {
      item.receiptImgC = imgNamePrefix + 'receiptImgC' + imgNameSuffix
    }
    if (itemData.itemImage1) {
      item.itemImage1 = imgNamePrefix + 'itemImage1' + imgNameSuffix
    }
    if (itemData.itemImage2) {
      item.itemImage2 = imgNamePrefix + 'itemImage2' + imgNameSuffix
    }

    var params = {
      TableName: process.env.DDB_TABLE_ITEM,
      Item: item
    }

    // call DynamoDB "put" API
    docClient.put(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      } else {
        resolve(item)
      }
    })
  })
}

// sequentially upload all images
function createImages (item, itemData) {
  // upload the itemImageFull to S3
  return createImage(item.itemImageFull, itemData.itemImageFull)
    .then(function () {
      // upload the receiptImgC to S3
      return createImage(item.receiptImgC, itemData.receiptImgC)
    })
    .then(function () {
      // upload the itemImage1 to S3
      return createImage(item.itemImage1, itemData.itemImage1)
    })
    .then(function () {
      // upload the itemImage2 to S3
      return createImage(item.itemImage2, itemData.itemImage2)
    })
    .then(function () {
      return Promise.resolve(item)
    })
}

// upload image to S3
function createImage (imageKey, base64Image) {
  if (!base64Image) {
    return Promise.resolve()
  } else {
    return new Promise(function (resolve, reject) {
      // convert the base64 encoded image data to binary buffer
      var imageData = Buffer.from(base64Image.replace(/^data:image\/\w+;base64,/, ''), 'base64')

      // upload to S3 and set the permission to public-read
      var params = {
        Bucket: process.env.IMAGE_BUCKET,
        Key: process.env.RAW_IMAGE_PREFIX + '/' + imageKey,
        ContentType: 'image/png',
        ACL: 'public-read',
        Body: imageData
      }

      s3.putObject(params, function (err, data) {
        if (err) {
          console.log(err, err.stack)
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}

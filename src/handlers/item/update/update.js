'use strict'

const AWS = require('aws-sdk')
const Promise = require('bluebird')
const u = require('underscore')
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
  var itemId = paths.item_id
  var cognitoUser = event.requestContext.authorizer.claims['cognito:username']
  var itemData = JSON.parse(event.body)
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
  // update item object in DynamoDB
  getItem(itemId)
    .then(function (item) {
      // If item is not found, then return HTTP 404 [Not Found] to client
      // Otherwise proceed to update item
      if (!item || item.identityId !== cognitoUser) {
        callbacker.makeCallback(null, lib.getResponse404())
      } else {
        updateItem(itemId, itemData, cognitoUser)
          .then(function (item) {
            // upload all images (e.g., itemImageFull/receiptImgC/itemImage1/itemImage2) to S3
            return createImages(item, itemData)
          })
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

// validate the item data in request
function validateData (itemData) {
  var validated
  var message

  var fields = ['description', 'brand', 'model', 'serialNumber', 'quantity', 'retailer', 'purchaseDate', 'price', 'priceCurrency', 'itemImageFull', 'receiptImgC', 'itemImage1', 'itemImage2']
  var itemDataKeys = Object.keys(itemData)
  var matchFields = u.intersection(fields, itemDataKeys)

  // at least one of attributes must be present
  if (matchFields.length > 0) {
    validated = true
    message = null
  } else {
    validated = false
    message = 'at least one of item attributes is required'
  }

  return {validated, message}
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

// update item object in DynamoDB
function updateItem (itemId, itemData, cognitoUser) {
  return new Promise(function (resolve, reject) {
    var itemDataCopy = u.clone(itemData)
    var now = new Date().toISOString()
    var conditions = ['updated = :updated']
    var values = {
      ':updated': now
    }

    // only set image attributes if they are present in the itemData
    var imgNamePrefix = cognitoUser + '_' + itemId + '_'
    var imgNameSuffix = '_' + now + '_img'

    if (itemDataCopy.itemImageFull) {
      itemDataCopy.itemImageFull = imgNamePrefix + 'itemImageFull' + imgNameSuffix
    }
    if (itemDataCopy.receiptImgC) {
      itemDataCopy.receiptImgC = imgNamePrefix + 'receiptImgC' + imgNameSuffix
    }
    if (itemDataCopy.itemImage1) {
      itemDataCopy.itemImage1 = imgNamePrefix + 'itemImage1' + imgNameSuffix
    }
    if (itemDataCopy.itemImage2) {
      itemDataCopy.itemImage2 = imgNamePrefix + 'itemImage2' + imgNameSuffix
    }

    // prepare the UpdateExpression and ExpressionAttributeValues
    Object.keys(itemDataCopy).forEach(function (key) {
      conditions.push(key + ' = :' + key)
      values[':' + key] = itemDataCopy[key]
    })

    var updateExpression = 'set ' + conditions.join(', ')
    var params = {
      TableName: process.env.DDB_TABLE_ITEM,
      Key: {
        itemId: itemId
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW'
    }

    console.log('========== params: ' + JSON.stringify(params))

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

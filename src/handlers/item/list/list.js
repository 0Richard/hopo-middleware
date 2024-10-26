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
  // get items from DynamoDB
  getItems(reqParams)
    .then(function (items) {
      console.log('========== items: ' + JSON.stringify(items))

      // return success response
      callbacker.makeCallback(null, lib.getResponse(items))
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
  var roomId = (params ? params.roomId : null)

  // roomId must be present
  if (roomId) {
    validated = true
    message = null
  } else {
    validated = false
    message = 'roomId is required'
  }

  return {validated, message}
}

// get items from DynamoDB
function getItems (reqParams) {
  return new Promise(function (resolve, reject) {
    // query DynamoDB using secondary index 'roomId-description-index' and KeyConditionExpression
    // add FilterExpression to return only items with deletedFlag=0
    var roomId = reqParams.roomId
    var params = {
      TableName: process.env.DDB_TABLE_ITEM,
      IndexName: 'roomId-description-index',
      KeyConditionExpression: 'roomId = :roomId',
      FilterExpression: 'deletedFlag = :deletedFlag',
      ExpressionAttributeValues: {
        ':roomId': roomId,
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
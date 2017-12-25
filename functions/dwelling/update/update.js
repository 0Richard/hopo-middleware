'use strict'

const AWS = require('aws-sdk')
const Promise = require('bluebird')
const u = require('underscore')
const lib = require('../../../lib')

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
  var paths = event.pathParameters
  var dwellingId = paths.dwelling_id
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
  // update dwelling object in DynamoDB
  getDwelling(dwellingId)
    .then(function (dwelling) {
      // If dwelling is not found, then return HTTP 404 [Not Found] to client
      // Otherwise proceed to update dwelling
      if (!dwelling || dwelling.identityId !== cognitoUser) {
        callbacker.makeCallback(null, lib.getResponse404())
      } else {
        updateDwelling(dwellingId, dwellingData)
          .then(function (dwelling) {
            console.log('========== dwelling: ' + JSON.stringify(dwelling))

            // return success response
            callbacker.makeCallback(null, lib.getResponse(dwelling))
          })
      }
    })
    .catch(function (err) {
      console.log(err, err.stack)

      // return error response
      callbacker.makeCallback(err)
    })
}

// validate the dwelling data in request
function validateData (itemData) {
  var validated
  var message

  var fields = ['dwellingName', 'dwellingType', 'dwellingRooms', 'addressLine1', 'addressLine2', 'city', 'postCode']
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

// update dwelling object in DynamoDB
function updateDwelling (dwellingId, dwellingData) {
  return new Promise(function (resolve, reject) {
    var dwellingDataCopy = u.clone(dwellingData)
    var now = new Date().toISOString()
    var conditions = ['updated = :updated']
    var values = {
      ':updated': now
    }

    // prepare the UpdateExpression and ExpressionAttributeValues
    Object.keys(dwellingDataCopy).forEach(function (key) {
      conditions.push(key + ' = :' + key)
      values[':' + key] = dwellingDataCopy[key]
    })

    var updateExpression = 'set ' + conditions.join(', ')
    var params = {
      TableName: process.env.DDB_TABLE_DWELLING,
      Key: {
        dwellingId: dwellingId
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

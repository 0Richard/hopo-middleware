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
  console.log('=============== event:', JSON.stringify(event))

  var callbacker = new Callbacker(callback)

  // retrieve data from "event" object
  var cognitoUser = event.requestContext.authorizer.claims['cognito:username']
  var paths = event.pathParameters
  var dwellingId = paths.dwelling_id

  // use Promise to sequentially execute each step
  // update dwelling object in DynamoDB
  getDwelling(dwellingId)
    .then(function (dwelling) {
      // If dwelling is not found, then return HTTP 404 [Not Found] to client
      // Otherwise proceed to delete dwelling
      if (!dwelling || dwelling.identityId !== cognitoUser) {
        callbacker.makeCallback(null, lib.getResponse404())
      } else {
        deleteDwelling(dwellingId)
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

// delete dwelling object in DynamoDB
function deleteDwelling (dwellingId) {
  return new Promise(function (resolve, reject) {
    var now = new Date().toISOString()
    var values = {
      ':updated': now,
      ':deletedFlag': 1
    }

    var updateExpression = 'set updated = :updated, deletedFlag = :deletedFlag'
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

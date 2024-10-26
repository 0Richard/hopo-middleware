'use strict'

const AWS = require('aws-sdk')
const Promise = require('bluebird')
const uuidv1 = require('uuid/v1')
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
  var dwellingsData = JSON.parse(event.body)
  console.log('========== dwellingsData: ' + JSON.stringify(dwellingsData))

  // validate the request data
  var validateResponse = validateData(dwellingsData)
  var validated = validateResponse.validated
  var message = validateResponse.message

  // if validation error, return HTTP 422 [Unprocessable Entity] to client
  if (!validated) {
    callbacker.makeCallback(null, lib.getResponse422(message))
    return
  }

  // use Promise.map to process all dwellings concurrently
  Promise
    .map(dwellingsData, function (dwellingData) {
      return createDwelling(dwellingData, cognitoUser)
    })
    .then(function (dwellings) {
      console.log('========== dwellings: ' + JSON.stringify(dwellings))

      // return success response
      callbacker.makeCallback(null, lib.getResponse(dwellings))
    })
    .catch(function (err) {
      console.log(err, err.stack)

      // return error response
      callbacker.makeCallback(err)
    })
}

// validate the dwelling data in request
function validateData (dwellingsData) {
  var validated = true
  var message = null

  // dwellings must not be empty
  if (!dwellingsData || !dwellingsData.length) {
    validated = false
    message = 'dwellings must not be empty'
  } else {
    // check each dwelling data
    for (var i=0; i<dwellingsData.length; i++) {
      var dwellingName = dwellingsData[i].dwellingName
      var dwellingType = dwellingsData[i].dwellingType

      if (!dwellingName || !dwellingType) {
        validated = false
        message = 'dwellingName/dwellingType is required'
        break
      }
    }
  }

  return {validated, message}
}

// create dwelling object in DynamoDB
function createDwelling (dwellingData, cognitoUser) {
  return new Promise(function (resolve, reject) {
    var dwellingId = uuidv1() // use UUID for dwellingId
    var now = new Date().toISOString()

    var dwelling = {
      dwellingId: dwellingId,
      identityId: cognitoUser,
      dwellingName: dwellingData.dwellingName,
      dwellingType: dwellingData.dwellingType,
      addressLine1: dwellingData.addressLine1,
      addressLine2: dwellingData.addressLine2,
      city: dwellingData.city,
      postCode: dwellingData.postCode,
      deletedFlag: 0,
      created: now,
      updated: now
    }

    var params = {
      TableName: process.env.DDB_TABLE_DWELLING,
      Item: dwelling
    }

    // call DynamoDB "put" API
    docClient.put(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      } else {
        resolve(dwelling)
      }
    })
  })
}

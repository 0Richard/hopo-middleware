'use strict'

const AWS = require('aws-sdk')
const Promise = require('bluebird')
const lib = require('../../lib')

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

  // use Promise to sequentially execute each step
  // delete all dwellings for the user
  getDwellings(cognitoUser)
    .then(function (dwellings) {
      if (dwellings.length === 0) {
        return Promise.resolve()
      } else {
        return Promise
          .map(dwellings, function (dwelling) {
            return deleteDwelling(dwelling)
          })
      }
    })
    .then(function () {
      // return success response
      callbacker.makeCallback(null, lib.getResponse())
    })
    .catch(function (err) {
      console.log(err, err.stack)

      // return error response
      callbacker.makeCallback(err)
    })
}

// get dwellings from DynamoDB
function getDwellings(identityId) {
  return new Promise(function (resolve, reject) {
    // scan DynamoDB and return all user's dwellings
    var params = {
      TableName: process.env.DDB_TABLE_DWELLING,
      FilterExpression: 'identityId = :identityId',
      ExpressionAttributeValues: {
        ':identityId': identityId
      }
    }

    docClient.scan(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      } else {
        resolve(data.Items)
      }
    })
  })
}

// delete dwelling from DynamoDB
function deleteDwelling(dwelling) {
  return new Promise(function (resolve, reject) {
    var params = {
      TableName: process.env.DDB_TABLE_DWELLING,
      Key: {
        dwellingId: dwelling.dwellingId
      }
    }
    

    docClient.delete(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

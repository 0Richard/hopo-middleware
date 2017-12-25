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

  // use Promise to sequentially execute each step
  // get dwellings from DynamoDB
  getDwellings()
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

// get dwellings from DynamoDB
function getDwellings() {
  return new Promise(function (resolve, reject) {
    // scan DynamoDB and return all dwellings with deletedFlag=0 (NOT DELETED)
    var params = {
      TableName: process.env.DDB_TABLE_DWELLING,
      FilterExpression: 'deletedFlag = :deletedFlag',
      ExpressionAttributeValues: {
        ':deletedFlag': 0
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
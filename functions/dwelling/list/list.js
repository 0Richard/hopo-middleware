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
  var cognitoUser = event.requestContext.authorizer.claims['cognito:username']
  var cognitoGroup = event.requestContext.authorizer.claims['cognito:groups']
  var groups = (cognitoGroup ? cognitoGroup.split(',') : [])
  var isAdmin = (groups.indexOf('admin') >= 0)

  // use Promise to sequentially execute each step
  // get dwellings from DynamoDB
  if (isAdmin) {
    getDwellings()
      .then(function (dwellings) {
        return Promise.map(dwellings, function (dwelling) {
          return getDwellingExtraInfo(dwelling, cognitoUser)
        })
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
  } else {
    callbacker.makeCallback(null, lib.getResponse403())
  }
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

function getDwellingExtraInfo (dwelling, cognitoUser) {
  return getRoomCount(dwelling.dwellingId)
    .then(function (roomCount) {
      dwelling.roomCount = roomCount
      return getItemCost(cognitoUser)
    })
    .then(function (itemCostData) {
      dwelling.itemCount = itemCostData[0]
      dwelling.itemCost = itemCostData[1]
      dwelling.itemCostCurrency = itemCostData[2]

      return Promise.resolve(dwelling)
    })
}

// get roomCount for dwelling
function getRoomCount (dwellingId) {
  return new Promise(function (resolve, reject) {
    // query DynamoDB using secondary index 'dwellingId-roomName-index' and KeyConditionExpression
    // add FilterExpression to return only rooms with deletedFlag=0
    var params = {
      TableName: process.env.DDB_TABLE_ROOM,
      IndexName: 'dwellingId-roomName-index',
      KeyConditionExpression: 'dwellingId = :dwellingId',
      FilterExpression: 'deletedFlag = :deletedFlag',
      ExpressionAttributeValues: {
        ':dwellingId': dwellingId,
        ':deletedFlag': 0
      }
    }

    docClient.query(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      } else {
        resolve(data.Items.length)
      }
    })
  })
}

function getItemCost (cognitoUser) {
  return new Promise(function (resolve, reject) {
    // query DynamoDB using secondary index 'identityId-index' and KeyConditionExpression
    // add FilterExpression to return only rooms with deletedFlag=0
    var params = {
      TableName: process.env.DDB_TABLE_ITEM,
      IndexName: 'identityId-index',
      KeyConditionExpression: 'identityId = :identityId',
      FilterExpression: 'deletedFlag = :deletedFlag',
      ExpressionAttributeValues: {
        ':identityId': cognitoUser,
        ':deletedFlag': 0
      }
    }

    docClient.query(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      } else {
        var itemCount = 0
        var itemCost = 0
        var itemCostCurrency

        data.Items.forEach(function (item) {
          var quantity = parseFloat(item.quantity) || 0
          var price = parseFloat(item.price) || 0

          itemCount += quantity
          itemCost += quantity * price

          if (item.priceCurrency) {
            itemCostCurrency = item.priceCurrency
          }
        })

        resolve([itemCount, itemCost, itemCostCurrency])
      }
    })
  })
}

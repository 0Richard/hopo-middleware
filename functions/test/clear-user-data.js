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
      console.log('===== dwellings: ' + dwellings.length)
      return deleteDwellings(dwellings)
    })
    .then(function () {
      return getRooms(cognitoUser)
    })
    .then(function (rooms) {
      console.log('===== rooms: ' + rooms.length)
      return deleteRooms(rooms)
    })
    .then(function () {
      return getItems(cognitoUser)
    })
    .then(function (items) {
      console.log('===== items: ' + items.length)
      return deleteItems(items)
    })
    .then(function () {
      // return success response
      callbacker.makeCallback(null, lib.getResponse('OK'))
    })
    .catch(function (err) {
      console.log(err, err.stack)

      // return error response
      callbacker.makeCallback(err)
    })
}

function getDwellings(cognitoUser) {
  return new Promise(function (resolve, reject) {
    var params = {
      TableName: process.env.DDB_TABLE_DWELLING,
      IndexName: 'identityId-index',
      KeyConditionExpression: 'identityId = :identityId',
      ExpressionAttributeValues: {
        ':identityId': cognitoUser
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

function getRooms (cognitoUser) {
  return new Promise(function (resolve, reject) {
    var params = {
      TableName: process.env.DDB_TABLE_ROOM,
      IndexName: 'identityId-index',
      KeyConditionExpression: 'identityId = :identityId',
      ExpressionAttributeValues: {
        ':identityId': cognitoUser
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

function getItems (cognitoUser) {
  return new Promise(function (resolve, reject) {
    var params = {
      TableName: process.env.DDB_TABLE_ITEM,
      IndexName: 'identityId-index',
      KeyConditionExpression: 'identityId = :identityId',
      ExpressionAttributeValues: {
        ':identityId': cognitoUser
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

function deleteDwellings (dwellings) {
  if (dwellings.length === 0) {
    return Promise.resolve()
  } else {
    return Promise.map(dwellings, function (dwelling) {
      return deleteDwelling(dwelling)
    })
  }
}

function deleteRooms (rooms) {
  if (rooms.length === 0) {
    return Promise.resolve()
  } else {
    return Promise.map(rooms, function (room) {
      return deleteRoom(room)
    })
  }
}

function deleteItems (items) {
  if (items.length === 0) {
    return Promise.resolve()
  } else {
    return Promise.map(items, function (item) {
      return deleteItem(item)
    })
  }
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

// delete room from DynamoDB
function deleteRoom(room) {
  return new Promise(function (resolve, reject) {
    var params = {
      TableName: process.env.DDB_TABLE_ROOM,
      Key: {
        roomId: room.roomId
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

// delete item from DynamoDB
function deleteItem(item) {
  return new Promise(function (resolve, reject) {
    var params = {
      TableName: process.env.DDB_TABLE_ITEM,
      Key: {
        itemId: item.itemId
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

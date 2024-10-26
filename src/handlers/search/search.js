'use strict'

const AWS = require('aws-sdk')
const Promise = require('bluebird')
const lib = require('../../lib')

const searchDomain = new AWS.CloudSearchDomain({region: process.env.CS_REGION, endpoint: process.env.CS_SEARCH_ENDPOINT})
const docClient = new AWS.DynamoDB.DocumentClient({region: process.env.REGION})

// lib.Callbacker contains methods which return different responses to client
const Callbacker = lib.Callbacker

const SEARCH_FIELDS = ['greendwelling_dwellingname', 'greendwelling_dwellingtype', 'greendwelling_addressline1', 'greendwelling_addressline2', 'greendwelling_city', 'greendwelling_postcode', 'greenroom_roomname', 'greenroom_roomtype', 'greenitem_description', 'greenitem_brand', 'greenitem_model', 'greenitem_serialnumber', 'greenitem_retailer']

const TABLE_KEYS = {
  greenDwelling: 'dwellingId',
  greenRoom: 'roomId',
  greenItem: 'itemId'
}

module.exports.index = (event, context, callback) => {
  console.log('=============== event:', JSON.stringify(event))
  var callbacker = new Callbacker(callback)
  var t1 = new Date().getTime()

  // retrieve data from "event" object
  var cognitoUser = event.requestContext.authorizer.claims['cognito:username']
  var reqParams = event.queryStringParameters
  var text = reqParams.text

  if (text.length < 3) {
    callbacker.makeCallback(null, lib.getResponse422('Search string must be at least 3 characters'))
  } else {
    search(text, cognitoUser)
      .then(function (data) {
        return consolidateData(data)
      })
      .then(function (resp) {
        // return success response
        var t2 = new Date().getTime()
        console.log('===== duration:', (t2 - t1), 'ms')

        callbacker.makeCallback(null, lib.getResponse(resp))
      })
      .catch(function (err) {
        console.log(err, err.stack)

        // return error response
        callbacker.makeCallback(err)
      })
  }
}

function search (text, cognitoUser) {
  return new Promise(function (resolve, reject) {
    var q

    if (text.indexOf(' ') === -1) {
      q = text + '|' + text + '*'
    } else {
      q = text
    }

    var params = {
      query: q,
      queryOptions: JSON.stringify({
        fields: SEARCH_FIELDS
      }),
      filterQuery: 'identityid:\'' + cognitoUser + '\'',
      queryParser: 'simple',
      return: 'table,_score',
      sort: '_score desc',
      size: process.env.CS_SEARCH_SIZE
    }

    searchDomain.search(params, function (err, data) {
      if (err) {
        console.log('===== searchDomain.search', err, err.stack)
        reject(err)
      } else {
        console.log('===== data', JSON.stringify(data))
        resolve(data)
      }
    })
  })
}

function consolidateData (data) {
  var results = reStructureData(data)

  if (results.length === 0) {
    return Promise.resolve([])
  } else {
    var objects = results[0]
    var tableIds = results[1]

    return getItems(tableIds)
      .then(function (items) {
        objects.forEach(function (obj) {
          obj.data = items[obj.id]
        })

        return Promise.resolve(objects)
      })
  }
}

function reStructureData (data) {
  var count = data.hits.found
  if (count === 0) return []

  var hitRecords = data.hits.hit
  var objects = []
  var tableIds = {}

  hitRecords.forEach(function (record) {
    // console.log('===== record: ' + JSON.stringify(record))

    var id = record.id
    var fields = record.fields
    var table = fields.table[0]
    var score = fields['_score'][0]

    var currentTableIds = tableIds[table] || []
    currentTableIds.push(id)
    tableIds[table] = currentTableIds

    objects.push({
      table: table,
      id: id,
      score: score
    })
  })

  return [objects, tableIds]
}

function getItems (tableIds) {
  return new Promise(function (resolve, reject) {
    var requestItems = {}
    var tables = Object.keys(tableIds)

    tables.forEach(function (table) {
      var objectIds = tableIds[table]
      var idName = TABLE_KEYS[table]
      var keys = []

      objectIds.forEach(function (id) {
        var key = {}
        key[idName] = id
        keys.push(key)
      })

      requestItems[table] = {Keys: keys}
    })

    var params = {
      RequestItems: requestItems
    }

    docClient.batchGet(params, function (err, data) {
      if (err) {
        console.log('===== docClient.batchGet', err, err.stack)
        reject(err)
      } else {
        console.log('===== data', JSON.stringify(data.Responses))
        var items = {}
        var resp = data.Responses

        tables.forEach(function (table) {
          resp[table].forEach(function (item) {
            var idName = TABLE_KEYS[table]
            var id = item[idName]
            items[id] = item
          })
        })

        resolve(items)
      }
    })
  })
}

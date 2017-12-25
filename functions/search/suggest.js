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

const TABLE_ATTRS = {
  greenDwelling: ['dwellingId', 'dwellingName'],
  greenRoom: ['roomId', 'roomName'],
  greenItem: ['itemId', 'description']
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
    callbacker.makeCallback(null, lib.getResponse422('Suggest string must be at least 3 characters'))
  } else {
    search(text, cognitoUser)
      .then(function (data) {
        return consolidateData(data, text)
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

function consolidateData (data, text) {
  var results = reStructureData(data)

  if (results.length === 0) {
    return Promise.resolve([])
  } else {
    var objects = results[0]
    var tableIds = results[1]
    var suggests = []

    return getItems(tableIds)
      .then(function (items) {
        objects.forEach(function (obj) {
          var item = items[obj.id]

          if (item) {
            var suggest = convertItemToSuggest(item, obj.table, text)

            if (suggest) {
              suggest.table = obj.table
              suggests.push(suggest)
            }
          }
        })

        return Promise.resolve(suggests)
      })
  }
}

function convertItemToSuggest (item, table, text) {
  var attributes = TABLE_ATTRS[table]
  var suggest = {}
  var matchingField
  var matchingValue

  attributes.forEach(function (attribute) {
    suggest[attribute] = item[attribute]
  })

  Object.keys(item).forEach(function (key) {
    var value = item[key]
    var searchable = SEARCH_FIELDS.indexOf((table + '_' + key).toLowerCase()) > -1

    if (!matchingField && searchable && value.toLowerCase().indexOf(text.toLowerCase()) >= 0) {
      matchingField = key
      matchingValue = getMatchingValue(value, text)
    }
  })

  if (matchingField && matchingValue) {
    suggest.matchingField = matchingField
    suggest.matchingValue = matchingValue
    return suggest
  } else {
    return null
  }
}

function getMatchingValue (value, text) {
  var words = value.match(/\b(\w+)\b/g)
  var position

  for (var i = 0; i < words.length; i++) {
    if (words[i].toLowerCase().indexOf(text.toLowerCase()) >= 0) {
      position = i
      break
    }
  }

  var matchingValue = words.slice(position, position + 3).join(' ')
  return matchingValue
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

    var currentTableIds = tableIds[table] || []
    currentTableIds.push(id)
    tableIds[table] = currentTableIds

    objects.push({
      table: table,
      id: id
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

/*
Does my proposed JSON response meet this requirement?
response for "GET /search/suggest?text=bed"
[
  {
    matchingField: 'brand',
    matchingValue: 'my bed brand',
    table: 'greenItems',
    itemId: '...',
    itemDescription: '...'
  },
  {
    matchingField: 'roomName',
    matchingValue: 'my bed room',
    table: 'greenRooms',
    roomId: '...',
    roomName: '...'
  },
  ...
]
*/

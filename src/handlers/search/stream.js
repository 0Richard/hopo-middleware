'use strict'

const AWS = require('aws-sdk')
const Promise = require('bluebird')

// set the AWS region
AWS.config.update({region: process.env.CS_REGION})
const searchDomain = new AWS.CloudSearchDomain({endpoint: process.env.CS_DOC_ENDPOINT})

module.exports.index = (event, context, callback) => {
  console.log('=============== event:', JSON.stringify(event))

  var documents = event.Records.map(function(record) {
    var recordKeys = record.dynamodb.Keys
    var tableKey = Object.keys(recordKeys)[0]
    var id = recordKeys[tableKey].S
    var table = record.eventSourceARN.split('/')[1]
    var data = {id: id}
    var newImage = record.dynamodb.NewImage

    if (record.eventName === 'REMOVE' || parseInt(newImage.deletedFlag.N) === 1 ) {
      data.type = 'delete'
    } else {
      data.type = 'add'
      data.fields = getFields(newImage, table)
    }
        
    return data
  })

  console.log('===== documents:', JSON.stringify(documents))

  var params = {
    contentType: 'application/json',
    documents : JSON.stringify(documents)
  }

  searchDomain.uploadDocuments(params, function (err, data) {
    if (err) {
      console.log('error in searchDomain.uploadDocuments', err, err.stack)
      callback(err)
    } else {
      callback(null, 'OK')
    }
  })
}

function getFields (data, table) {
  var fields = {table: table}
  var keys = Object.keys(data)
  // var allValues = []

  keys.forEach(function (key) {
    if (isIndexableField(table, key)) {
      var dataType = Object.keys(data[key])[0]
      var value = data[key][dataType]
      var fieldKey = (key === 'identityId' ? key : (table + '_' + key)).toLowerCase()

      if (dataType === 'N') {
        value = parseFloat(value)
      }

      fields[fieldKey] = value
      // allValues.push(value)
    }
  })

  // fields.all = allValues.join(', ')
  return fields
}

function isIndexableField (table, field) {
  var fields = {
    greenDwelling: ['identityId', 'dwellingId', 'dwellingName', 'dwellingType', 'addressLine1', 'addressLine2', 'city', 'postCode'],
    greenRoom: ['identityId', 'roomId', 'roomName', 'roomType'],
    greenItem: ['identityId', 'itemId', 'description', 'brand', 'model', 'serialNumber', 'retailer']
  }

  return fields[table] && fields[table].indexOf(field) >= 0
}
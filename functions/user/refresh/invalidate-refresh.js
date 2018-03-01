'use strict'

const AWS = require('aws-sdk')

const lib = require('../../../lib')

// set the AWS region
AWS.config.update({region: process.env.REGION})

// lib.Callbacker contains methods which return different responses to client
const Callbacker = lib.Callbacker

const cognitoProvider = new AWS.CognitoIdentityServiceProvider()

module.exports.index = (event, context, callback) => {
  console.log('=================== event:', JSON.stringify(event))
  var callbacker = new Callbacker(callback, null)

  var cognitoUser = event.requestContext.authorizer.claims['cognito:username']
  var cognitoGroup = event.requestContext.authorizer.claims['cognito:groups']
  var groups = (cognitoGroup ? cognitoGroup.split(',') : [])
  var isAdmin = (groups.indexOf('admin') >= 0)

  if (isAdmin) {
    try {
      var body = JSON.parse(event.body)

      var validationErr = validate(body)
      if (validationErr) {
        return callbacker.makeCallback(null, lib.getResponse422(validationErr.message))
      }

      var params = {
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: body.username
      }

      cognitoProvider.adminUserGlobalSignOut(params, function (err, result) {
        if (err) {
          console.log(err, err.stack)
          callbacker.makeCallback(null, lib.getResponse401(err.message))
        } else {
          callbacker.makeCallback(null, lib.getResponse())
        }
      })
    } catch (err) {
      console.log(err, err.stack)
      callbacker.makeCallback(err)
    }
  } else {
    callbacker.makeCallback(null, lib.getResponse403())
  }
}

function validate (body) {
  if (!body.username) {
    return new Error('username is required')
  }
}

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

  try {
    var body = JSON.parse(event.body)

    var validationErr = validate(body)
    if (validationErr) {
      return callbacker.makeCallback(null, lib.getResponse422(validationErr.message))
    }

    var refreshToken = body.refreshToken

    var params = {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID,
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken
      }
    }

    cognitoProvider.adminInitiateAuth(params, function (err, result) {
      if (err) {
        console.log(err, err.stack)
        callbacker.makeCallback(null, lib.getResponse401(err.message))
      } else {
        var tokens = {
          accessToken: result.AuthenticationResult.AccessToken,
          idToken: result.AuthenticationResult.IdToken
        }

        callbacker.makeCallback(null, lib.getResponse(tokens))
      }
    })
  } catch (err) {
    console.log(err, err.stack)
    callbacker.makeCallback(err)
  }
}

function validate (body) {
  if (!body.refreshToken) {
    return new Error('refreshToken is required')
  }
}

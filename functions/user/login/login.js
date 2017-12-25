'use strict'

const AWS = require('aws-sdk')
const Promise = require('bluebird')
const AmazonCognitoIdentity = require('amazon-cognito-identity-js')
const lib = require('../../../lib')
    
// set the AWS region
AWS.config.update({region: process.env.REGION})

// lib.Callbacker contains methods which return different responses to client
const Callbacker = lib.Callbacker

// get the Cognito user pool
const userPool = new AmazonCognitoIdentity.CognitoUserPool({
  UserPoolId: process.env.COGNITO_USER_POOL_ID,
  ClientId: process.env.COGNITO_CLIENT_ID
})

module.exports.index = (event, context, callback) => {
  console.log('=============== event:', JSON.stringify(event))

  var callbacker = new Callbacker(callback)

  // retrieve data from "event" object
  var body = JSON.parse(event.body)

  // validate the request data
  var validateResponse = validateData(body)
  var validated = validateResponse.validated
  var message = validateResponse.message

  // if validation error, return HTTP 422 [Unprocessable Entity] to client
  if (!validated) {
    callbacker.makeCallback(null, lib.getResponse422(message))
    return
  }

  login(body.username, body.password)
    .then(function (tokens) {
      console.log('========== tokens: ' + JSON.stringify(tokens))

      // return success response
      callbacker.makeCallback(null, lib.getResponse(tokens))
    })
    .catch(function (err) {
      console.log(err, err.stack)

      // return error response
      callbacker.makeCallback(err)
    })
}

function validateData (body) {
  var validated
  var message

  var username = body.username
  var password = body.password

  // username/password must be present
  if (username && password) {
    validated = true
    message = null
  } else {
    validated = false
    message = 'username/password is required'
  }

  return {validated, message}
}

function login (username, password) {
  return new Promise(function (resolve, reject) {
    var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
      Username: username,
      Password: password
    })

    var cognitoUser = new AmazonCognitoIdentity.CognitoUser({
      Username: username,
      Pool: userPool
    })

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: function (result) {
        console.log('========== authenticateUser: ' + JSON.stringify(result))

        var tokens = {
          refreshToken: result.refreshToken.token,
          accessToken: result.accessToken.jwtToken,
          idToken: result.idToken.jwtToken
        }

        resolve(tokens)
      },

      onFailure: function (err) {
        console.log(err, err.stack)
        reject(err)
      }
    })
  })
}

exports.Callbacker = require('./Callbacker')

exports.getResponse = function (message) {
  if (typeof message === 'string') {
    message = {message: message}
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin" : "*",
      "Access-Control-Allow-Credentials" : true
    },
    body: JSON.stringify(message)
  }
}

exports.getResponse400 = function (message) {
  var error = {code: '[400] Bad Request'}
  if (message) error.message = message

  return {
    statusCode: 400,
    headers: {
      "Access-Control-Allow-Origin" : "*",
      "Access-Control-Allow-Credentials" : true
    },
    body: JSON.stringify(error)
  }
}

exports.getResponse401 = function (message) {
  var error = {code: '[401] Unauthorized'}
  if (message) error.message = message

  return {
    statusCode: 401,
    headers: {
      "Access-Control-Allow-Origin" : "*",
      "Access-Control-Allow-Credentials" : true
    },
    body: JSON.stringify(error)
  }
}

exports.getResponse403 = function (message) {
  var error = {code: '[403] Forbidden'}
  message = message || 'Current user don\'t have permission to perform the action'
  error.message = message

  return {
    statusCode: 403,
    headers: {
      "Access-Control-Allow-Origin" : "*",
      "Access-Control-Allow-Credentials" : true
    },
    body: JSON.stringify(error)
  }
}

exports.getResponse404 = function (message) {
  var error = {code: '[404] Not Found'}
  if (message) error.message = message

  return {
    statusCode: 404,
    headers: {
      "Access-Control-Allow-Origin" : "*",
      "Access-Control-Allow-Credentials" : true
    },
    body: JSON.stringify(error)
  }
}

exports.getResponse422 = function (message) {
  var error = {code: '[422] Unprocessable Entity'}
  if (message) error.message = message

  return {
    statusCode: 422,
    headers: {
      "Access-Control-Allow-Origin" : "*",
      "Access-Control-Allow-Credentials" : true
    },
    body: JSON.stringify(error)
  }
}

exports.getResponse500 = function (message) {
  var error = {code: '[500] Internal Server Error'}
  if (message) error.message = message

  return {
    statusCode: 500,
    headers: {
      "Access-Control-Allow-Origin" : "*",
      "Access-Control-Allow-Credentials" : true
    },
    body: JSON.stringify(error)
  }
}

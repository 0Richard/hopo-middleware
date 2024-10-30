exports.createEvent = function (username, body) {
  return {
    requestContext: {
      authorizer: {
        claims: {
          'cognito:username': username
        }
      }
    },
    body: JSON.stringify(body)
  }
}

exports.getEvent = function (username, pathParameters) {
  return {
    requestContext: {
      authorizer: {
        claims: {
          'cognito:username': username
        }
      }
    },
    pathParameters: pathParameters
  }
}

exports.listEvent = function (username) {
  return {
    requestContext: {
      authorizer: {
        claims: {
          'cognito:username': username
        }
      }
    }
  }
}

exports.updateEvent = function (username, pathParameters, body) {
  return {
    requestContext: {
      authorizer: {
        claims: {
          'cognito:username': username
        }
      }
    },
    pathParameters: pathParameters,
    body: JSON.stringify(body)
  }
}

exports.deleteEvent = function (username, pathParameters) {
  return {
    requestContext: {
      authorizer: {
        claims: {
          'cognito:username': username
        }
      }
    },
    pathParameters: pathParameters
  }
}

exports.getLoginPayload = function (username, password) {
  return {
    url: 'https://api-dev.hopo.io/user/login',
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      username: username,
      password: password
    })
  }
}

exports.getClearUserDataPayload = function (idToken) {
  return {
    url: 'https://api-dev.hopo.io/dwelling/clearUserData',
    method: 'POST',
    headers: {
      'Authorization': idToken
    }
  }
}

exports.getCreateDwellingPayload = function (idToken, body) {
  return {
    url: 'https://api-dev.hopo.io/dwelling',
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Authorization': idToken
    },
    body: JSON.stringify(body)
  }
}

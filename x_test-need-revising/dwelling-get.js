'use strict'

// tests for dwelling-get
// Generated by serverless-mocha-plugin
const AWS = require('aws-sdk')
const Promise = require('bluebird')
const request = require('request')
const mochaPlugin = require('serverless-mocha-plugin')
const util = require('./util')

// set AWS credentials because the test cases are invoked from local context
let credentials = new AWS.SharedIniFileCredentials({profile: 'hopo'})
AWS.config.credentials = credentials

const expect = mochaPlugin.chai.expect
let wrapped = mochaPlugin.getWrapper('dwelling-get', '/functions/dwelling/get/get.js', 'index')

const username = 'steven'
const password = 'AAAaaa$$$000'
const dwellingName = 'name-' + String(new Date().getTime())
const dwellingType = 'type-' + String(new Date().getTime())

describe('dwelling-get', () => {
  // pre-processor: clear existing dwelling for current user
  before((done) => {
    done()
  })
  
  beforeEach((done) => {
    request(util.getLoginPayload(username, password), function (error1, response1, body1) {
      global.idToken = JSON.parse(body1).idToken
      request(util.getClearUserDataPayload(global.idToken), function (error2, response2, body2) {
        done()
      })
    })
  })

  // case1: get-success
  it('should get a dwelling', () => {
    return new Promise(function (resolve, reject) {
      let data = {
        dwellingName: dwellingName,
        dwellingType: dwellingType
      }

      request(util.getCreateDwellingPayload(global.idToken, data), function (error, response, body) {
        resolve(JSON.parse(body).dwellingId)
      })
    })
    .then(function (dwellingId) {
      let pathParameters = {
        dwelling_id: dwellingId
      }

      return wrapped.run(util.getEvent(username, pathParameters)).then((response) => {
        // status code is 200
        expect(response).to.have.property('statusCode', 200)

        // dwelling is retrieved with correct values
        let body = JSON.parse(response.body)
        expect(body).to.be.an.object
        expect(body).to.have.property('dwellingId', dwellingId)
        expect(body).to.have.property('identityId', username)
        expect(body).to.have.property('dwellingName', dwellingName)
      })
    })
  })

  // case2: get-fail-not-found
  it('should NOT get a dwelling due to dwellingId not found', () => {
    let pathParameters = {
      dwelling_id: 'invalid_dwelling_id'
    }

    return wrapped.run(util.getEvent(username, pathParameters)).then((response) => {
      // status code is 404
      expect(response).to.have.property('statusCode', 404)

      // error message is returned
      let body = JSON.parse(response.body)
      expect(body).to.be.an.object
      expect(body.code).to.include(404)
      expect(body.message).to.not.eql(null)
    })
  })

  // case3: get-fail-wrong-user
  it('should NOT get a dwelling due to dwelling belongs to another user', () => {
    return new Promise(function (resolve, reject) {
      let data = {
        dwellingName: dwellingName,
        dwellingType: dwellingType
      }

      request(util.getCreateDwellingPayload(global.idToken, data), function (error, response, body) {
        resolve(JSON.parse(body).dwellingId)
      })
    })
    .then(function (dwellingId) {
      let pathParameters = {
        dwelling_id: dwellingId
      }
      let anotherUsername = 'lujin'

      return wrapped.run(util.getEvent(anotherUsername, pathParameters)).then((response) => {
        // status code is 404
        expect(response).to.have.property('statusCode', 404)

        // error message is returned
        let body = JSON.parse(response.body)
        expect(body).to.be.an.object
        expect(body.code).to.include(404)
        expect(body.message).to.not.eql(null)
      })
    })
  })
})
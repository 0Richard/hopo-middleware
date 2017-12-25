'use strict'

// tests for dwelling-list
// Generated by serverless-mocha-plugin
const AWS = require('aws-sdk')
const mochaPlugin = require('serverless-mocha-plugin')
const util = require('./util')

// set AWS credentials because the test cases are invoked from local context
let credentials = new AWS.SharedIniFileCredentials({profile: 'hopo'})
AWS.config.credentials = credentials

const expect = mochaPlugin.chai.expect
let wrapped = mochaPlugin.getWrapper('dwelling-list', '/functions/dwelling/list/list.js', 'index')

const username = 'steven'

describe('dwelling-list', () => {
  // pre-processor: clear existing dwelling for current user
  before((done) => {
    done()
  })
  
  beforeEach((done) => {
    done()
  })

  // case1: list-success
  it('should list all dwellings', () => {
    return wrapped.run(util.listEvent(username)).then((response) => {
      // status code is 200
      expect(response).to.have.property('statusCode', 200)

      // dwelling is retrieved with correct values
      let body = JSON.parse(response.body)
      expect(body).to.be.an('array')

      if (body.length > 1) {
        expect(body[0]).to.have.property('dwellingId')
      }
    })
  })
})

'use strict'

const AWS = require('aws-sdk')
const Promise = require('bluebird')
const fs = require('fs')

// subclass the gm constructor passing the imageMagick option
const gm = require("gm").subClass({imageMagick: true})

// set the AWS region
AWS.config.update({region: process.env.REGION})

const s3 = new AWS.S3()
const TMP_DIRECTORY = '/tmp/'

module.exports.index = (event, context, callback) => {
  console.log('=================== event:', JSON.stringify(event))

  // get S3 object bucket/key from event object
  var record = event.Records[0]
  var bucket = record.s3.bucket.name
  var key = decodeURIComponent(record.s3.object.key)

  // download original image from S3 to /tmp directory
  downloadImage(bucket, key)
    .then(function (imgPath) {
      console.log('========== imgPath: ' + imgPath)

      // create a thumbnail image in /tmp directory
      return createThumbnail(imgPath)
    })
    .then(function (thumbPath) {
      console.log('========== thumbPath: ' + thumbPath)

      // upload the thumbnail image to S3 bucket /thumbnail path
      return uploadThumbnail(bucket, key, thumbPath)
    })
    .then(function () {
      // return success response
      callback(null, 'OK')
    })
    .catch(function (err) {
      console.log(err, err.stack)

      // return error response
      callback(err)
    })
}

// download original image from S3 to /tmp directory
function downloadImage (bucket, key) {
  return new Promise(function (resolve, reject) {
    var params = {
      Bucket: bucket,
      Key: key
    }
    console.log('========== downloadImage params: ' + JSON.stringify(params))

    // get object from S3
    s3.getObject(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      } else {
        var fileName = key.split('/')[1]
        var path = TMP_DIRECTORY + fileName

        // write the content of S3 object to a tmp file
        fs.writeFileSync(path, data.Body, null)

        resolve(path)
      }
    })
  })
}

// create a thumbnail image in /tmp directory
function createThumbnail (path) {
  return new Promise(function (resolve, reject) {
    var thumbPath = path + '-thumb'
    var width = process.env.TMB_WIDTH
    var height = process.env.TMB_HEIGHT
    var quality = process.env.TMB_QUALITY

    // create the thumbnail using gm.thumb()
    gm(path).thumb(width, height, thumbPath, quality, function (err) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      } else {
        resolve(thumbPath)
      }
    })
  })
}

// upload the thumbnail image to S3 bucket /thumbnail path
function uploadThumbnail (bucket, key, path) {
  return new Promise(function (resolve, reject) {
    // read thumbnail image to buffer
    var buf = fs.readFileSync(path)

    // set S3 object key for thumbnail image
    var newKey = 'thumbnail/' + key.split('/')[1]

    // upload to S3 and set the permission to public-read
    var params = {
      Bucket: bucket,
      Key: newKey,
      ContentType: 'image/png',
      ACL: 'public-read',
      Body: buf
    }

    // putObject to S3
    s3.putObject(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

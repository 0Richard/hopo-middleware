lib = require('./index')

function Callbacker (callback) {
  this.callback = callback
}

Callbacker.prototype = {
  callback: null,

  makeCallback: function (error, message) {
    if (!this.callback) {
      throw new Error('Callback is not defined!')
    }

    if (error) {
      message = lib.getResponse500(error.message)
    }

    this.callback(null, message)
  }
}

module.exports = Callbacker

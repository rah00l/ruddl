var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

var conf = require('./config-oauth_providers.js');

var UserSchema = new Schema({})
  , User;

mongooseAuth = require('mongoose-auth');

UserSchema.plugin(mongooseAuth, {
  everymodule: {
    everyauth: {
      User: function() {
        return User;
      }
    }
  },
  facebook: {
    everyauth: {
      myHostname: 'http://ruddl.com',
      appId: conf.fb.appId,
      appSecret: conf.fb.appSecret,
      redirectPath: '/'
    }
  },
  twitter: {
    everyauth: {
      myHostname: 'http://ruddl.com',
      consumerKey: conf.twit.consumerKey,
      consumerSecret: conf.twit.consumerSecret,
      redirectPath: '/'
    }
  }
});
User = mongoose.model('User', UserSchema);
module.exports["User"] = mongoose.model("User");
module.exports["User"].modelName = "User";
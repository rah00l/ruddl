
customSchema(function () {
    var mongoose = require('mongoose');
    mongoose.connect('mongodb://localhost/test');

    var Schema = mongoose.Schema, ObjectId = Schema.ObjectId;

    var User = describe('User', function () {

	});
});
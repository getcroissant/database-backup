var Q = require('q');
var moment = require('moment');

var backup = {

  download: function(username, password, host, port, database, outputDirectory) {
    var mongodbBackup = require('mongodb-backup');

    console.log('Downloading mongo dump from ' + username + '@' + host + ':' + port + '/' + database);

    return Q.Promise(function(resolve, reject) {
      mongodbBackup({
        uri: 'mongodb://' + username + ':' + password + '@' + host + ':' + port + '/' + database,
        root: outputDirectory,
        callback: function(err) {
          if(err) reject();

          console.log('Storing mongo dump to ' + outputDirectory);

          return resolve(outputDirectory + database);
        }
      });
    });
  },

  compress: function(source) {
    var targz = require('tar.gz');

    var destination = source + '.tar.gz';

    console.log('Compressing ' + source + ' to ' + destination);

    return targz().compress(source, destination).then(function() {
      return Q.resolve(destination);
    })
  },

  upload: function(s3Key, s3Secret, bucket, key, filePath) {
    var fs = require('fs');
    var AWS = require('aws-sdk');

    console.log('Searching for file at ' + filePath);

    return Q.nfcall(fs.readFile, filePath).then(function(file) {

      console.log('Found file at ' + filePath);

      return Q.Promise(function(resolve, reject) {
        var params = {
          Bucket: bucket,
          Key: key,
          Expires: 60,
          ContentType: 'application/gzip',
          ACL: 'private',
          Body: file
        };

        console.log('Sending ' + filePath + ' to S3 ' + bucket + ' @ ' + key);

        var s3 = new AWS.S3({accessKeyId: s3Key, secretAccessKey: s3Secret});
        s3.putObject(params, function(err, data) {
          if(err) reject(err);

          console.log('Uploaded file completed at ' + bucket + ' @ ' + key);

          resolve();
        });
      });
    });
  },

  delete: function(source) {
    var rimraf = require('rimraf');

    return Q.Promise(function(resolve, reject) {
      rimraf(source, function(err) {
        if(err) reject(err);

        console.log('Deleted ' + source + ' from local machine');

        resolve();
      });
    });
  }
};

exports.handler = function(event, context) {
  //Global variables
  var now = moment.utc().format("YYYY-MM-DD-hh.mm.ss");
  var outputDirectory = '/tmp/' + now + '/';

  //MongoDB credentials
  var dbUsername = event.db.username;
  var dbPassword = event.db.password;
  var dbHost = event.db.host;
  var dbPort = event.db.port;
  var dbDatabase = event.db.database;

  //AWS credentials
  var s3Key = event.s3.key;
  var s3Secret = event.s3.secret;
  var s3Bucket = event.s3.bucket;
  var s3Folder = event.s3.folder + '/' + now + '/' + dbDatabase + '.tar.gz';

  console.log('Event: ' + event);
  console.log('Context: ' + context);

  backup.download(dbUsername, dbPassword, dbHost, dbPort, dbDatabase, outputDirectory).then(function(backupPath) {
    return backup.compress(backupPath).then(function(compressPath) {
      return backup.upload(s3Key, s3Secret, s3Bucket, s3Folder, compressPath).then(function() {
        return backup.delete(outputDirectory);
      })
    });
  }).then(function() {
    context.succeed('Execution complete.');
  }, function(err) {
    context.fail('Execution failed: ' + err);
  }).done();
};

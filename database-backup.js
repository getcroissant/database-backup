const moment = require('moment');
const config = require('./config.json');
const fs = require('fs');
const AWS = require('aws-sdk');
const targz = require('tar.gz');
const rimraf = require('rimraf');
const mongodbBackup = require('mongodb-backup');

var databaseBackup = {

  download(username, password, host, port, database, outputDirectory) {
    console.log(`[Database Backup] - Downloading mongo dump from ${username}@${host}:${port}/${database}`);

    return new Promise((resolve, reject) => {
      var uri = username ? `mongodb://${username}:${password}@${host}:${port}/${database}` : `mongodb://@${host}:${port}/${database}`;

      mongodbBackup({
        uri: uri, root: outputDirectory, callback: (err, result) => {
          if(err) reject(`[Database Backup] - Failed to backup database from ${username}@${host}:${port}/${database}: ${err}`);

          console.log(`[Database Backup] - Storing mongo dump to temp directory: ${outputDirectory}`);

          return resolve(outputDirectory + database);
        }
      });
    });
  },

  compress(source) {
    var destination = `${source}.tar.gz`;

    console.log(`[Database Backup] - Compressing ${source} to ${destination}`);

    return targz().compress(source, destination).then(() => Promise.resolve(destination));
  },

  upload(s3Key, s3Secret, bucket, key, filePath) {
    var filePromise = new Promise((resolve, reject) => {
      console.log(`[Database Backup] - Searching for file at ${filePath}`);

      fs.readFile(filePath, function(err, file) {
        if(err) reject(`[Database Backup] - Failed to find file at ${filePath}: ${err}`);
        resolve(file);
      });
    });

    return filePromise.then(file => {
      console.log(`[Database Backup] - Sending ${filePath} to S3 ${bucket} @ ${key}`);

      return new Promise((resolve, reject) => {
        var params = {Bucket: bucket, Key: key, Expires: 60, ContentType: 'application/gzip', ACL: 'private', Body: file};
        var s3 = new AWS.S3({accessKeyId: s3Key, secretAccessKey: s3Secret});
        s3.putObject(params, function(err, data) {
          if(err) reject(`[Database Backup] - Failed to upload file to S3: ${err}`);

          console.log(`[Database Backup] - Successfully uploaded file completed at ${bucket} @ ${key}`);

          resolve();
        });
      });
    });

  },

  delete(source) {
    return new Promise((resolve, reject) => {
      rimraf(source, function(err) {
        if(err) reject(`[Database Backup] - Failed to delete temp file on local machine: ${err}`);

        console.log(`[Database Backup] - Successfully deleted ${source} from local machine`);

        resolve();
      });
    });
  }
};

exports.handler = (event, context) => {
  //Global variables
  var now = moment.utc().format("YYYY-MM-DD-HH.mm.ss");
  var outputDirectory = '/tmp/' + now + '/';

  //MongoDB credentials
  var dbUsername = process.env.DB_USERNAME || config.db.username;
  var dbPassword = process.env.DB_PASSWORD ||config.db.password;
  var dbHost = process.env.HOST ||  config.db.host;
  var dbPort = process.env.PORT || config.db.port;
  var dbDatabase = process.env.DATABASE || config.db.database;

  //AWS credentials
  var s3Key = process.env.S3_KEY || config.s3.key;
  var s3Secret = process.env.S3_SECRET ||config.s3.secret;
  var s3Bucket = process.env.S3_BUCKET || config.s3.bucket;
  var s3Folder = (process.env.S3_FOLDER ||config.s3.folder) + '/' + now + '/' + dbDatabase + '.tar.gz';

  databaseBackup.download(dbUsername, dbPassword, dbHost, dbPort, dbDatabase, outputDirectory).then(backupPath => {
    return databaseBackup.compress(backupPath).then(compressPath => {
      return databaseBackup.upload(s3Key, s3Secret, s3Bucket, s3Folder, compressPath).then(() => {
        return databaseBackup.delete(outputDirectory);
      })
    });
  }).then(() => {
    context.succeed('[Database Backup] - Execution complete.');
  }, err => {
    context.fail(err);
  })
};

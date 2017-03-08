const moment = require('moment');
const AWS = require('aws-sdk');
const mongodbBackup = require('mongodb-backup');

const config = require('./config.json');

exports.handler = (event, context) => {
  //Global variables
  var now = moment.utc().format("YYYY-MM-DD-HH.mm.ss");

  //MongoDB credentials
  var MONGODB_URI = process.env.MONGODB_URI || config.mongodb.uri;
  var MONGODB_DATABASE = process.env.MONGODB_DATABASE || config.mongodb.database;

  //AWS credentials
  var S3_KEY = process.env.S3_KEY || config.s3.key;
  var S3_SECRET = process.env.S3_SECRET || config.s3.secret;
  var S3_BUCKET = process.env.S3_BUCKET || config.s3.bucket;
  var S3_FOLDER = (process.env.S3_FOLDER || config.s3.folder) + '/' + now + '/' + MONGODB_DATABASE + '.tar';

  console.log(`[Database Backup] - Starting to create S3 stream to upload to ${S3_BUCKET}/${S3_FOLDER}`);

  var uploadPromise = new Promise((resolve, reject) => {

    //Create S3 Stream
    var s3 = new AWS.S3({accessKeyId: S3_KEY, secretAccessKey: S3_SECRET});
    var s3Stream = require('s3-upload-stream')(s3);

    var upload = s3Stream.upload({Bucket: S3_BUCKET, Key: S3_FOLDER, ACL: "private", ContentType: "binary/octet-stream"});

    upload.on('error', err => {
      reject(`Database Backup - Error uploading stream to S3: ${err}`);
    });

    upload.on('part', details => {
      console.log(`[Database Backup] - ${details.ETag} - #${details.PartNumber} [${details.receivedSize}/${details.uploadedSize}]`);
    });

    upload.on('uploaded', details => {
      console.log(`[Database Backup] - Successfully uploaded database dump to S3: ${details.Location}`);
      resolve();
    });

    mongodbBackup({
      root: '/tmp', uri: `${MONGODB_URI}/${MONGODB_DATABASE}`, stream: upload, callback: (err) => {
        if(err) reject(`[Database Backup] - Error downloading stream from Mongo: ${err}`);
      }
    });
  });

  uploadPromise.then(() => {
    context.succeed('[Database Backup] - Execution complete.');
  }).catch(err => {
    context.fail(err);
  });
};

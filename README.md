# MongoDB AWS S3 Backup

Backup mongodb database and upload to the Amazon's S3 cloud storage: `backup.handler`

### Overview
* [s3] - Amazon S3 cloud storage
* [mongodump] - MongoDB database data dump
* [tar] - file compression

### Execution order:
- Connect to datastore and mongodump the database in a /tmp/{{date}} directory
- Gzip the backed up mongodump to /tmp/{{date}}/{{database}}.tar.gz
- Upload gzip file of the mongodump to Amazon S3
- `TODO`: Encrypt gzip file
- Delete the /tmp/{{date}} directory from local machine

### Use case:
- Start a AWS lambda function uploading the zip of this project with appropriate configs. See `config.json`
- `TODO`: backup locally

### Installation
```
npm install
```

### Warning
```
  Change the dir folder to root folder in mongodb-backup package
```

### Development
Will use the configuration in the `config.json`.
```
node index.js
```

Want to contribute? Great!

License
----
MIT

[//]: # (These are reference links used in the body of this note and get stripped out when the markdown processor does its job. There is no need to format nicely because it shouldn't be seen. Thanks SO - http://stackoverflow.com/questions/4823468/store-comments-in-markdown-syntax)

   [s3]: <http://docs.aws.amazon.com/AmazonS3/latest/dev/Welcome.html>
   [mongodump]: <https://docs.mongodb.org/manual/reference/program/mongodump/>
   [tar]: <https://en.wikipedia.org/wiki/Tar_(computing)>
   



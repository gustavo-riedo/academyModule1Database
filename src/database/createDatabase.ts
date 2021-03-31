const mongoClient = require('mongodb').MongoClient;
const dbUrl = "mongodb://localhost:27017/module1DB";

mongoClient.connect(dbUrl, (err, db) => {
    if (err) throw err;
    const dbObject = db.db("module1DB");

    dbObject.createCollection("users");
    dbObject.createCollection("operations");

    console.log("Database crated!");
    db.close();
});
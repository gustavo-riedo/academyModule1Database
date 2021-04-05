// Imports
import express, { request, response } from 'express';
import { ObjectID } from 'mongodb';
import cors from 'cors';

// Express elements
const app = express();
app.use(cors())
app.use(express.json());

// MongoDB configs and elements
const mongoClient = require('mongodb').MongoClient;
const dbUrl = "mongodb://localhost:27017/module1DB";

// Connection with the Database
mongoClient.connect(dbUrl, (err, db) => {
    if (err) throw err;
    const dbObject = db.db("module1DB");

    // Routes
    // Select user by ID
    app.get("/users/:id", async (request, response) => {
        const thisUser = await dbObject.collection("users").findOne({ _id: new ObjectID(request.params.id) }); // Find user

        // Checks if user exists
        if (thisUser != null) {
            return response.status(200).send(thisUser);
        }
        return response.status(404).json({ "message": "User not found" }); // If user does not exist
    })

    app.get("/users/recent/:id", async (request, response) => {
        const thisUser = await dbObject.collection("users").findOne({ _id: new ObjectID(request.params.id) }); // Find user

        if(thisUser == null){
            return response.status(404).json({ "message": "User not found" }); // If user does not exist
        }

        const recentTrades = [];
        for (let i = 0; i < 5; i++) {
            let thisTrade = await dbObject.collection("operations").findOne({ _id: new ObjectID(thisUser.tradeHistory[i]) });
            if(thisTrade == null){
                break;
            }
            recentTrades[i] = thisTrade;
        }

        return response.status(200).send(recentTrades);
    })

    // Select operation by ID
    app.get("/operations/:id", async (request, response) => {
        const thisOperation = await dbObject.collection("operations").findOne({ _id: new ObjectID(request.params.id) }); // Find operation

        // Checks if operation exists
        if (thisOperation != null) {
            return response.status(200).send(thisOperation);
        }
        return response.status(404).json({ "message": "Operation not found" }); // If opeartion does not exist
    })

    // Create new user
    app.post("/users", async (request, response) => {
        const { username, email,password, birthday } = request.body // User data

        // New user object
        const newUser = {
            _id: new ObjectID(), // Create unique ID
            username,
            email,
            password,
            birthday,
            createdAt: Date.now(),
            accountBalance: 0,
            tradeHistory: []
        };

        const thisUser = await dbObject.collection("users").insertOne(newUser); // Creates new DB document

        // Checks if it was successful
        if (thisUser.insertedCount > 0) {
            return response.status(201).send(thisUser);
        }
        return response.status(400).send({ "message": "Unable to create user" })
    })

    // Create new operation
    app.post("/operations", async (request, response) => {
        const { type, deposit, rate, user_id } = request.body; // Operation data

        // New operation object
        const newOperation = {
            _id: new ObjectID(), // Create unique ID
            type,
            deposit,
            rate,
            user_id,
            date: new Date().toISOString().replace('T', ' ').replace(/\..+/, '')
        };

        const operation = await dbObject.collection("operations").insertOne(newOperation); // Creates new DB document

        // Checks if it was successful, then deletes user relationship
        if (operation.insertedCount > 0) {
            // Removes deleted operation from respective user
            const injectedRelation = await dbObject.collection("users").updateOne({ _id: new ObjectID(user_id) }, { $push: { "tradeHistory": new ObjectID(newOperation._id) } });

            if (injectedRelation.modifiedCount <= 0) {
                return response.status(400).send({ "message": "Unable to create relation" });
            }

            return response.status(201).send(operation);
        }
        return response.status(400).send({ "message": "Unable to create operation" })
    })

    // Update user
    app.put("/users/:id", async (request, response) => {
        const { password, accountBalance } = request.body; // New data
        const newValues = { $set: { password, accountBalance } }; // New data object
        const updatedUser = await dbObject.collection("users").updateOne({ _id: new ObjectID(request.params.id) }, newValues); // Update DB document

        //Check if it was successful
        if (updatedUser.modifiedCount > 0) {
            return response.status(201).send();
        }
        return response.status(400).send({ "message": "Unable to update user" });
    })

    // Delete user
    app.delete("/users/:id", async (request, response) => {
        const deletedUser = await dbObject.collection("users").deleteOne({ _id: new ObjectID(request.params.id) }); // Delete DB document

        //Check if it was successful
        if (deletedUser.deletedCount > 0) {
            return response.status(201).send();
        }
        return response.status(400).send({ "message": "Unable to delete user" });
    })

    // Delete operation
    app.delete("/operations/:id", async (request, response) => {
        const thisOperation = await dbObject.collection("operations").findOne({ _id: new ObjectID(request.params.id) });
        const removedRelation = await dbObject.collection("users").updateOne({ _id: new ObjectID(thisOperation.user_id) }, { $pull: { "tradeHistory": new ObjectID(request.params.id) } });

        if (!removedRelation) {
            return response.status(400).send({ "message": "Unable to delete relation" });
        }

        const deletedOperation = await dbObject.collection("operations").deleteOne({ _id: new ObjectID(request.params.id) }); // Delete DB document

        //Check if it was successful
        if (deletedOperation) {
            return response.status(201).send();
        }
        return response.status(400).send({ "message": "Unable to delete operation" });
    })

    app.listen(3333, () => {
        console.log('Server is running');
    })
})
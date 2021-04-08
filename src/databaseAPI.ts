// Imports
import express from 'express';
import { ObjectID } from 'mongodb';
import cors from 'cors';

// Express elements
const app = express();
app.use(cors());
app.use(express.json());

// MongoDB elements
const mongoClient = require('mongodb').MongoClient;
const dbUrl = 'mongodb://localhost:27017/module1DB';

// Connection with the database and it's actions
mongoClient.connect(dbUrl, (err, db) => {
   if (err) throw err;
   const dbObject = db.db('module1DB'); // Database object

   // Routes
   // Get user by ID
   app.get('/users/:id', async (request, response) => {
      // Find the user
      const user = await dbObject
         .collection('users')
         .findOne({ _id: new ObjectID(request.params.id) });

      // Checks whether the user exists or not
      if (user == null) {
         return response.status(404).json({ message: 'User not found' }); // Return error as a response
      }

      return response.status(200).send(user); // Return user as a response
   });

   // Gets user trade history
   app.get('/users/history/:id', async (request, response) => {
      // Find the user
      const user = await dbObject
         .collection('users')
         .findOne({ _id: new ObjectID(request.params.id) });

      // Checks whether the user exists or not
      if (user == null) {
         return response.status(404).json({ message: 'User not found' }); // Return error as a response
      }

      // Pushes every operation to the trade history array
      const tradeHistory = [];
      for (let i = 0; i < user.tradeHistory.length; i++) {
         const thisTrade = await dbObject
            .collection('operations')
            .findOne({ _id: new ObjectID(user.tradeHistory[i]) });

         tradeHistory[i] = thisTrade;
      }

      return response.status(200).send(tradeHistory); // Return trade history as a response
   });

   // Gets last 5 operations of an user
   app.get('/users/recent/:id', async (request, response) => {
      // Find the user
      const user = await dbObject
         .collection('users')
         .findOne({ _id: new ObjectID(request.params.id) });

      // Checks whether the user exists or not
      if (user == null) {
         return response.status(404).json({ message: 'User not found' }); // Return error as a response
      }

      // Pushes the five most recent trades to the recent trades array
      const recentTrades = [];
      for (let i = 0; i < 5; i++) {
         const thisTrade = await dbObject
            .collection('operations')
            .findOne({ _id: new ObjectID(user.tradeHistory[i]) });
         if (thisTrade == null) {
            break;
         }
         recentTrades[i] = thisTrade;
      }

      return response.status(200).send(recentTrades); // Return recent trades array as a response
   });

   // Creates new user
   app.post('/users', async (request, response) => {
      const { username, email, password } = request.body; // User data

      // New user object
      const newUserData = {
         _id: new ObjectID(), // Create unique ID
         username,
         email,
         password,
         createdAt: new Date()
            .toISOString()
            .replace('T', ' ')
            .replace(/\..+/, ''),
         accountBalance: {
            USD: 0,
            GBP: 0,
         },
         tradeHistory: [],
      };

      const newUser = await dbObject.collection('users').insertOne(newUserData); // Creates new database registry

      // Checks whether it was successfull or not
      if (newUser.insertedCount <= 0) {
         return response.status(400).send({ message: 'Unable to create user' }); // Return error as a response
      }

      return response.status(201).send(newUser); // Return new user as a response
   });

   // Creates new operation
   app.post('/operations', async (request, response) => {
      const { owner_Id, type, income, rate } = request.body; // Operation data

      // Finds the owner of the new operation
      const user = await dbObject
         .collection('users')
         .findOne({ _id: new ObjectID(owner_Id) });

      // New operation object
      const newOperationData = {
         _id: new ObjectID(), // Create unique ID
         type,
         income,
         outcome: income * rate,
         rate,
         owner_Id,
         createdAt: new Date()
            .toISOString()
            .replace('T', ' ')
            .replace(/\..+/, ''),
      };

      let newWalletValues = {};

      // Procedures for each operation type
      if (type === 'USD to GBP') {
         // Checks whether the user have the desired amount in his wallet or not
         if (income <= user.accountBalance.USD) {
            newWalletValues = {
               $set: {
                  accountBalance: {
                     USD: user.accountBalance.USD - income,
                     GBP: user.accountBalance.GBP + newOperationData.outcome,
                  },
               },
            };
         } else {
            return response.status(400).send({ message: 'Invalid value' }); // Return error as a response
         }
      } else if (type === 'GBP to USD') {
         // Checks whether the user have the desired amount in his wallet or not
         if (income <= user.accountBalance.GBP) {
            newWalletValues = {
               $set: {
                  accountBalance: {
                     USD: user.accountBalance.USD + newOperationData.outcome,
                     GBP: user.accountBalance.GBP - income,
                  },
               },
            };
         } else {
            return response.status(400).send({ message: 'Invalid value' }); // Return error as a response
         }
      } else {
         return response.status(400).send({ message: 'Invalid params' }); // Return error as a response
      }

      // Updates user with the new wallet values
      const updatedUser = await dbObject
         .collection('users')
         .updateOne({ _id: new ObjectID(owner_Id) }, newWalletValues);

      // Checks whether the update was successful or not
      if (updatedUser.modifiedCount <= 0) {
         return response.status(400).send({ message: 'Unable to update user' });
      }

      // Creates new database registry
      const newOperation = await dbObject
         .collection('operations')
         .insertOne(newOperationData);

      // Checks whether the creation was successful or not
      if (newOperation.insertedCount > 0) {
         // Inserts new relation between the new operation and the operation owner
         const injectedRelation = await dbObject
            .collection('users')
            .updateOne(
               { _id: new ObjectID(owner_Id) },
               { $push: { tradeHistory: new ObjectID(newOperationData._id) } }
            );

         // Checks whether the creation was successful or not
         if (injectedRelation.modifiedCount <= 0) {
            return response
               .status(400)
               .send({ message: 'Unable to create relation' }); // Returns error as a response
         }

         return response.status(201).send(newOperation); // Returns new operation as a response
      }
      return response
         .status(400)
         .send({ message: 'Unable to create operation' }); // Returns error as a response
   });

   // Deletes user
   app.delete('/users/:id', async (request, response) => {
      // Deletes user from the database
      const deletedUser = await dbObject
         .collection('users')
         .deleteOne({ _id: new ObjectID(request.params.id) });

      //Checks whether the removal was successful or not
      if (deletedUser.deletedCount > 0) {
         return response.status(201).send(); // Returns empty response
      }
      return response.status(400).send({ message: 'Unable to delete user' }); // Returns error as a response
   });

   // Deletes operation
   app.delete('/operations/:id', async (request, response) => {
      // Finds the operation to be deleted
      const operation = await dbObject
         .collection('operations')
         .findOne({ _id: new ObjectID(request.params.id) });

      // Removes the relation between the deleted operation and it's owner
      const removedRelation = await dbObject
         .collection('users')
         .updateOne(
            { _id: new ObjectID(operation.ownerId) },
            { $pull: { tradeHistory: new ObjectID(request.params.id) } }
         );

      // Checks whether the removal was successful or not
      if (!removedRelation) {
         return response
            .status(400)
            .send({ message: 'Unable to delete relation' }); // Returns error as a response
      }

      // Deletes the operation from the database
      const deletedOperation = await dbObject
         .collection('operations')
         .deleteOne({ _id: new ObjectID(request.params.id) });

      // Checks wheter the removal was successful or not
      if (deletedOperation) {
         return response.status(201).send(); // Returns empty response
      }
      return response
         .status(400)
         .send({ message: 'Unable to delete operation' }); // Returns error as a response
   });

   // Updates user wallet
   app.patch('/users/wallet/:id', async (request, response) => {
      const { accountBalance } = request.body; // New data
      const updatedUser = await dbObject
         .collection('users')
         .updateOne(
            { _id: new ObjectID(request.params.id) },
            { $set: { accountBalance } }
         );

      // Checks whether the update was successful or not
      if (updatedUser.modifiedCount > 0) {
         return response.status(201).send(); // Returns empty response
      }
      return response.status(400).send({ message: 'Unable to update user' }); // Returns error as a response
   });

   // Assign the API port
   app.listen(3333, () => {
      console.log('Database API started on port 3333 🚀');
   });
});

import 'reflect-metadata';
import './database';

import express, { response } from 'express';
import { Connection, createConnection, FindOperator } from 'typeorm';
import { User } from './database/entities/User';
import { Operation } from './database/entities/Operation';
import { v4 as uuidv4 } from 'uuid';


createConnection().then(connection => {
    // Express configs
    const app = express();
    app.use(express.json());

    // Database
    const usersRepo = connection.getRepository(User);
    const operationsRepo = connection.getRepository(Operation);

    // Routes
    app.get("/users/:id", async (request, response) => {
        // Select an user by ID
        const id = request.params.id;
        const user = await usersRepo.findOne(id);
        if (user != null) {
            return response.send(user);
        }
        return response.status(404).json({ "message": "user not found" });
    })
    app.get("/operations/:id", async (request, response) => {
        // Select an operation by ID
        const id = request.params.id;
        const operation = await operationsRepo.findOne(id);
        if (operation != null) {
            return response.send(operation);
        }
        return response.status(404).json({ "message": "operation not found" });
    })
    app.post("/users", async (request, response) => {
        // Save a new user
        const newUser = await usersRepo.create(request.body);
        const user = await usersRepo.save(newUser);
        return response.send(user);
    })
    app.post("/operations", async (request, response) => {
        // Save a new operation
        const newOperation = await operationsRepo.create(request.body);
        const operation = await operationsRepo.save(newOperation);
        return response.send(operation);
    })
    app.put("/users/:id", async (request, response) => {
        // Update an existing user
        const id = request.params.id;
        const user = await usersRepo.findOne(id);
        usersRepo.merge(user, request.body);
        const updatedUser = await usersRepo.save(user);
        return response.send(updatedUser);
    })
    app.delete("/users/:id", async (request, response) => {
        // Delete an user by ID
        const id = request.params.id;
        const result = await usersRepo.delete(id);
        return response.send(result);
    })
    app.delete("/operations/:id", async (request, response) => {
        // Delete an operation by ID
        const id = request.params.id;
        const result = await operationsRepo.delete(id);
        return response.send(result);
    })

    app.listen(3333, () => {
        console.log('Server is running');
    })
})




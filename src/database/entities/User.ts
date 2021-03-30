import { Entity, Column, PrimaryGeneratedColumn, Double, ManyToOne, ObjectID } from "typeorm";
import { Operation } from "./Operation";

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: ObjectID;

    @Column()
    username: String;

    @Column()
    password: String;

    @Column()
    birthday: Date;

    @Column()
    createdAt: Date;

    @Column()
    accBalance: Double;

    @ManyToOne(() => Operation, operations => operations.user)
    operations: Operation[]
}
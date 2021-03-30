import { Entity, Column, PrimaryGeneratedColumn, Double, ManyToOne, ObjectID } from "typeorm";
import { User } from "./User"


@Entity()
export class Operation {

    @PrimaryGeneratedColumn()
    id: ObjectID;

    @Column()
    date: Date;

    @Column()
    deposit: Double;

    @Column()
    rate: Double;

    @ManyToOne(() => User, user => user.operations)
    user: User
}


import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { ObjectId } from "mongodb";
@Entity("admins")
export class Admin {

    @ObjectIdColumn()
    id: ObjectId

    @Column()
    name: string

    @Column()
    email: string

    @Column()
    phoneNumber: string

    @Column()
    password: string

    @Column()
    role: string

    @Column({ default: 1 })
    isActive: number

    @Column({ default: 0 })
    isDelete: number

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}

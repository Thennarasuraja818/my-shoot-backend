import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { ObjectId } from "mongodb";

@Entity("photographers")
export class Photographer {
    @ObjectIdColumn()
    id: ObjectId;

    @Column()
    name: string;

    @Column()
    phone: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    profile_pic: string;

    @Column({ nullable: true })
    specializations: ObjectId[];

    @Column({ default: 0 })
    rating: number;

    @Column({ default: 0 })
    rating_count: number;

    @Column({ default: 0 })
    project_count: number;

    @Column({ default: true })
    is_active: boolean;

    @Column({ default: 0 })
    isDelete: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ nullable: true })
    createdBy?: ObjectId;

    @Column({ nullable: true })
    updatedBy?: ObjectId;
}

import { Column, CreateDateColumn, Entity, ObjectIdColumn, UpdateDateColumn } from "typeorm";
import { ObjectId } from "mongodb";

@Entity("packages")
export class Package {
    @ObjectIdColumn()
    id: ObjectId;

    @Column({ nullable: true })
    name: string;

    @Column({ nullable: true })
    price: number;

    @Column({ nullable: true })
    duration: string;

    @Column({ nullable: true })
    categoryId: ObjectId;

    @Column({ nullable: true })
    subCategoryId: ObjectId;

    @Column("simple-json", { nullable: true })
    deliverables: { item: string, qty: string }[];

    @Column({ nullable: true })
    description: string;

    @Column({ default: true })
    status: boolean;

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

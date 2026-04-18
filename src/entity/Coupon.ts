import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { ObjectId } from "mongodb";

@Entity("coupons")
export class Coupon {
    @ObjectIdColumn()
    id: ObjectId;

    @Column()
    code: string;

    @Column()
    type: 'percentage' | 'fixed';

    @Column()
    value: number;

    @Column({ default: 0 })
    global_usage_limit: number;

    @Column({ default: 0 })
    used_count: number;

    @Column()
    expires_at: Date;

    @Column()
    scope: 'all' | 'specific';

    @Column({ nullable: true })
    package_ids: ObjectId[];

    @Column({ nullable: true })
    min_amount: number;

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

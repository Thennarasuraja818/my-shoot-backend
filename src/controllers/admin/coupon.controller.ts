import { Post, Body, Req, Res, UseBefore, JsonController, Put, Param, Get, Delete, QueryParam } from "routing-controllers";
import { ObjectId } from "mongodb";
import { StatusCodes } from "http-status-codes";
import { AuthMiddleware, AuthPayload } from "../../middlewares/AuthMiddleware";
import { AppDataSource } from "../../data-source";
import { Coupon } from "../../entity/Coupon";
import { Package } from "../../entity/Package";
import { CreateCouponDto, UpdateCouponDto } from "../../dto/admin/coupon.dto";
import { handleErrorResponse, pagination, response } from "../../utils";
import { Request, Response } from "express";

interface RequestWithUser extends Request {
    user: AuthPayload;
}

@UseBefore(AuthMiddleware)
@JsonController("/coupon")
export class CouponController {
    private repo = AppDataSource.getMongoRepository(Coupon);
    private packageRepo = AppDataSource.getMongoRepository(Package);

    private getComputedStatus(coupon: Coupon): string {
        const now = new Date();
        if (!coupon.is_active) return 'inactive';
        if (new Date(coupon.expires_at) < now) return 'expired';
        if (coupon.used_count >= coupon.global_usage_limit) return 'exhausted';
        return 'active';
    }

    @Post("/create")
    async create(
        @Req() req: RequestWithUser,
        @Body() body: CreateCouponDto,
        @Res() res: Response
    ) {
        try {
            const normalizedCode = body.code.trim().toUpperCase();

            // Uniqueness check (case-insensitive)
            const existing = await this.repo.findOne({
                where: {
                    code: new RegExp(`^${normalizedCode}$`, 'i') as any,
                    isDelete: 0
                }
            });
            if (existing) return response(res, StatusCodes.BAD_REQUEST, "Coupon code already exists");

            // Package validation
            if (body.scope === 'specific' && body.package_ids) {
                if (body.package_ids.length === 0) {
                    return response(res, StatusCodes.BAD_REQUEST, "Package IDs are required for specific scope");
                }
                const packageObjectIds = body.package_ids.map(id => new ObjectId(id));
                const packages = await this.packageRepo.find({
                    where: {
                        _id: { $in: packageObjectIds },
                        isDelete: 0
                    }
                });
                if (packages.length !== body.package_ids.length) {
                    return response(res, StatusCodes.BAD_REQUEST, "One or more package IDs are invalid");
                }
            }

            const doc = new Coupon();
            doc.code = normalizedCode;
            doc.type = body.type;
            doc.value = body.value;
            doc.global_usage_limit = body.global_usage_limit;
            doc.used_count = 0;
            doc.expires_at = new Date(body.expires_at);
            doc.scope = body.scope;
            if (body.scope === 'specific') {
                doc.package_ids = (body.package_ids || []).map(id => new ObjectId(id));
                doc.min_amount = null;
            } else {
                doc.package_ids = [];
                doc.min_amount = body.min_amount || 0;
            }
            doc.is_active = body.is_active !== undefined ? body.is_active : true;
            doc.isDelete = 0;
            doc.createdBy = new ObjectId(req.user.userId);
            doc.createdAt = new Date();

            await this.repo.save(doc);
            return response(res, StatusCodes.CREATED, "Coupon created successfully", {
                ...doc,
                computed_status: this.getComputedStatus(doc)
            });
        } catch (error: any) {
            return handleErrorResponse(error, res);
        }
    }

    @Put("/edit/:id")
    async edit(
        @Param("id") id: string,
        @Req() req: RequestWithUser,
        @Body() body: UpdateCouponDto,
        @Res() res: Response
    ) {
        try {
            if (!ObjectId.isValid(id)) return response(res, StatusCodes.BAD_REQUEST, "Invalid id");

            const doc = await this.repo.findOneBy({ _id: new ObjectId(id), isDelete: 0 });
            if (!doc) return response(res, StatusCodes.NOT_FOUND, "Coupon not found");

            if (body.code) {
                const normalizedCode = body.code.trim().toUpperCase();
                if (normalizedCode !== doc.code) {
                    const existing = await this.repo.findOne({
                        where: {
                            _id: { $ne: doc.id },
                            code: new RegExp(`^${normalizedCode}$`, 'i') as any,
                            isDelete: 0
                        }
                    });
                    if (existing) return response(res, StatusCodes.BAD_REQUEST, "Coupon code already exists");
                    doc.code = normalizedCode;
                }
            }

            if (body.scope !== undefined) doc.scope = body.scope;

            // Package validation if scope is specific (either from body or existing)
            const finalScope = body.scope || doc.scope;
            if (finalScope === 'specific') {
                const packageIds = body.package_ids || (doc.package_ids ? doc.package_ids.map(pid => pid.toString()) : []);
                if (packageIds.length === 0) {
                    return response(res, StatusCodes.BAD_REQUEST, "Package IDs are required for specific scope");
                }
                if (body.package_ids) {
                    const packageObjectIds = packageIds.map(pid => new ObjectId(pid));
                    const packages = await this.packageRepo.find({
                        where: {
                            _id: { $in: packageObjectIds },
                            isDelete: 0
                        }
                    });
                    if (packages.length !== packageIds.length) {
                        return response(res, StatusCodes.BAD_REQUEST, "One or more package IDs are invalid");
                    }
                    doc.package_ids = packageObjectIds;
                }
                doc.min_amount = null;
            } else if (finalScope === 'all') {
                doc.package_ids = [];
                if (body.min_amount !== undefined) doc.min_amount = body.min_amount;
            }

            if (body.type !== undefined) doc.type = body.type;
            if (body.value !== undefined) doc.value = body.value;
            if (body.global_usage_limit !== undefined) doc.global_usage_limit = body.global_usage_limit;
            if (body.expires_at !== undefined) doc.expires_at = new Date(body.expires_at);
            if (body.is_active !== undefined) doc.is_active = body.is_active;

            doc.updatedBy = new ObjectId(req.user.userId);
            doc.updatedAt = new Date();

            await this.repo.save(doc);
            return response(res, StatusCodes.OK, "Coupon updated successfully", {
                ...doc,
                computed_status: this.getComputedStatus(doc)
            });
        } catch (error: any) {
            return handleErrorResponse(error, res);
        }
    }

    @Get("/list")
    async list(
        @QueryParam("page") page: number = 0,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("search") search: string,
        @QueryParam("status") status: string,
        @Res() res: Response
    ) {
        try {
            const now = new Date();
            const match: any = { isDelete: 0 };

            if (search) {
                match.code = { $regex: search, $options: "i" };
            }

            if (status) {
                switch (status) {
                    case 'inactive':
                        match.is_active = false;
                        break;
                    case 'expired':
                        match.is_active = true;
                        match.expires_at = { $lt: now };
                        break;
                    case 'exhausted':
                        match.is_active = true;
                        match.expires_at = { $gte: now };
                        match.$expr = { $gte: ["$used_count", "$global_usage_limit"] };
                        break;
                    case 'active':
                        match.is_active = true;
                        match.expires_at = { $gte: now };
                        match.$expr = { $lt: ["$used_count", "$global_usage_limit"] };
                        break;
                }
            }

            const pipeline: any[] = [
                { $match: match },
                { $sort: { createdAt: -1 } },
                {
                    $facet: {
                        data: [{ $skip: page * limit }, { $limit: limit }],
                        meta: [{ $count: "total" }]
                    }
                }
            ];

            const result = await this.repo.aggregate(pipeline).toArray();
            const rawData = result[0]?.data || [];
            const total = result[0]?.meta[0]?.total || 0;

            const data = rawData.map((item: any) => ({
                ...item,
                computed_status: this.getComputedStatus(item as Coupon)
            }));

            return pagination(total, data, limit, page, res);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Get("/details/:id")
    async details(@Param("id") id: string, @Res() res: Response) {
        try {
            if (!ObjectId.isValid(id)) return response(res, StatusCodes.BAD_REQUEST, "Invalid id");

            const doc = await this.repo.findOneBy({ _id: new ObjectId(id), isDelete: 0 });
            if (!doc) return response(res, StatusCodes.NOT_FOUND, "Coupon not found");

            return response(res, StatusCodes.OK, "Details fetched successfully", {
                ...doc,
                computed_status: this.getComputedStatus(doc)
            });
        } catch (error: any) {
            return handleErrorResponse(error, res);
        }
    }

    @Delete("/delete/:id")
    async delete(@Param("id") id: string, @Req() req: RequestWithUser, @Res() res: Response) {
        try {
            if (!ObjectId.isValid(id)) return response(res, StatusCodes.BAD_REQUEST, "Invalid id");

            const doc = await this.repo.findOneBy({ _id: new ObjectId(id), isDelete: 0 });
            if (!doc) return response(res, StatusCodes.NOT_FOUND, "Coupon not found");

            doc.isDelete = 1;
            doc.updatedBy = new ObjectId(req.user.userId);
            doc.updatedAt = new Date();
            await this.repo.save(doc);

            return response(res, StatusCodes.OK, "Coupon deleted successfully");
        } catch (error: any) {
            return handleErrorResponse(error, res);
        }
    }
}

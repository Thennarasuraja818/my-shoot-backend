import { Post, Body, Req, Res, UseBefore, JsonController, Put, Param, Get, Delete, QueryParam } from "routing-controllers";
import { ObjectId } from "mongodb";
import { StatusCodes } from "http-status-codes";
import { AuthMiddleware, AuthPayload } from "../../middlewares/AuthMiddleware";
import { AppDataSource } from "../../data-source";
import { Package } from "../../entity/Package";
import { CreatePackageDto, UpdatePackageDto } from "../../dto/admin/package.dto";
import { handleErrorResponse, pagination, response } from "../../utils";
import { Request, Response } from "express";

interface RequestWithUser extends Request {
    user: AuthPayload;
}

@UseBefore(AuthMiddleware)
@JsonController("/package")
export class PackageController {
    private repo = AppDataSource.getMongoRepository(Package);

    @Post("/create")
    async create(
        @Req() req: RequestWithUser,
        @Body() body: CreatePackageDto,
        @Res() res: Response
    ) {
        try {
            if (body.name) {
                const query: any = {
                    name: new RegExp(`^${body.name.trim()}$`, 'i') as any,
                    categoryId: new ObjectId(body.categoryId),
                    subCategoryId: new ObjectId(body.subCategoryId),
                    isDelete: 0
                }

                const existing = await this.repo.findOne({ where: query });
                if (existing) return response(res, StatusCodes.BAD_REQUEST, "Package with this name already exists in the selected category");
            }

            const doc = new Package();
            doc.name = body.name;
            doc.price = body.price;
            doc.duration = body.duration;
            doc.categoryId = new ObjectId(body.categoryId);
            if (body.subCategoryId) doc.subCategoryId = new ObjectId(body.subCategoryId);
            doc.deliverables = body.deliverables;
            doc.description = body.description || "";
            doc.status = body.status ?? true;
            doc.isDelete = 0;
            doc.createdBy = new ObjectId(req.user.userId);
            doc.createdAt = new Date();

            await this.repo.save(doc);
            return response(res, StatusCodes.CREATED, "Package created successfully", doc);
        } catch (error: any) {
            return handleErrorResponse(error, res);
        }
    }

    @Put("/edit/:id")
    async edit(
        @Param("id") id: string,
        @Req() req: RequestWithUser,
        @Body() body: UpdatePackageDto,
        @Res() res: Response
    ) {
        try {
            if (!ObjectId.isValid(id)) return response(res, StatusCodes.BAD_REQUEST, "Invalid id");

            const doc = await this.repo.findOneBy({ _id: new ObjectId(id), isDelete: 0 });
            if (!doc) return response(res, StatusCodes.NOT_FOUND, "Package not found");

            if (body.name || body.categoryId || body.subCategoryId) {
                const checkName = body.name ? body.name.trim() : doc.name;
                const checkCatId = body.categoryId ? new ObjectId(body.categoryId) : doc.categoryId;
                const checkSubCatId = body.subCategoryId ? new ObjectId(body.subCategoryId) : doc.subCategoryId;

                const query: any = {
                    _id: { $ne: doc.id },
                    name: new RegExp(`^${checkName}$`, 'i') as any,
                    categoryId: checkCatId,
                    isDelete: 0
                };
                if (checkSubCatId) query.subCategoryId = checkSubCatId;

                const existing = await this.repo.findOne({ where: query });
                if (existing) return response(res, StatusCodes.BAD_REQUEST, "Package with this name already exists in the selected category");
            }

            if (body.name !== undefined) doc.name = body.name;
            if (body.price !== undefined) doc.price = body.price;
            if (body.duration !== undefined) doc.duration = body.duration;
            if (body.categoryId !== undefined) doc.categoryId = new ObjectId(body.categoryId);
            if (body.subCategoryId !== undefined) doc.subCategoryId = new ObjectId(body.subCategoryId);
            if (body.deliverables !== undefined) doc.deliverables = body.deliverables;
            if (body.description !== undefined) doc.description = body.description;
            if (body.status !== undefined) doc.status = body.status;

            doc.updatedBy = new ObjectId(req.user.userId);
            doc.updatedAt = new Date();

            await this.repo.save(doc);
            return response(res, StatusCodes.OK, "Package updated successfully", doc);
        } catch (error: any) {
            return handleErrorResponse(error, res);
        }
    }

    @Get("/list")
    async list(
        @QueryParam("page") page: number = 0,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("search") search: string,
        @QueryParam("status") status: boolean,
        @QueryParam("categoryId") categoryId: string,
        @QueryParam("subCategoryId") subCategoryId: string,
        @Res() res: Response
    ) {
        try {
            const match: any = { isDelete: 0 };
            if (status !== undefined) match.status = String(status) === 'true';
            if (categoryId) match.categoryId = new ObjectId(categoryId);
            if (subCategoryId) match.subCategoryId = new ObjectId(subCategoryId);

            if (search) {
                match.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } }
                ];
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
            const data = result[0]?.data || [];
            const total = result[0]?.meta[0]?.total || 0;

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
            if (!doc) return response(res, StatusCodes.NOT_FOUND, "Package not found");

            return response(res, StatusCodes.OK, "Details fetched successfully", doc);
        } catch (error: any) {
            return handleErrorResponse(error, res);
        }
    }

    @Delete("/delete/:id")
    async delete(@Param("id") id: string, @Req() req: RequestWithUser, @Res() res: Response) {
        try {
            if (!ObjectId.isValid(id)) return response(res, StatusCodes.BAD_REQUEST, "Invalid id");

            const doc = await this.repo.findOneBy({ _id: new ObjectId(id), isDelete: 0 });
            if (!doc) return response(res, StatusCodes.NOT_FOUND, "Package not found");

            doc.isDelete = 1;
            doc.updatedBy = new ObjectId(req.user.userId);
            doc.updatedAt = new Date();
            await this.repo.save(doc);

            return response(res, StatusCodes.OK, "Package deleted successfully");
        } catch (error: any) {
            return handleErrorResponse(error, res);
        }
    }
}

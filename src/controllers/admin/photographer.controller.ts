import { Post, Body, Req, Res, UseBefore, JsonController, Put, Param, Get, Delete, QueryParam } from "routing-controllers";
import { ObjectId } from "mongodb";
import { StatusCodes } from "http-status-codes";
import { AuthMiddleware, AuthPayload } from "../../middlewares/AuthMiddleware";
import { AppDataSource } from "../../data-source";
import { Photographer } from "../../entity/Photographer";
import { Category } from "../../entity/Category";
import { CreatePhotographerDto, UpdatePhotographerDto } from "../../dto/admin/photographer.dto";
import { handleErrorResponse, pagination, response } from "../../utils";
import { Request, Response } from "express";

interface RequestWithUser extends Request {
    user: AuthPayload;
}

@UseBefore(AuthMiddleware)
@JsonController("/photographer")
export class PhotographerController {
    private repo = AppDataSource.getMongoRepository(Photographer);
    private categoryRepo = AppDataSource.getMongoRepository(Category);

    @Post("/create")
    async create(
        @Req() req: RequestWithUser,
        @Body() body: CreatePhotographerDto,
        @Res() res: Response
    ) {
        try {
            // Check for duplicate phone
            const existingPhone = await this.repo.findOneBy({ 
                phone: body.phone, 
                isDelete: 0 
            });
            if (existingPhone) return response(res, StatusCodes.BAD_REQUEST, "Photographer with this phone number already exists");

            // Check for duplicate email if provided
            if (body.email) {
                const existingEmail = await this.repo.findOneBy({ 
                    email: body.email, 
                    isDelete: 0 
                });
                if (existingEmail) return response(res, StatusCodes.BAD_REQUEST, "Photographer with this email already exists");
            }

            const doc = new Photographer();
            doc.name = body.name;
            doc.phone = body.phone;
            doc.email = body.email;
            doc.profile_pic = body.profile_pic;

            if (body.specializations && body.specializations.length > 0) {
                const categoryObjectIds = body.specializations.map(id => new ObjectId(id));
                const categories = await this.categoryRepo.find({
                    where: {
                        _id: { $in: categoryObjectIds },
                        isDelete: 0
                    }
                });
                if (categories.length !== body.specializations.length) {
                    return response(res, StatusCodes.BAD_REQUEST, "One or more category IDs in specializations are invalid");
                }
                doc.specializations = categoryObjectIds;
            } else {
                doc.specializations = [];
            }

            doc.is_active = body.is_active !== undefined ? body.is_active : true;
            
            // Fixed values (No manual entry)
            doc.rating = 0;
            doc.rating_count = 0;
            doc.project_count = 0;
            doc.isDelete = 0;
            
            doc.createdBy = new ObjectId(req.user.userId);
            doc.createdAt = new Date();

            await this.repo.save(doc);
            return response(res, StatusCodes.CREATED, "Photographer created successfully", doc);
        } catch (error: any) {
            return handleErrorResponse(error, res);
        }
    }

    @Put("/edit/:id")
    async edit(
        @Param("id") id: string,
        @Req() req: RequestWithUser,
        @Body() body: UpdatePhotographerDto,
        @Res() res: Response
    ) {
        try {
            if (!ObjectId.isValid(id)) return response(res, StatusCodes.BAD_REQUEST, "Invalid id");

            const doc = await this.repo.findOneBy({ _id: new ObjectId(id), isDelete: 0 });
            if (!doc) return response(res, StatusCodes.NOT_FOUND, "Photographer not found");

            if (body.phone && body.phone !== doc.phone) {
                const existing = await this.repo.findOneBy({ 
                    _id: { $ne: doc.id }, 
                    phone: body.phone, 
                    isDelete: 0 
                });
                if (existing) return response(res, StatusCodes.BAD_REQUEST, "Phone number already in use by another photographer");
            }

            if (body.email && body.email !== doc.email) {
                const existing = await this.repo.findOneBy({ 
                    _id: { $ne: doc.id }, 
                    email: body.email, 
                    isDelete: 0 
                });
                if (existing) return response(res, StatusCodes.BAD_REQUEST, "Email already in use by another photographer");
            }

            if (body.name !== undefined) doc.name = body.name;
            if (body.phone !== undefined) doc.phone = body.phone;
            if (body.email !== undefined) doc.email = body.email;
            if (body.profile_pic !== undefined) doc.profile_pic = body.profile_pic;

            if (body.specializations !== undefined) {
                if (body.specializations.length > 0) {
                    const categoryObjectIds = body.specializations.map(id => new ObjectId(id));
                    const categories = await this.categoryRepo.find({
                        where: {
                            _id: { $in: categoryObjectIds },
                            isDelete: 0
                        }
                    });
                    if (categories.length !== body.specializations.length) {
                        return response(res, StatusCodes.BAD_REQUEST, "One or more category IDs in specializations are invalid");
                    }
                    doc.specializations = categoryObjectIds;
                } else {
                    doc.specializations = [];
                }
            }

            if (body.is_active !== undefined) doc.is_active = body.is_active;

            doc.updatedBy = new ObjectId(req.user.userId);
            doc.updatedAt = new Date();

            await this.repo.save(doc);
            return response(res, StatusCodes.OK, "Photographer updated successfully", doc);
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
            const match: any = { isDelete: 0 };
            
            if (status !== undefined) {
                match.is_active = status === 'true';
            }

            if (search) {
                match.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { phone: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { specializations: { $regex: search, $options: "i" } }
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
            if (!doc) return response(res, StatusCodes.NOT_FOUND, "Photographer not found");

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
            if (!doc) return response(res, StatusCodes.NOT_FOUND, "Photographer not found");

            doc.isDelete = 1;
            doc.updatedBy = new ObjectId(req.user.userId);
            doc.updatedAt = new Date();
            await this.repo.save(doc);

            return response(res, StatusCodes.OK, "Photographer deleted successfully");
        } catch (error: any) {
            return handleErrorResponse(error, res);
        }
    }
}

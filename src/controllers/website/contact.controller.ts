import { Body, JsonController, Post, Res } from "routing-controllers";
import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppDataSource } from "../../data-source";
import { ContactUs } from "../../entity/ContactUs";
import { handleErrorResponse, response } from "../../utils";

@JsonController("/contact")
export class WebsiteContactController {
    private repo = AppDataSource.getMongoRepository(ContactUs);

    @Post("/add")
    async add(
        @Body() body: {
            name: string;
            mobile: string;
            email: string;
            message: string;
        },
        @Res() res: Response
    ) {
        try {
            const { name, mobile, email, message } = body;

            if (!name || !mobile || !email || !message) {
                return response(res, StatusCodes.BAD_REQUEST, "All fields are required");
            }

            const doc = new ContactUs();
            doc.name = name;
            doc.mobile = mobile;
            doc.email = email;
            doc.message = message;
            doc.isDelete = 0;
            doc.createdAt = new Date();

            await this.repo.save(doc);
            return response(res, StatusCodes.OK, "Message sent successfully", doc);
        } catch (error: any) {
            return handleErrorResponse(error, res);
        }
    }
}

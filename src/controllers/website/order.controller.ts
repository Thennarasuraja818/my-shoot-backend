import { JsonController, Post, Body, Res, UseBefore, Req, Get, Param, QueryParam } from "routing-controllers";
import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ObjectId } from "mongodb";
import { AppDataSource } from "../../data-source";
import { Order } from "../../entity/Order";
import { Customer } from "../../entity/Customer";
import { Product } from "../../entity/Product";
import { ReturnOrder, ReturnOrderStatus } from "../../entity/ReturnOrder";
import { CreateOrderDto, CancelReturnOrderDto } from "../../dto/website/order.dto";
import { handleErrorResponse, response } from "../../utils";
import { AuthMiddleware } from "../../middlewares/AuthMiddleware";
import { deductStockForOrder, restoreStockForOrder } from "../../utils/stockLogger";

@JsonController("/order")
export class WebsiteOrderController {
    private orderRepo = AppDataSource.getMongoRepository(Order);
    private customerRepo = AppDataSource.getMongoRepository(Customer);
    private productRepo = AppDataSource.getMongoRepository(Product);
    private returnRepo = AppDataSource.getMongoRepository(ReturnOrder);

    @Post("/create")
    @UseBefore(AuthMiddleware)
    async createOrder(@Body() body: CreateOrderDto, @Res() res: Response) {
        try {
            // Validate if userId is a valid ObjectId
            if (!ObjectId.isValid(body.userId)) {
                return response(res, StatusCodes.BAD_REQUEST, "Invalid user ID");
            }

            // Check if customer exists
            const customer = await this.customerRepo.findOneBy({
                _id: new ObjectId(body.userId),
                isDelete: 0
            });

            if (!customer) {
                return response(res, StatusCodes.NOT_FOUND, "Customer not found");
            }

            // Create new order
            const order = new Order();
            order.userId = new ObjectId(body.userId);

            // Map products and fetch real names if possible
            order.products = await Promise.all(body.products.map(async (p) => {
                const product = await this.productRepo.findOneBy({ _id: new ObjectId(p.productId) });
                return {
                    productId: new ObjectId(p.productId),
                    productName: product ? product.name : p.productName,
                    sku: p.sku,
                    combination: p.combination?.map(c => ({
                        attributeId: new ObjectId(c.attributeId),
                        valueId: c.valueId ? new ObjectId(c.valueId) : undefined,
                        value: c.value
                    })),
                    price: Number(p.price),
                    mrp: Number(p.mrp),
                    qty: Number(p.qty),
                    total: Number(p.total),
                    image: p.image
                };
            }));

            order.totalAmount = Number(body.totalAmount);
            order.taxAmount = Number(body.taxAmount);
            order.shippingCharge = Number(body.shippingCharge);
            order.grandTotal = Number(body.grandTotal);
            order.paymentMethod = body.paymentMethod;
            order.paymentStatus = body.paymentStatus || "Pending";
            order.orderStatus = body.orderStatus || "Pending";
            order.couponCode = body.couponCode;
            order.couponDiscount = body.couponDiscount ? Number(body.couponDiscount) : 0;

            if (body.shippingMethodId) {
                order.shippingMethodId = new ObjectId(body.shippingMethodId);
            }

            order.address = {
                name: body.address.name,
                phone: body.address.phone,
                doorNo: body.address.doorNo,
                street: body.address.street,
                city: body.address.city,
                state: body.address.state,
                pincode: body.address.pincode
            };

            order.isActive = 1;
            order.isDelete = 0;
            order.createdAt = new Date();

            // Generate Invoice ID (YL-1, YL-2...)
            const lastOrder = await this.orderRepo.findOne({
                where: { invoiceNo: { $exists: true } },
                order: { invoiceNo: "DESC" }
            });
            const nextInvoiceNo = (lastOrder?.invoiceNo || 0) + 1;
            order.invoiceNo = nextInvoiceNo;
            order.invoiceId = `YL-${nextInvoiceNo}`;
            order.orderId = order.invoiceId;
            order.orderFrom = "Website";

            await this.orderRepo.save(order);

            // Deduct Stock
            await deductStockForOrder(order.products, "order", "Order", order.id, order.userId);

            return response(res, StatusCodes.CREATED, "Order created successfully", order);
        } catch (error: any) {
            return handleErrorResponse(error, res);
        }
    }

    @Get("/list")
    @UseBefore(AuthMiddleware)
    async listOrders(@Req() req: any, @QueryParam("status") status: string, @Res() res: Response) {
        try {
            const userId = new ObjectId(req.user.userId);
            const where: any = { userId, isDelete: 0 };
            
            if (status) {
                where.orderStatus = status;
            }

            const orders = await this.orderRepo.find({
                where,
                order: { createdAt: "DESC" }
            });

            return response(res, StatusCodes.OK, "Orders fetched successfully", orders);
        } catch (error: any) {
            return handleErrorResponse(error, res);
        }
    }

    @Get("/details/:id")
    @UseBefore(AuthMiddleware)
    async getOrderDetails(@Req() req: any, @Param("id") id: string, @Res() res: Response) {
        try {
            if (!ObjectId.isValid(id)) return response(res, StatusCodes.BAD_REQUEST, "Invalid ID");
            
            const userId = new ObjectId(req.user.userId);
            const order = await this.orderRepo.findOneBy({
                _id: new ObjectId(id),
                userId,
                isDelete: 0
            });

            if (!order) {
                return response(res, StatusCodes.NOT_FOUND, "Order not found");
            }

            return response(res, StatusCodes.OK, "Order details fetched successfully", order);
        } catch (error: any) {
            return handleErrorResponse(error, res);
        }
    }

    @Post("/cancel/:id")
    @UseBefore(AuthMiddleware)
    async cancelOrder(@Req() req: any, @Param("id") id: string, @Body() body: CancelReturnOrderDto, @Res() res: Response) {
        try {
            if (!ObjectId.isValid(id)) return response(res, StatusCodes.BAD_REQUEST, "Invalid ID");

            const userId = new ObjectId(req.user.userId);
            const order = await this.orderRepo.findOneBy({
                _id: new ObjectId(id),
                userId,
                isDelete: 0
            });

            if (!order) {
                return response(res, StatusCodes.NOT_FOUND, "Order not found");
            }

            // Allowed to cancel only if Pending
            if (order.orderStatus !== "Pending") {
                return response(res, StatusCodes.BAD_REQUEST, `Cannot cancel order with status: ${order.orderStatus}. Only Pending orders can be cancelled.`);
            }

            order.orderStatus = "Cancelled";
            order.cancelReason = body.reason;
            order.cancelDate = new Date();

            await this.orderRepo.save(order);

            // Restore Stock
            await restoreStockForOrder(order.products, "cancel", "Order", order.id, userId);

            return response(res, StatusCodes.OK, "Order cancelled successfully", order);
        } catch (error: any) {
            return handleErrorResponse(error, res);
        }
    }

    @Post("/return/:id")
    @UseBefore(AuthMiddleware)
    async returnOrder(@Req() req: any, @Param("id") id: string, @Body() body: CancelReturnOrderDto, @Res() res: Response) {
        try {
            if (!ObjectId.isValid(id)) return response(res, StatusCodes.BAD_REQUEST, "Invalid ID");

            const userId = new ObjectId(req.user.userId);
            const order = await this.orderRepo.findOneBy({
                _id: new ObjectId(id),
                userId,
                isDelete: 0
            });

            if (!order) {
                return response(res, StatusCodes.NOT_FOUND, "Order not found");
            }

            // Allowed to return only if Delivered
            if (order.orderStatus !== "Delivered") {
                return response(res, StatusCodes.BAD_REQUEST, "Format: Only delivered orders can be returned.");
            }

            order.orderStatus = "Return"; // Status is "Return" based on existing enum
            order.returnReason = body.reason;
            order.returnDate = new Date();

            await this.orderRepo.save(order);

            // Restore Stock
            await restoreStockForOrder(order.products, "return", "Order", order.id, userId);

            // Create Return Order Collection Record
            const returnOrder = new ReturnOrder();
            returnOrder.originalOrderId = order.id;
            returnOrder.userId = order.userId;
            returnOrder.products = order.products;
            returnOrder.totalAmount = order.totalAmount;
            returnOrder.taxAmount = order.taxAmount;
            returnOrder.shippingCharge = order.shippingCharge;
            returnOrder.grandTotal = order.grandTotal;
            returnOrder.paymentMethod = order.paymentMethod;
            returnOrder.paymentStatus = order.paymentStatus;
            returnOrder.orderStatus = ReturnOrderStatus.INITIATED;
            returnOrder.address = order.address;
            returnOrder.isActive = 1;
            returnOrder.isDelete = 0;
            returnOrder.createdAt = new Date();
            returnOrder.orderIdString = order.id.toString();
            returnOrder.returnReason = body.reason;
            returnOrder.returnDate = order.returnDate;
            returnOrder.invoiceId = order.invoiceId;
            returnOrder.invoiceNo = order.invoiceNo;

            await this.returnRepo.save(returnOrder);

            return response(res, StatusCodes.OK, "Return request submitted successfully", order);
        } catch (error: any) {
            return handleErrorResponse(error, res);
        }
    }
}

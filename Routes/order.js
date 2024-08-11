import { Router } from "express";
import middlewareControllers from "../middleware/middleware.js";
import orderController from "../controllers/order.js";
const router = Router();
router.post(
  "/",
  middlewareControllers.verifyToken,
  orderController.createOrder
);
router.get("/", middlewareControllers.verifyToken, orderController.getByUser);

router.get("/admin", orderController.getByAdmin);
router.put(
  "/status/:oid",
  middlewareControllers.verifyToken,
  orderController.updateStatus
);
router.post(
  "/copy",
  middlewareControllers.verifyToken,
  orderController.createOrderCopy
);

router.delete(
  "/:oid",
  middlewareControllers.verifyToken,
  orderController.deleteOrder
);

router.post("/createUrl", orderController.hanlePaymentUrl);
router.get("/vnpay_return", orderController.handelVnPayReturn);

router.get(
  "/:oid",
  middlewareControllers.verifyToken,
  orderController.getOrder
);

export default router;

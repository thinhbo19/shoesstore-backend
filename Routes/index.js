import ProductRouter from "../Routes/product.js";
import UserRouter from "../Routes/user.js";
import productCategoryRouter from "../Routes/productCategory.js";
import brandRouter from "../Routes/brand.js";
import couponRouter from "../Routes/coupon.js";
import orderRouter from "../Routes/order.js";
import chatRouter from "../Routes/chat.js";
import messRouter from "../Routes/messager.js";
import homeRouter from "../Routes/home.js";
import { notFound, errHandler } from "../middleware/errorHandler.js";

const initRouters = (app) => {
  app.use("/product", ProductRouter);
  app.use("/user", UserRouter);
  app.use("/category", productCategoryRouter);
  app.use("/brand", brandRouter);
  app.use("/coupon", couponRouter);
  app.use("/order", orderRouter);
  app.use("/chat", chatRouter);
  app.use("/mess", messRouter);
  app.use("/home", homeRouter);
  app.use(notFound);
  app.use(errHandler);
};
export default initRouters;

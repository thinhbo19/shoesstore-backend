import Order from "../models/order.js";

const createOrderService = async ({
  userId,
  products,
  coupon,
  Note,
  address,
  status,
  paymentMethod,
  paymentStatus,
  totalPrice,
}) => {
  const orderData = {
    products,
    totalPrice,
    OrderBy: userId,
    address,
    Note,
    coupon,
    status,
    paymentMethod,
    paymentStatus,
  };

  const newOrder = await Order.create(orderData);
  const populatedOrder = await Order.findById(newOrder._id)
    .populate("products.product", "price productName")
    .exec();

  return populatedOrder;
};

export default {
  createOrderService,
};

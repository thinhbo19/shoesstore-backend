import Order from "../models/order.js";
import User from "../models/user.js";
import Coupon from "../models/coupon.js";
import asyncHandler from "express-async-handler";
import querystring from "qs";
import crypto from "crypto";
import moment from "moment";
import OrderService from "../service/OrderService.js";

function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

var inforOrder = {};

const orderController = {
  createOrder: asyncHandler(async (req, res) => {
    const { id } = req.user;
    const { coupon, address, Note } = req.body;
    if (!address) throw new Error("Vui lòng cung cấp địa chỉ.");
    const userCart = await User.findById(id)
      .select("Cart")
      .populate({ path: "Cart.product", select: "price productName" });
    if (!userCart) throw new Error("Không tìm thấy giỏ hàng của người dùng.");
    const products = userCart?.Cart?.map((el) => ({
      product: el.product._id,
      count: el.count,
      size: el.size,
    }));
    let totalPrice = userCart?.Cart?.reduce(
      (sum, el) => el.product.price * el.count + sum,
      0
    );
    if (coupon) {
      const selectCoupon = await Coupon.findById(coupon);
      if (selectCoupon) {
        totalPrice =
          Math.round(
            (totalPrice * (1 - +selectCoupon?.discount / 100)) / 1000
          ) * 1000 || totalPrice;
      } else {
        throw new Error("Mã giảm giá không hợp lệ.");
      }
    }
    const Data = {
      products,
      totalPrice,
      OrderBy: id,
      address,
      Note,
      coupon,
    };
    const response = await Order.create(Data);
    const populatedResponse = await Order.findById(response._id)
      .populate("products.product", "price productName")
      .exec();
    return res.json({
      status: true,
      response: populatedResponse,
    });
  }),
  getOrder: async (req, res) => {
    const { oid } = req.params;
    try {
      const response = await Order.findById(oid);
      if (response) {
        return res.json({
          success: true,
          response,
        });
      } else {
        return res.json({
          success: false,
          response: "Error: Order not found",
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        response: error.message,
      });
    }
  },
  getByUser: asyncHandler(async (req, res) => {
    const { id } = req.user;
    const response = await Order.find({ OrderBy: id });
    return res.json({
      superuser: response ? true : false,
      response: response ? response : "Error",
    });
  }),
  getByAdmin: asyncHandler(async (req, res) => {
    const response = await Order.find();
    return res.json({
      superuser: response ? true : false,
      response: response ? response : "Error",
    });
  }),
  updateStatus: asyncHandler(async (req, res) => {
    const { oid } = req.params;
    const { status } = req.body;
    const response = await Order.findByIdAndUpdate(
      oid,
      { status },
      { new: true }
    );
    return res.json({
      success: response ? true : false,
      response: response ? response : "false",
    });
  }),
  createOrderCopy: asyncHandler(async (req, res) => {
    const { id } = req.user;
    const {
      products,
      coupon,
      Note,
      address,
      status,
      paymentMethod,
      paymentStatus,
    } = req.body;
    if (!products || products === 0) throw new Error("No products");
    if (!address)
      return res.status(400).json({
        success: false,
        mes: "Bạn chưa chọn địa chỉ",
      });
    let totalPrice = 0;
    products.forEach((el) => {
      totalPrice += el.price * +el.count;
    });
    const Data = {
      products,
      totalPrice,
      OrderBy: id,
      status,
      address,
      paymentMethod,
      paymentStatus,
    };
    if (coupon) {
      const selectCoupon = await Coupon.findById(coupon);
      totalPrice =
        Math.round(totalPrice * (1 - +selectCoupon?.discount / 100) * 1000) /
        1000; // sao cái này ra 0
      (Data.totalPrice = totalPrice), (Data.coupon = coupon);
    }
    if (Note) Data.Note = Note;
    const response = await Order.create(Data);
    return res.json({
      success: response ? true : false,
      response: response ? response : "false",
    });
  }),
  deleteOrder: asyncHandler(async (req, res) => {
    const { oid } = req.params;
    try {
      const response = await Order.findByIdAndDelete(oid);
      if (response) {
        return res.json({
          success: true,
          response,
        });
      } else {
        return res.json({
          success: false,
          response: "Error: Order not found",
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        response: error.message,
      });
    }
  }),
  hanlePaymentUrl: asyncHandler(async (req, res) => {
    try {
      const {
        userId,
        products,
        coupon,
        Note,
        address,
        status,
        paymentMethod,
        paymentStatus,
        totalPrice,
      } = req.body;

      inforOrder.userId = userId;
      inforOrder.coupon = coupon;
      inforOrder.Note = Note;
      inforOrder.address = address;
      inforOrder.status = status;
      inforOrder.paymentMethod = paymentMethod;
      inforOrder.paymentStatus = paymentStatus;
      inforOrder.totalPrice = totalPrice;
      inforOrder.products = products;

      var ipAddr =
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;

      var tmnCode = process.env.VNP_TMNCODE;
      var secretKey = process.env.VNP_HASHSECRET;
      var vnpUrl = process.env.VNP_URL;
      var returnUrl = process.env.VNP_RETURNURL;

      var date = new Date();

      var createDate = moment(date).format("YYYYMMDDHHmmss");
      var amount = totalPrice;
      var bankCode = req.body.bankCode;
      let vnp_TxnRef = createDate;

      var locale = req.body.language;
      if (locale === null || locale === "") {
        locale = "vn";
      }
      var currCode = "VND";
      var vnp_Params = {};
      vnp_Params["vnp_Version"] = "2.1.0";
      vnp_Params["vnp_Command"] = "pay";
      vnp_Params["vnp_TmnCode"] = tmnCode;
      vnp_Params["vnp_Locale"] = locale;
      vnp_Params["vnp_CurrCode"] = currCode;
      vnp_Params["vnp_TxnRef"] = vnp_TxnRef;
      vnp_Params["vnp_OrderInfo"] = "Thanh toan cho ma GD:" + vnp_TxnRef;
      vnp_Params["vnp_OrderType"] = "other";
      vnp_Params["vnp_Amount"] = amount * 100;
      vnp_Params["vnp_ReturnUrl"] = returnUrl;
      vnp_Params["vnp_IpAddr"] = ipAddr;
      vnp_Params["vnp_CreateDate"] = createDate;
      if (bankCode !== null && bankCode !== "") {
        vnp_Params["vnp_BankCode"] = bankCode;
      }

      const sortedParams = sortObject(vnp_Params);

      const signData = querystring.stringify(sortedParams, { encode: false });
      const hmac = crypto.createHmac("sha512", secretKey);
      const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
      sortedParams["vnp_SecureHash"] = signed;

      const paymentUrl =
        vnpUrl + "?" + querystring.stringify(sortedParams, { encode: false });

      return res.status(200).json({ success: true, paymentUrl });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Error",
      });
    }
  }),

  handelVnPayReturn: asyncHandler(async (req, res) => {
    try {
      let vnp_Params = req.query;
      let secureHash = vnp_Params["vnp_SecureHash"];

      delete vnp_Params["vnp_SecureHash"];
      delete vnp_Params["vnp_SecureHashType"];

      vnp_Params = sortObject(vnp_Params);
      let secretKey = process.env.VNP_HASHSECRET;
      let signData = querystring.stringify(vnp_Params, { encode: false });
      let hmac = crypto.createHmac("sha512", secretKey);
      let signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

      if (secureHash === signed) {
        let message = await OrderService.createOrderService({
          ...inforOrder,
          totalPrice: vnp_Params.vnp_Amount / 100,
        });

        if (message.errCode === 0) {
          return res.redirect(
            `${process.env.CLIENT_URL}/thong-tin/lich-su-mua-hang/${message?.orderId}`
          );
        } else {
          return res.status(400).json(message);
        }
      } else {
        return res
          .status(400)
          .json({ errCode: -1, message: "Invalid signature" });
      }
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        errCode: -1,
        message: "Server error",
      });
    }
  }),
};

export default orderController;

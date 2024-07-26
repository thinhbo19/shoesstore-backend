import Order from "../models/order.js";
import User from "../models/user.js";
import Coupon from "../models/coupon.js";
import asyncHandler from "express-async-handler";
import moment from "moment";
import querystring from "qs";
import crypto from "crypto";
import axios from "axios";

const config = {
  app_id: "2553",
  key1: "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
  key2: "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz",
  endpoint: "https://sb-openapi.zalopay.vn/v2/create",
};

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
      paymentMethod,
      paymentStatus,
    };
    if (address) {
      await User.findByIdAndUpdate(id, { $push: { address } }, { Cart: [] });
      Data.address = address;
    }
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
  createPaymentUrl: asyncHandler(async (req, res) => {
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
      } = req.body;

      let totalPrice = 0;
      if (!products || products.length === 0) {
        return res.status(400).json({ success: false, msg: "No products" });
      }
      products.forEach((el) => {
        totalPrice += el.price * el.count;
      });

      const embed_data = {
        redirecturl: process.env.CLIENT_URL,
      }; // Dữ liệu nhúng (nếu cần)
      const items = products.map((product) => ({
        id: product.product,
        name: product.name,
        price: product.price,
        count: product.count,
        img: product.img,
      })); // Danh sách các mặt hàng

      const transID = Math.floor(Math.random() * 1000000); // ID giao dịch ngẫu nhiên

      const order = {
        app_id: config.app_id,
        app_trans_id: `${moment().format("YYMMDD")}_${transID}`,
        app_user: userId,
        app_time: Date.now(),
        item: JSON.stringify(items),
        embed_data: JSON.stringify(embed_data),
        amount: totalPrice,
        description: `Lazada - Payment for the order #${transID}`,
        bank_code: "",
        callback_Url:
          "https://shoesstore-backend-production.up.railway.app/callback",
      };

      // Tạo dữ liệu cần ký
      const data = `${config.app_id}|${order.app_trans_id}|${order.app_user}|${order.amount}|${order.app_time}|${order.embed_data}|${order.item}`;

      // Tạo chữ ký HMAC
      const hmac = crypto.createHmac("sha256", config.key1);
      hmac.update(data);
      order.mac = hmac.digest("hex");
      // Gửi yêu cầu tới API ZaloPay
      const response = await axios.post(config.endpoint, null, {
        params: order,
      });

      return res.status(200).json(response.data);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Error",
      });
    }
  }),
  getPaymentUrl: asyncHandler(async (req, res) => {
    let result = {};

    try {
      let dataStr = req.body.data;
      let reqMac = req.body.mac;

      let mac = crypto.createHmac("sha256", config.key2).toString();
      console.log("mac =", mac);

      if (reqMac !== mac) {
        result.return_code = -1;
        result.return_message = "mac not equal";
      } else {
        let dataJson = JSON.parse(dataStr, config.key2);
        console.log(
          "update order's status = success where app_trans_id =",
          dataJson["app_trans_id"]
        );

        result.return_code = 1;
        result.return_message = "success";
      }
    } catch (ex) {
      result.return_code = 0;
      result.return_message = ex.message;
    }

    res.json(result);
  }),
};

export default orderController;

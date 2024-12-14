import User from "../models/user.js";
import handlePassword from "../utils/hash_password.js";
import Coupon from "../models/coupon.js";
const userControllers = {
  getallUser: async (req, res) => {
    try {
      const user = await User.find();
      res.status(200).json({ user });
    } catch (error) {
      res.status(500).json("Cannot Find");
    }
  },
  deleteUserById: async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      res.status(200).json({ message: "xoa thanh cong", user: user });
    } catch (error) {
      res.status(500).json("Cannot Find");
    }
  },
  updateUser: async (req, res) => {
    const { id } = req.user;
    const { email, username, password, phoneNumber, Address, Avatar, Date } =
      req.body;
    const data = {
      email,
      username,
      password,
      phoneNumber,
      Address,
      Avatar,
      Date,
    };
    try {
      if (req.body.password) {
        data.password = await handlePassword.hashPassword(req.body.password);
      }
      if (req.file) {
        data.Avatar = req.file.path;
      }
      const user = await User.findByIdAndUpdate(id, data, { new: true }).select(
        "-password -refreshToken -admin "
      );
      res.status(200).json({ message: "thanh cong", user: user });
    } catch (error) {
      res.status(500).json("Cannot Find");
    }
  },
  updateUserTest: async (req, res) => {
    const { id } = req.user;
    const { username, phoneNumber, Date } = req.body;

    try {
      // Lấy thông tin user hiện tại
      const currentUser = await User.findById(id).select(
        "-password -refreshToken -admin"
      );
      if (!currentUser) {
        return res.status(404).json({ message: "Không tìm thấy người dùng." });
      }

      // Chỉ cập nhật các trường có giá trị, giữ lại trường cũ nếu rỗng
      const data = {
        username: username || currentUser.username,
        phoneNumber: phoneNumber || currentUser.phoneNumber,
        Date: Date || currentUser.Date,
      };

      // Cập nhật thông tin người dùng
      const updatedUser = await User.findByIdAndUpdate(id, data, {
        new: true,
      }).select("-password -refreshToken -admin");

      res
        .status(200)
        .json({ message: "Cập nhật thành công", user: updatedUser });
    } catch (error) {
      console.error(error); // Log lỗi để dễ debug hơn
      res
        .status(500)
        .json({ message: "Đã xảy ra lỗi trong quá trình cập nhật." });
    }
  },

  updateUserByAdmin: async (req, res) => {
    const { id } = req.params;
    if (req.body.password) {
      req.body.password = await handlePassword.hashPassword(req.body.password);
    }
    if (req.file) {
      req.body.Avatar = req.file.path;
    }
    const response = await User.findByIdAndUpdate(id, req.body, { new: true });
    return res.status(200).json({
      success: response ? true : false,
      updatedUser: response ? response : "Some thing went wrong",
    });
  },
  CurrentUser: async (req, res) => {
    const { id } = req.user;
    const user = await User.findById(id).select(
      "-password -refreshToken -admin"
    );
    return res.status(200).json({
      success: user ? true : false,
      user: user ? user : "Not found",
    });
  },
  CurrentUserById: async (req, res) => {
    const { uid } = req.params;
    const user = await User.findById(uid).select(
      "-password -refreshToken -admin"
    );
    return res.status(200).json({
      success: user ? true : false,
      user: user ? user : "Not found",
    });
  },
  Favorites: async (req, res) => {
    const { pid } = req.params;
    const { id } = req.user;
    const Check = await User.findById(id);
    const Exist = Check?.Favorites?.find((el) => el.toString() === pid);
    if (Exist) {
      const response = await User.findByIdAndUpdate(
        id,
        { $pull: { Favorites: pid } },
        { new: true }
      );
      return res.status(200).json({
        res: response,
        success: response ? false : true,
        msg: response ? " successfully" : "Failed",
      });
    } else {
      const response = await User.findByIdAndUpdate(
        id,
        { $push: { Favorites: pid } },
        { new: true }
      );
      return res.status(200).json({
        res: response,
        success: response ? true : false,
        msg: response ? " successfully" : "Failed",
      });
    }
  },
  updateImgUser: async (req, res) => {
    const { pid } = req.params;
    if (!req.files) throw new Error(`missing inputs`);
    const response = await User.findByIdAndUpdate(
      pid,
      { $push: { images: { $each: req.files.map((el) => el.path) } } },
      { new: true }
    );
    return res.status(200).json({
      status: response ? true : false,
      updateImgProduct: response ? response : "cannot upload img product ",
    });
  },
  updateAddress: async (req, res) => {
    const { id } = req.user;
    const newAddress = req.body.address;

    const user = await User.findById(id).select("Address");
    // Lấy mảng Address của người dùng từ kết quả truy vấn
    const userAddresses = user.Address;
    // So sánh địa chỉ từ request với mỗi địa chỉ trong mảng Address của người dùng
    const addressExists = userAddresses.some(
      (address) => address === newAddress
    );

    if (addressExists) {
      return res.status(400).json({
        status: false,
        mess: "Address existed",
      });
    } else {
      const user = await User.findByIdAndUpdate(
        id,
        { $push: { Address: newAddress } },
        { new: true }
      );
      return res.status(200).json({
        status: true,
        user: user,
      });
    }
  },
  deleteAddress: async (req, res) => {
    const { id } = req.user;
    const index = req.body.index;
    const user = await User.findById(id);
    if (index < user.Address.length && index >= 0) {
      user.Address.splice(index, 1);
      await user.save();
    }
    return res.status(200).json({
      status: user ? true : false,
      Address: user.Address ? user.Address : "Cannot delete address",
    });
  },
  addCoupon: async (req, res) => {
    try {
      const { id } = req.user;
      const { cpid } = req.body;
      if (!cpid) {
        return res.status(400).json({
          success: false,
          msg: "Chưa nhập ID mã giảm",
        });
      }
      const user = await User.findById(id);
      const ExistsCP = user?.Coupon.find((el) => el.toString() === cpid);
      if (ExistsCP) {
        return res.status(400).json({
          success: false,
          msg: "Coupon already exists",
        });
      }
      const response = await User.findByIdAndUpdate(
        id,
        { $push: { Coupon: cpid } },
        { new: true }
      );
      return res.status(200).json({
        success: response ? true : false,
        msg: response ? " successfully" : "Failed",
      });
    } catch (error) {
      console.error("Error adding coupon:", error);
      return res.status(500).json({
        success: false,
        msg: "Internal Server Error",
      });
    }
  },
  removeCoupon: async (req, res) => {
    try {
      const { id } = req.user;
      const { cpid } = req.body;

      if (!cpid) {
        return res.status(400).json({
          success: false,
          msg: "Chưa nhập ID mã giảm",
        });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          msg: "Người dùng không tồn tại",
        });
      }

      const existsCP = user.Coupon.includes(cpid);

      if (!existsCP) {
        return res.status(400).json({
          success: false,
          msg: "Mã giảm giá không tồn tại",
        });
      }

      const response = await User.findByIdAndUpdate(
        id,
        { $pull: { Coupon: cpid } },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        msg: "Mã giảm giá đã được gỡ thành công",
        response,
      });
    } catch (error) {
      console.error("Error removing coupon:", error);
      return res.status(500).json({
        success: false,
        msg: "Lỗi máy chủ nội bộ",
      });
    }
  },
};
export default userControllers;

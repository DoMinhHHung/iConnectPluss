const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  findUser,
  getUser,
  requestOtp,
  sendRegistrationOtp,
  resetPassword,
  updateUser,
  deleteUser,
  requestPasswordChangeOtp,
  changePassword,
  searchUsers,
  uploadAvatar,
  getUserById,
  requestEmailChangeOtp,
  verifyEmailChangeOtp,
} = require("../controllers/userController");
const { authMiddleware } = require("../Middlewares/authMiddleware");

// API không cần xác thực
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/request-otp", requestOtp);
router.post("/send-registration-otp", sendRegistrationOtp);
router.post("/reset-password", resetPassword);

// API cần xác thực - đặt route cụ thể trước
router.get("/profile", authMiddleware, getUser); // Thay đổi "/" thành "/profile" để rõ ràng hơn
router.get("/search/:userId", authMiddleware, findUser);
router.get("/search", authMiddleware, searchUsers);
router.put("/update/:userId", authMiddleware, updateUser);
router.delete("/delete", authMiddleware, deleteUser);
router.post(
  "/request-password-change-otp",
  authMiddleware,
  requestPasswordChangeOtp
);
router.post("/change-password", authMiddleware, changePassword);
router.put("/upload-avatar/:userId", authMiddleware, uploadAvatar);

// Thêm API cho thay đổi email
router.post("/request-email-change-otp", authMiddleware, requestEmailChangeOtp);
router.post("/verify-email-change", authMiddleware, verifyEmailChangeOtp);

// Route lấy thông tin người dùng theo ID đặt CUỐI CÙNG vì nó bắt tất cả các request với pattern "/:userId"
router.get("/:userId", authMiddleware, getUserById);

module.exports = router;

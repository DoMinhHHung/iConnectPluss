const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const requireAuth = require("../middleware/requireAuth");

// Existing routes
router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);
router.post("/request-otp", userController.requestOtp);
router.post("/send-registration-otp", userController.sendRegistrationOtp);
router.post("/reset-password", userController.resetPassword);
router.put("/update/:userId", requireAuth, userController.updateUser);
router.delete("/delete", requireAuth, userController.deleteUser);
router.post(
  "/request-password-change-otp",
  requireAuth,
  userController.requestPasswordChangeOtp
);
router.post("/change-password", requireAuth, userController.changePassword);
router.get("/search", requireAuth, userController.searchUsers);
router.put("/upload-avatar/:userId", requireAuth, userController.uploadAvatar);
router.get("/:userId", requireAuth, userController.getUserById);

// Add new routes for email change
router.post(
  "/request-email-change-otp",
  requireAuth,
  userController.requestEmailChangeOtp
);
router.post(
  "/verify-email-change",
  requireAuth,
  userController.verifyEmailChangeOtp
);

// Thêm route mới cho test email config - đặt chính xác đường dẫn
router.get("/test/email-config", requireAuth, userController.testEmailConfig);

module.exports = router;

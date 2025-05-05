const express = require("express");
const router = express.Router();
const {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  checkFriendshipStatus,
  unfriend,
  getPendingRequests,
  getAllFriendshipRequests,
} = require("../controllers/friendshipController");
const { authMiddleware } = require("../Middlewares/authMiddleware");

// Route cụ thể trước
router.post("/send-request", authMiddleware, sendFriendRequest);
router.post("/accept-request", authMiddleware, acceptFriendRequest);
router.post("/reject-request", authMiddleware, rejectFriendRequest);
router.get("/status/:userId", authMiddleware, checkFriendshipStatus);
router.get("/pending-requests", authMiddleware, getPendingRequests);
router.get("/requests", authMiddleware, getAllFriendshipRequests);
router.delete("/unfriend/:userId", authMiddleware, unfriend);

// lấy danh sách bạn bè
router.get("/", authMiddleware, getFriends);

module.exports = router;

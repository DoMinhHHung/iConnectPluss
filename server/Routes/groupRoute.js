const express = require("express");
const router = express.Router();
const {
  createGroup,
  addMember,
  removeMember,
  getGroupDetails,
  addCoAdmin,
  removeCoAdmin,
  getUserGroups,
  deleteGroup,
  isAdminOrCoAdmin,
} = require("../controllers/groupController");
const {
  saveGroupMessageRoute,
  getGroupMessages,
  deleteGroupMessage,
  addGroupMessageReaction,
  removeGroupMessageReaction,
} = require("../controllers/groupChatController");
const { authMiddleware } = require("../Middlewares/authMiddleware");

// Group management routes
router.post("/create", authMiddleware, createGroup);
router.post("/add-member", authMiddleware, addMember);
router.post("/remove-member", authMiddleware, removeMember);
router.get("/:groupId", authMiddleware, getGroupDetails);
router.post("/add-co-admin", authMiddleware, addCoAdmin);
router.post("/remove-co-admin", authMiddleware, removeCoAdmin);
router.get("/user/groups", authMiddleware, getUserGroups);
router.delete("/:groupId", authMiddleware, deleteGroup);
router.get("/:groupId/check-permissions", authMiddleware, isAdminOrCoAdmin);

// Group chat routes
router.post("/message", authMiddleware, saveGroupMessageRoute);
router.get("/:groupId/messages", authMiddleware, getGroupMessages);
router.delete("/message/:messageId", authMiddleware, deleteGroupMessage);
router.post(
  "/message/:messageId/reaction",
  authMiddleware,
  addGroupMessageReaction
);
router.delete(
  "/message/:messageId/reaction",
  authMiddleware,
  removeGroupMessageReaction
);

module.exports = router;

const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { authMiddleware } = require("../Middlewares/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Thay đổi từ diskStorage sang memoryStorage
const storage = multer.memoryStorage();

// Tạo filter để kiểm tra loại file
const fileFilter = (req, file, cb) => {
  // Chấp nhận các loại file hình ảnh, video, audio và một số loại file phổ biến
  const fileTypes = {
    image: /^image\/(jpeg|jpg|png|gif|webp)$/,
    video: /^video\/.*$/,
    audio: /^audio\/.*$/,
    document:
      /^application\/(pdf|msword|vnd.openxmlformats-officedocument.wordprocessingml.document|vnd.ms-excel|vnd.openxmlformats-officedocument.spreadsheetml.sheet|vnd.ms-powerpoint|vnd.openxmlformats-officedocument.presentationml.presentation|zip|x-rar-compressed|x-7z-compressed)$/,
  };

  const mime = file.mimetype;
  let accepted = false;

  // Kiểm tra file có hợp lệ không
  Object.values(fileTypes).forEach((regex) => {
    if (regex.test(mime)) {
      accepted = true;
    }
  });

  if (accepted) {
    cb(null, true);
  } else {
    cb(new Error("Loại file không được hỗ trợ"), false);
  }
};

// Giới hạn kích thước file là 50MB
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Route cụ thể, đặt trước các route tổng quát
// Route để lấy danh sách cuộc trò chuyện gần đây
router.get("/recent", authMiddleware, chatController.getRecentChats);

// Route để upload file
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  chatController.uploadFile
);

// Route to upload image directly to Cloudinary
router.post(
  "/upload-cloudinary",
  authMiddleware,
  chatController.uploadToCloudinary
);

// Development route for testing Cloudinary uploads (no auth required)
router.post("/test-cloudinary-upload", chatController.uploadToCloudinary);

router.get("/media/:fileId", chatController.getMedia);
router.delete("/media/:fileId", authMiddleware, chatController.deleteMedia);

// Route để lấy tin nhắn giữa 2 người dùng - đặt trước route chung
router.get(
  "/messages/:userId1/:userId2",
  authMiddleware,
  chatController.getMessagesBetweenUsers
);

// Route để lấy tin nhắn trong một phòng
router.get("/messages/:roomId", authMiddleware, chatController.getMessages);

// Route để lưu tin nhắn
router.post("/messages", authMiddleware, chatController.saveMessageRoute);

// Route để thu hồi tin nhắn
router.put(
  "/message/:messageId/unsend",
  authMiddleware,
  chatController.unsendMessage
);

// Route để xóa cuộc trò chuyện
router.delete(
  "/conversation/:userId1/:userId2",
  authMiddleware,
  chatController.deleteConversation
);

// Route xử lý phản ứng tin nhắn
router.post(
  "/message/:messageId/reaction",
  authMiddleware,
  chatController.addReaction
);
router.delete(
  "/message/:messageId/reaction",
  authMiddleware,
  chatController.removeReaction
);

// Endpoint kiểm tra trạng thái cuộc trò chuyện
router.get("/status/:userId", authMiddleware, (req, res) => {
  res.json({ status: "online" });
});

// Xử lý lỗi upload
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "File quá lớn. Kích thước tối đa là 50MB.",
      });
    }
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

module.exports = router;

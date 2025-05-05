const Message = require("../Models/messageModels");
const User = require("../Models/userModel");
const mongoose = require("mongoose");
const { GridFSBucket, ObjectId } = require("mongodb");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const { promisify } = require("util");
const cloudinary = require("../config/cloudinaryConfig");

// Promisify exec để sử dụng async/await
const execAsync = promisify(exec);

// Kết nối với GridFS
let gfs;

// Khởi tạo bucket GridFS
mongoose.connection.once("open", () => {
  gfs = new GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads",
  });
});

// Thời gian sống của file (7 ngày = 604800000 ms)
const FILE_EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000; // 7 ngày

const saveMessage = async ({
  roomId,
  senderId,
  receiver,
  content,
  type = "text",
  tempId,
  replyTo,
  fileUrl,
  fileName,
  fileSize,
  fileThumbnail,
  fileId,
  expiryDate,
}) => {
  try {
    const message = new Message({
      roomId,
      sender: senderId,
      receiver,
      content,
      type,
      ...(replyTo && { replyTo }),
      ...(fileUrl && { fileUrl }),
      ...(fileName && { fileName }),
      ...(fileSize && { fileSize }),
      ...(fileThumbnail && { fileThumbnail }),
      ...(fileId && { fileId }),
      ...(expiryDate && { expiryDate }),
    });
    await message.save();
    return message;
  } catch (error) {
    console.error("Error saving message:", error);
    throw error;
  }
};

// Thêm hàm xử lý route để lưu tin nhắn
const saveMessageRoute = async (req, res) => {
  const {
    roomId,
    content,
    type,
    receiver,
    replyToId,
    fileUrl,
    fileName,
    fileSize,
    fileThumbnail,
    fileId,
    expiryDate,
  } = req.body;
  const senderId = req.user._id;

  try {
    // Xử lý nếu có replyToId
    let replyTo = null;
    if (replyToId) {
      const replyMessage = await Message.findById(replyToId);
      if (replyMessage) {
        replyTo = {
          _id: replyMessage._id,
          content: replyMessage.content,
          sender: replyMessage.sender,
        };
      }
    }

    const message = await saveMessage({
      roomId,
      senderId,
      receiver,
      content,
      type,
      replyTo,
      fileUrl,
      fileName,
      fileSize,
      fileThumbnail,
      fileId,
      expiryDate,
    });

    res.status(201).json(message);
  } catch (error) {
    console.error("Error saving message:", error);
    res
      .status(500)
      .json({ message: "Error saving message", error: error.message });
  }
};

// Hàm xử lý upload file vào MongoDB GridFS
const uploadFile = async (req, res) => {
  try {
    console.log("Bắt đầu xử lý upload file vào MongoDB GridFS...");

    if (!req.file) {
      console.log("Không có file trong request");
      return res.status(400).json({ message: "Không có file nào được upload" });
    }

    console.log("File đã nhận:", req.file.originalname);
    console.log("File type:", req.body.type);
    console.log("File mime:", req.file.mimetype);

    const { type } = req.body;

    // Tạo ID mới cho file
    const fileId = new ObjectId();

    // Ngày hết hạn của file (7 ngày từ hiện tại)
    const expiryDate = new Date(Date.now() + FILE_EXPIRY_TIME);

    // Tạo metadata cho file
    const metadata = {
      type,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadDate: new Date(),
      expiryDate,
      mimetype: req.file.mimetype,
    };

    // Upload file vào GridFS trực tiếp từ buffer
    const uploadStream = gfs.openUploadStreamWithId(
      fileId,
      req.file.originalname,
      {
        metadata,
      }
    );

    // Ghi dữ liệu trực tiếp từ buffer vào GridFS
    uploadStream.write(req.file.buffer);
    uploadStream.end();

    // Chờ cho đến khi upload hoàn tất
    await new Promise((resolve, reject) => {
      uploadStream.on("finish", resolve);
      uploadStream.on("error", reject);
    });

    // Tạo URL cho file
    const serverUrl = `${req.protocol}://${req.get("host")}`;
    const fileUrl = `${serverUrl}/api/chat/media/${fileId}`;

    // Xử lý thumbnail cho video (có thể bỏ qua trong phiên bản này)
    let fileThumbnail = null;

    console.log("Upload thành công. File ID:", fileId);
    console.log("File URL:", fileUrl);
    console.log("File sẽ hết hạn vào:", expiryDate);

    res.status(200).json({
      message: "Upload thành công",
      fileUrl,
      fileId: fileId.toString(),
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileThumbnail,
      expiryDate,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res
      .status(500)
      .json({ message: "Error uploading file", error: error.message });
  }
};

// Hàm lấy media từ GridFS
const getMedia = async (req, res) => {
  try {
    const fileId = new ObjectId(req.params.fileId);

    // Tìm file trong GridFS
    const files = await gfs.find({ _id: fileId }).toArray();

    if (!files || files.length === 0) {
      return res.status(404).json({ message: "File không tồn tại" });
    }

    const file = files[0];

    // Kiểm tra xem file đã hết hạn chưa
    if (
      file.metadata &&
      file.metadata.expiryDate &&
      new Date(file.metadata.expiryDate) < new Date()
    ) {
      // Xóa file đã hết hạn
      await gfs.delete(fileId);
      return res.status(404).json({ message: "File đã hết hạn và bị xóa" });
    }

    // Set header content-type
    res.set("Content-Type", file.metadata.mimetype);

    // Tạo stream để đọc file từ GridFS
    const downloadStream = gfs.openDownloadStream(fileId);

    // Pipe stream vào response
    downloadStream.pipe(res);
  } catch (error) {
    console.error("Error retrieving file:", error);
    res
      .status(500)
      .json({ message: "Error retrieving file", error: error.message });
  }
};

// Hàm xóa media từ GridFS
const deleteMedia = async (req, res) => {
  try {
    const fileId = new ObjectId(req.params.fileId);

    // Xóa file từ GridFS
    await gfs.delete(fileId);

    res.status(200).json({ message: "File đã được xóa thành công" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res
      .status(500)
      .json({ message: "Error deleting file", error: error.message });
  }
};

// Hàm chạy định kỳ để xóa các file hết hạn
const cleanupExpiredFiles = async () => {
  try {
    console.log("Đang kiểm tra và xóa các file đã hết hạn...");

    const currentDate = new Date();
    const files = await gfs
      .find({ "metadata.expiryDate": { $lt: currentDate } })
      .toArray();

    console.log(`Tìm thấy ${files.length} file đã hết hạn`);

    for (const file of files) {
      try {
        await gfs.delete(file._id);
        console.log(`Đã xóa file ${file.filename} (ID: ${file._id})`);
      } catch (err) {
        console.error(`Lỗi khi xóa file ${file._id}:`, err);
      }
    }

    // Cập nhật trạng thái của các tin nhắn có file đã hết hạn
    await Message.updateMany(
      { fileId: { $in: files.map((file) => file._id.toString()) } },
      { $set: { fileExpired: true } }
    );

    console.log("Hoàn tất xóa file hết hạn");
  } catch (error) {
    console.error("Error cleaning up expired files:", error);
  }
};

// Thêm hàm tìm tin nhắn theo ID
const findMessageById = async (messageId) => {
  try {
    return await Message.findById(messageId);
  } catch (error) {
    console.error("Error finding message by ID:", error);
    throw error;
  }
};

// Sửa lại hàm thêm reaction vào tin nhắn
const addReaction = async (messageId, userId, emoji) => {
  try {
    console.log(
      `Đang thêm reaction: ${emoji} từ user ${userId} cho tin nhắn ${messageId}`
    );

    // Sử dụng findOneAndUpdate để cập nhật reaction
    const message = await Message.findByIdAndUpdate(
      messageId,
      {
        $set: { [`reactions.${userId}`]: emoji },
      },
      { new: true }
    );

    if (!message) {
      throw new Error("Message not found");
    }

    console.log("Cập nhật reaction thành công:", message.reactions);
    return message;
  } catch (error) {
    console.error("Error adding reaction:", error);
    throw error;
  }
};

// Hàm để xóa reaction của người dùng đối với tin nhắn
const removeReaction = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id.toString();

  try {
    // Sử dụng $unset để xóa reaction của người dùng
    const message = await Message.findByIdAndUpdate(
      messageId,
      {
        $unset: { [`reactions.${userId}`]: 1 },
      },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: "Không tìm thấy tin nhắn" });
    }

    // Trả về tin nhắn đã được cập nhật
    res.status(200).json({
      message: "Đã xóa reaction thành công",
      reactions: message.reactions,
    });
  } catch (error) {
    console.error("Lỗi khi xóa reaction:", error);
    res
      .status(500)
      .json({ message: "Có lỗi khi xóa reaction", error: error.message });
  }
};

const getMessages = async (req, res) => {
  const { roomId } = req.params;

  try {
    const messages = await Message.find({ roomId })
      .populate("sender", "name avt")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Error fetching messages", error });
  }
};

const getMessagesBetweenUsers = async (req, res) => {
  const { userId1, userId2 } = req.params;

  try {
    // Tạo roomId từ userIds đã sắp xếp
    const userIds = [userId1, userId2].sort();
    const roomId = `${userIds[0]}_${userIds[1]}`;

    // Tìm tin nhắn dựa vào roomId
    const messages = await Message.find({
      roomId: roomId,
    })
      .populate("sender", "name avt")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages between users:", error);
    res.status(500).json({
      message: "Không thể tải tin nhắn giữa hai người dùng",
      error,
    });
  }
};

// Hàm thu hồi tin nhắn
const unsendMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { forEveryone } = req.body;
    const userId = req.user._id;

    // Tìm tin nhắn cần thu hồi
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Tin nhắn không tồn tại" });
    }

    // Kiểm tra xem người dùng có phải là người gửi tin nhắn không
    if (message.sender.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thu hồi tin nhắn này" });
    }

    // Cập nhật tin nhắn
    message.content = "Tin nhắn đã bị thu hồi";
    message.unsent = true;

    await message.save();

    res.status(200).json({ message: "Thu hồi tin nhắn thành công" });
  } catch (error) {
    console.error("Lỗi khi thu hồi tin nhắn:", error);
    res
      .status(500)
      .json({ message: "Lỗi khi thu hồi tin nhắn", error: error.message });
  }
};

// Xóa toàn bộ tin nhắn trong cuộc trò chuyện
const deleteConversation = async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    const requesterId = req.user._id.toString();

    // Kiểm tra xem người dùng có phải là một trong hai người dùng trong cuộc trò chuyện
    if (requesterId !== userId1 && requesterId !== userId2) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xóa cuộc trò chuyện này" });
    }

    // Tạo roomId từ hai userId (đã sắp xếp)
    const userIds = [userId1, userId2].sort();
    const roomId = `${userIds[0]}_${userIds[1]}`;

    // Nếu chỉ xóa tin nhắn của một phía, cập nhật trường deleted cho các tin nhắn
    if (req.query.forCurrentUser === "true") {
      await Message.updateMany(
        { roomId },
        { $addToSet: { deleted_for: requesterId } }
      );
    } else {
      // Nếu xóa toàn bộ cuộc trò chuyện
      await Message.deleteMany({ roomId });
    }

    res.status(200).json({ message: "Xóa cuộc trò chuyện thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa cuộc trò chuyện:", error);
    res
      .status(500)
      .json({ message: "Lỗi khi xóa cuộc trò chuyện", error: error.message });
  }
};

// Hàm để lấy danh sách cuộc trò chuyện gần đây
const getRecentChats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Tìm tất cả tin nhắn mà người dùng này có liên quan
    const results = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: new mongoose.Types.ObjectId(userId) },
            { receiver: new mongoose.Types.ObjectId(userId) },
          ],
          isDeleted: { $ne: true },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: "$roomId",
          lastMessage: { $first: "$$ROOT" },
          updatedAt: { $max: "$createdAt" },
        },
      },
      {
        $sort: { updatedAt: -1 },
      },
    ]);

    // Lấy danh sách người dùng liên quan đến các cuộc trò chuyện
    const chatList = [];
    for (const chat of results) {
      // Xác định ID người dùng khác trong cuộc trò chuyện
      const roomUsers = chat._id.split("_");
      const otherUserId = roomUsers[0] === userId ? roomUsers[1] : roomUsers[0];

      // Lấy thông tin người dùng
      const otherUser = await User.findById(otherUserId).select(
        "name avt email"
      );

      if (otherUser) {
        // Đếm số tin nhắn chưa đọc
        const unreadCount = await Message.countDocuments({
          roomId: chat._id,
          receiver: userId,
          isRead: false,
          isDeleted: { $ne: true },
        });

        // Tạo đối tượng chat
        chatList.push({
          id: chat._id,
          isGroup: false,
          participants: [
            {
              id: userId,
              firstName: req.user.name.split(" ")[0],
              lastName: req.user.name.split(" ")[1] || "",
              avatar: req.user.avt,
            },
            {
              id: otherUser._id,
              firstName: otherUser.name.split(" ")[0],
              lastName: otherUser.name.split(" ")[1] || "",
              avatar: otherUser.avt,
              email: otherUser.email,
            },
          ],
          lastMessage: {
            id: chat.lastMessage._id,
            content: chat.lastMessage.content,
            type: chat.lastMessage.type || "text",
            senderId: chat.lastMessage.sender,
            createdAt: chat.lastMessage.createdAt,
            isRead: chat.lastMessage.isRead,
          },
          unreadCount: unreadCount,
          updatedAt: chat.updatedAt,
        });
      }
    }

    res.json(chatList);
  } catch (error) {
    console.error("Error fetching recent chats:", error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách cuộc trò chuyện" });
  }
};

// Thiết lập chạy cleanup mỗi 24 giờ
setInterval(cleanupExpiredFiles, 24 * 60 * 60 * 1000);
// Chạy ngay lập tức khi khởi động server
setTimeout(cleanupExpiredFiles, 5000);

// Upload to Cloudinary
const uploadToCloudinary = async (req, res) => {
  try {
    console.log("Processing Cloudinary upload request");
    const { image, folder } = req.body;

    if (!image) {
      return res.status(400).json({ message: "No image data provided" });
    }

    // Validate image format
    if (!image.startsWith("data:image/")) {
      return res.status(400).json({ message: "Invalid image format" });
    }

    // Log the size of the incoming image
    const imageSizeInKB = Math.round((image.length * 3) / 4 / 1024);
    console.log(`Image size before Cloudinary processing: ${imageSizeInKB} KB`);

    // Add optimization parameters
    const uploadOptions = {
      folder: folder || "italk_app",
      resource_type: "auto",
      use_filename: true,
      quality: "auto",
      fetch_format: "auto",
      flags: "lossy",
      transformation: [
        { width: "auto", crop: "scale", quality: "auto" },
        { dpr: "auto" },
      ],
    };

    console.log("Uploading to Cloudinary with optimization parameters");

    // Upload to Cloudinary with optimization
    const result = await cloudinary.uploader.upload(image, uploadOptions);

    console.log(`Successfully uploaded to Cloudinary: ${result.secure_url}`);
    console.log(
      `Final image size on Cloudinary: ${Math.round(result.bytes / 1024)} KB`
    );

    // Return the image URL
    return res.status(200).json({
      message: "Upload successful",
      url: result.secure_url,
      public_id: result.public_id,
      size: {
        original: imageSizeInKB,
        optimized: Math.round(result.bytes / 1024),
      },
    });
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    // Check for specific error types
    if (
      error.message.includes("reached limit") ||
      error.message.includes("too large")
    ) {
      return res.status(413).json({
        message:
          "Image is too large. Please use a smaller image or compress it first.",
        error: error.message,
      });
    }
    return res.status(500).json({
      message: "Failed to upload image to Cloudinary",
      error: error.message,
    });
  }
};

module.exports = {
  saveMessage,
  getMessages,
  getMessagesBetweenUsers,
  findMessageById,
  addReaction,
  removeReaction,
  uploadFile,
  saveMessageRoute,
  getMedia,
  deleteMedia,
  cleanupExpiredFiles,
  unsendMessage,
  deleteConversation,
  getRecentChats,
  uploadToCloudinary,
};

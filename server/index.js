const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3005;
const uri = process.env.MONGO_URI;

// Kết nối MongoDB
mongoose
  .connect(uri)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Middleware
app.use(cors());
// Tăng giới hạn kích thước request body cho uploads
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Health check API để client kiểm tra kết nối
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    serverTime: new Date().toLocaleTimeString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Routes API
const userRoute = require("./Routes/userRoute");
const friendshipRoute = require("./Routes/friendshipRoute");
const groupRoute = require("./Routes/groupRoute");
const chatRoute = require("./Routes/chatRoute");
const searchRoute = require("./Routes/searchRoute");

app.use("/api/auth", userRoute);
app.use("/api/user", userRoute);
app.use("/api/friendship", friendshipRoute);
app.use("/api/friends", friendshipRoute);
app.use("/api/groups", groupRoute);
app.use("/api/chat", chatRoute);
app.use("/api/search", searchRoute);

// Socket.IO
const chatController = require("./controllers/chatController");
const friendshipController = require("./controllers/friendshipController");
const groupChatController = require("./controllers/groupChatController");
const Group = require("./Models/groupModel");

// Thêm cài đặt ping timeout và thời gian chờ
io.engine.pingTimeout = 60000; // 60 giây
io.engine.pingInterval = 25000; // 25 giây

// Lưu trữ kết nối socket và trạng thái người dùng
const userSockets = new Map(); // userId -> socketId
const onlineUsers = new Set(); // danh sách userId đang online
let connectCounter = 0; // Đếm số lượng kết nối để giảm log

io.on("connection", (socket) => {
  // Chỉ log thông tin socket.id nếu cần thiết cho debug
  connectCounter++;
  if (connectCounter % 10 === 0) {
    console.log(`[Connection Stats] Total connections: ${connectCounter}, Active users: ${onlineUsers.size}`);
  }

  let currentUserId = null;
  let authenticated = false;

  // Lấy thông tin người dùng từ token
  const token = socket.handshake.auth.token;
  if (token) {
    try {
      // Giải mã token để lấy user._id
      const decoded = require("jsonwebtoken").verify(
        token,
        process.env.JWT_SECRET
      );
      const userId = decoded._id || decoded.id;

      if (userId) {
        authenticated = true;
        currentUserId = userId;
        console.log(`User ${userId} connected with socket ${socket.id}`);

        // Lưu socket id của người dùng
        userSockets.set(userId, socket.id);
        onlineUsers.add(userId);

        // Người dùng tham gia phòng riêng với ID của họ
        socket.join(userId);

        // Thông báo cho các người dùng khác biết người dùng này đã online
        socket.broadcast.emit("userOnline", userId);

        // Gửi danh sách người dùng đang online cho người vừa kết nối
        socket.emit("onlineUsers", Array.from(onlineUsers));

        // Tự động tham gia vào tất cả các phòng nhóm mà người dùng là thành viên
        joinUserGroups(userId, socket);
      }
    } catch (error) {
      console.error("Error authenticating socket connection:", error);
    }
  }

  // Hàm để tự động tham gia vào tất cả các nhóm của người dùng
  async function joinUserGroups(userId, socket) {
    try {
      // Tìm tất cả các nhóm mà người dùng là thành viên
      const groups = await Group.find({ members: userId });

      for (const group of groups) {
        const groupRoomId = `group:${group._id}`;
        socket.join(groupRoomId);
        console.log(`User ${userId} joined group room: ${groupRoomId}`);
      }
    } catch (error) {
      console.error(`Error joining user groups: ${error.message}`);
    }
  }

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Tham gia vào phòng nhóm
  socket.on("joinGroupRoom", (groupId) => {
    const groupRoomId = `group:${groupId}`;
    socket.join(groupRoomId);
    console.log(`User ${currentUserId} joined group room: ${groupRoomId}`);
  });

  // Sự kiện đang nhập
  socket.on("typing", (data) => {
    const { sender, receiver } = data;

    // Gửi thông báo đến người nhận nếu họ đang online
    if (userSockets.has(receiver)) {
      io.to(receiver).emit("userTyping", { userId: sender });
    }
  });

  socket.on("stopTyping", (data) => {
    const { sender, receiver } = data;

    // Gửi thông báo đến người nhận nếu họ đang online
    if (userSockets.has(receiver)) {
      io.to(receiver).emit("userStoppedTyping", { userId: sender });
    }
  });

  // Event đang nhập trong nhóm
  socket.on("typingInGroup", (data) => {
    const { senderId, groupId, senderName } = data;
    const groupRoomId = `group:${groupId}`;

    // Gửi thông báo đến tất cả thành viên trong nhóm (trừ người gửi)
    socket.to(groupRoomId).emit("userTypingInGroup", {
      userId: senderId,
      groupId,
      userName: senderName,
    });
  });

  socket.on("stopTypingInGroup", (data) => {
    const { senderId, groupId } = data;
    const groupRoomId = `group:${groupId}`;

    // Gửi thông báo đến tất cả thành viên trong nhóm (trừ người gửi)
    socket.to(groupRoomId).emit("userStoppedTypingInGroup", {
      userId: senderId,
      groupId,
    });
  });

  socket.on("sendFriendRequest", (data) => {
    const { recipientId, requesterId } = data;
    io.to(recipientId).emit("friendRequestReceived", { requesterId });
    console.log(`Friend request sent from ${requesterId} to ${recipientId}`);
  });

  // Socket events cho chức năng kết bạn
  socket.on("friendRequest", (data) => {
    const { requesterId, recipientId, requesterName, friendshipId } = data;

    // Thêm log để debug
    console.log(
      `Socket: Yêu cầu kết bạn từ ${requesterId} (${requesterName}) đến ${recipientId}`
    );

    // Nếu người nhận đang online, gửi thông báo tới người nhận
    if (userSockets.has(recipientId)) {
      io.to(recipientId).emit("friendRequestReceived", {
        friendshipId,
        requesterId,
        recipientId,
        requesterName,
      });
      console.log(`Đã gửi thông báo yêu cầu kết bạn tới ${recipientId}`);
    } else {
      console.log(
        `Người dùng ${recipientId} không online, không gửi thông báo trực tiếp`
      );
    }
  });

  socket.on("friendRequestAccepted", (data) => {
    const { requesterId, recipientId, friendshipId } = data;

    // Thêm log để debug
    console.log(`Socket: Yêu cầu kết bạn được chấp nhận: ${friendshipId}`);
    console.log(`Người gửi: ${requesterId}, Người nhận: ${recipientId}`);

    // Nếu người gửi yêu cầu ban đầu đang online, gửi thông báo
    if (userSockets.has(requesterId)) {
      io.to(requesterId).emit("friendRequestAccepted", {
        friendshipId,
        requesterId,
        recipientId,
      });
      console.log(`Đã gửi thông báo chấp nhận kết bạn tới ${requesterId}`);
    }

    // Gửi broadcast để cập nhật trạng thái ở tất cả clients
    io.emit("friendStatusUpdated", {
      users: [requesterId, recipientId],
      status: "friends",
    });
  });

  socket.on("friendRequestRejected", (data) => {
    const { requesterId, recipientId, friendshipId } = data;

    console.log(`Socket: Yêu cầu kết bạn bị từ chối: ${friendshipId}`);

    // Thông báo cho người gửi yêu cầu ban đầu nếu họ online
    if (userSockets.has(requesterId)) {
      io.to(requesterId).emit("friendRequestRejected", {
        friendshipId,
        requesterId,
        recipientId,
      });
      console.log(`Đã gửi thông báo từ chối kết bạn tới ${requesterId}`);
    }
  });

  // Gửi tin nhắn trong nhóm
  socket.on("sendGroupMessage", async (data) => {
    const {
      senderId,
      groupId,
      content,
      type = "text",
      tempId,
      replyToId,
      fileUrl,
      fileName,
      fileSize,
      fileThumbnail,
      fileId,
      expiryDate,
    } = data;

    try {
      // Tạo roomId cho nhóm
      const roomId = `group:${groupId}`;

      // Kiểm tra xem người dùng có quyền gửi tin nhắn trong nhóm không
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error("Group not found");
      }

      if (!group.members.includes(senderId)) {
        throw new Error("You are not a member of this group");
      }

      // Tìm tin nhắn để trả lời nếu có
      let replyToData = null;
      if (replyToId) {
        const replyMessage = await chatController.findMessageById(replyToId);
        if (replyMessage) {
          replyToData = {
            _id: replyMessage._id,
            content: replyMessage.content,
            sender: replyMessage.sender,
          };
        }
      }

      // Lưu tin nhắn
      const message = await groupChatController.saveGroupMessage({
        roomId,
        groupId,
        senderId,
        content,
        type,
        tempId,
        replyTo: replyToData,
        fileUrl,
        fileName,
        fileSize,
        fileThumbnail,
        fileId,
        expiryDate,
      });

      // Populate thông tin người gửi
      await message.populate("sender", "name avt");

      // Gửi tin nhắn đến tất cả thành viên trong nhóm
      io.to(roomId).emit("receiveGroupMessage", {
        ...message.toObject(),
        _tempId: tempId,
      });

      console.log(`Group message sent from ${senderId} to group ${groupId}`);
    } catch (error) {
      console.error("Error sending group message:", error);
      // Thông báo lỗi cho người gửi
      io.to(senderId).emit("groupMessageError", {
        tempId,
        groupId,
        error: error.message,
      });
    }
  });

  // Reaction trong nhóm
  socket.on("addGroupReaction", async (data) => {
    const { messageId, userId, emoji, groupId } = data;

    try {
      // Lưu reaction vào cơ sở dữ liệu
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

      const roomId = `group:${groupId}`;

      // Phát sóng reaction đến tất cả thành viên trong nhóm
      io.to(roomId).emit("groupMessageReaction", {
        messageId,
        userId,
        emoji,
        groupId,
      });

      console.log(
        `Group reaction from ${userId} for message ${messageId}: ${emoji} sent to room ${roomId}`
      );
    } catch (error) {
      console.error("Error adding group reaction:", error);
    }
  });

  // Xóa tin nhắn nhóm
  socket.on("deleteGroupMessage", async (data) => {
    const { messageId, userId, groupId } = data;

    try {
      // Thông báo cho tất cả thành viên trong nhóm
      const roomId = `group:${groupId}`;
      io.to(roomId).emit("groupMessageDeleted", {
        messageId,
        deletedBy: userId,
        groupId,
      });

      console.log(
        `Group message ${messageId} deleted by ${userId} in group ${groupId}`
      );
    } catch (error) {
      console.error("Error handling group message deletion:", error);
    }
  });

  // Events cho quản lý nhóm
  socket.on("memberAddedToGroup", async (data) => {
    const { groupId, memberId, addedBy } = data;

    try {
      const roomId = `group:${groupId}`;

      // Thông báo cho tất cả thành viên trong nhóm
      io.to(roomId).emit("newGroupMember", {
        groupId,
        memberId,
        addedBy,
      });

      // Thông báo cho thành viên mới
      if (userSockets.has(memberId)) {
        io.to(memberId).emit("addedToGroup", { groupId });

        // Tự động thêm thành viên mới vào phòng nhóm
        const memberSocketId = userSockets.get(memberId);
        const memberSocket = io.sockets.sockets.get(memberSocketId);
        if (memberSocket) {
          memberSocket.join(roomId);
        }
      }

      console.log(`Member ${memberId} added to group ${groupId} by ${addedBy}`);
    } catch (error) {
      console.error("Error handling member addition to group:", error);
    }
  });

  socket.on("memberRemovedFromGroup", async (data) => {
    const { groupId, memberId, removedBy } = data;

    try {
      const roomId = `group:${groupId}`;

      // Thông báo cho tất cả thành viên trong nhóm
      io.to(roomId).emit("memberLeftGroup", {
        groupId,
        memberId,
        removedBy,
      });

      // Thông báo cho thành viên bị xóa
      if (userSockets.has(memberId)) {
        io.to(memberId).emit("removedFromGroup", { groupId, removedBy });

        // Rời phòng nhóm
        const memberSocketId = userSockets.get(memberId);
        const memberSocket = io.sockets.sockets.get(memberSocketId);
        if (memberSocket) {
          memberSocket.leave(roomId);
        }
      }

      console.log(
        `Member ${memberId} removed from group ${groupId} by ${removedBy}`
      );
    } catch (error) {
      console.error("Error handling member removal from group:", error);
    }
  });

  socket.on("groupDissolved", async (data) => {
    const { groupId, dissolvedBy } = data;

    try {
      const roomId = `group:${groupId}`;

      // Thông báo cho tất cả thành viên trong nhóm
      io.to(roomId).emit("groupDissolved", {
        groupId,
        dissolvedBy,
      });

      console.log(`Group ${groupId} dissolved by ${dissolvedBy}`);
    } catch (error) {
      console.error("Error handling group dissolution:", error);
    }
  });

  socket.on("coAdminAdded", async (data) => {
    const { groupId, userId, addedBy } = data;

    try {
      const roomId = `group:${groupId}`;

      // Thông báo cho tất cả thành viên trong nhóm
      io.to(roomId).emit("newCoAdmin", {
        groupId,
        userId,
        addedBy,
      });

      console.log(`Co-admin ${userId} added to group ${groupId} by ${addedBy}`);
    } catch (error) {
      console.error("Error handling co-admin addition:", error);
    }
  });

  socket.on("coAdminRemoved", async (data) => {
    const { groupId, userId, removedBy } = data;

    try {
      const roomId = `group:${groupId}`;

      // Thông báo cho tất cả thành viên trong nhóm
      io.to(roomId).emit("coAdminRemoved", {
        groupId,
        userId,
        removedBy,
      });

      console.log(
        `Co-admin ${userId} removed from group ${groupId} by ${removedBy}`
      );
    } catch (error) {
      console.error("Error handling co-admin removal:", error);
    }
  });

  socket.on("sendMessage", async (data) => {
    const {
      sender,
      receiver,
      content,
      type = "text",
      tempId,
      replyToId,
      fileUrl,
      fileName,
      fileSize,
      fileThumbnail,
      fileId,
      expiryDate,
    } = data;

    try {
      // Tạo một roomId duy nhất cho cuộc trò chuyện giữa 2 người dùng
      const userIds = [sender, receiver].sort();
      const roomId = `${userIds[0]}_${userIds[1]}`;

      // Tìm tin nhắn để trả lời nếu có
      let replyToData = null;
      if (replyToId) {
        const replyMessage = await chatController.findMessageById(replyToId);
        if (replyMessage) {
          replyToData = {
            _id: replyMessage._id,
            content: replyMessage.content,
            sender: replyMessage.sender,
          };
        }
      }

      const message = await chatController.saveMessage({
        roomId,
        senderId: sender,
        receiver,
        content,
        type,
        tempId,
        replyTo: replyToData,
        fileUrl,
        fileName,
        fileSize,
        fileThumbnail,
        fileId,
        expiryDate,
      });

      // Xác định trạng thái tin nhắn dựa trên việc người nhận có online không
      const isReceiverOnline = userSockets.has(receiver);
      const initialStatus = isReceiverOnline ? "delivered" : "sent";

      // Gửi tin nhắn đến người gửi với trạng thái phù hợp
      io.to(sender).emit("receiveMessage", {
        ...message.toObject(),
        status: initialStatus,
        _tempId: tempId, // Thêm tempId để frontend có thể cập nhật tin nhắn tạm thời
      });

      // Gửi tin nhắn đến người nhận nếu họ online
      if (isReceiverOnline) {
        io.to(receiver).emit("receiveMessage", {
          ...message.toObject(),
          status: "delivered",
        });
      }

      console.log(
        `Message sent from ${sender} to ${receiver} with status ${initialStatus}`
      );
    } catch (error) {
      console.error("Error sending message:", error);
      // Thông báo lỗi cho người gửi
      io.to(sender).emit("messageError", { tempId, error: error.message });
    }
  });

  // Xử lý phản ứng với tin nhắn
  socket.on("addReaction", async (data) => {
    const { messageId, userId, emoji } = data;

    try {
      // Lưu reaction vào cơ sở dữ liệu
      await chatController.addReaction(messageId, userId, emoji);

      // Lấy thông tin tin nhắn để biết người nhận
      const message = await chatController.findMessageById(messageId);

      if (message) {
        // Xác định người nhận thông báo (người gửi và người nhận tin nhắn gốc)
        const senderId = message.sender.toString();
        const receiverId = message.receiver.toString();

        console.log(
          `Gửi reaction từ ${userId} cho tin nhắn ${messageId}: ${emoji}`
        );

        // Chỉ gửi thông báo đến hai người trong cuộc trò chuyện
        if (userSockets.has(senderId)) {
          io.to(senderId).emit("messageReaction", { messageId, userId, emoji });
          console.log(`Đã gửi thông báo reaction đến người gửi: ${senderId}`);
        }

        if (userSockets.has(receiverId)) {
          io.to(receiverId).emit("messageReaction", {
            messageId,
            userId,
            emoji,
          });
          console.log(
            `Đã gửi thông báo reaction đến người nhận: ${receiverId}`
          );
        }
      }
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  });

  // Sự kiện khi tin nhắn được xem
  socket.on("messageRead", (data) => {
    const { messageId, sender, receiver } = data;

    // Chỉ thông báo cho người gửi ban đầu
    if (userSockets.has(sender)) {
      io.to(sender).emit("messageStatusUpdate", {
        messageId,
        status: "seen",
      });
    }
  });

  // Thêm socket events cho thu hồi tin nhắn và xóa cuộc trò chuyện
  socket.on("unsendMessage", (data) => {
    const { messageId, senderId, receiverId } = data;

    // Thông báo cho người nhận tin nhắn rằng tin nhắn đã bị thu hồi
    if (userSockets.has(receiverId)) {
      io.to(receiverId).emit("messageUnsent", { messageId });
      console.log(
        `Đã thông báo thu hồi tin nhắn ${messageId} tới người dùng ${receiverId}`
      );
    }
  });

  socket.on("deleteConversation", (data) => {
    const { senderId, receiverId } = data;

    // Thông báo cho người nhận rằng cuộc trò chuyện đã bị xóa
    if (userSockets.has(receiverId)) {
      io.to(receiverId).emit("conversationDeleted", { senderId });
      console.log(
        `Đã thông báo xóa cuộc trò chuyện từ ${senderId} tới người dùng ${receiverId}`
      );
    }
  });

  socket.on("disconnect", () => {
    // Chỉ log disconnect khi người dùng đã xác thực
    if (authenticated) {
      console.log(`User ${currentUserId} disconnected`);
      
      // Xóa thông tin socket và cập nhật trạng thái người dùng
      userSockets.delete(currentUserId);
      onlineUsers.delete(currentUserId);

      // Thông báo cho tất cả người dùng khác
      socket.broadcast.emit("userOffline", currentUserId);
    }
  });
});

// Khởi động server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

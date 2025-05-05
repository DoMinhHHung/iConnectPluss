const Message = require("../Models/messageModels");
const Group = require("../Models/groupModel");
const mongoose = require("mongoose");
const { GridFSBucket, ObjectId } = require("mongodb");

// Thêm tin nhắn vào nhóm
const saveGroupMessage = async ({
  roomId,
  groupId,
  senderId,
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
      groupId,
      content,
      type,
      chatType: "group",
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
    console.error("Error saving group message:", error);
    throw error;
  }
};

// API endpoint để lưu tin nhắn nhóm
const saveGroupMessageRoute = async (req, res) => {
  const {
    roomId,
    groupId,
    content,
    type,
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
    // Kiểm tra xem nhóm có tồn tại không
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Kiểm tra xem người gửi có phải là thành viên của nhóm không
    if (!group.members.includes(senderId)) {
      return res.status(403).json({
        message: "You are not a member of this group and cannot send messages",
      });
    }

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

    const message = await saveGroupMessage({
      roomId,
      groupId,
      senderId,
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

    // Populate thông tin người gửi để trả về
    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      "name avt"
    );

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error saving group message:", error);
    res.status(500).json({
      message: "Error saving group message",
      error: error.message,
    });
  }
};

// Lấy tin nhắn của nhóm
const getGroupMessages = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  try {
    // Kiểm tra xem người dùng có phải là thành viên của nhóm không
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!group.members.includes(userId)) {
      return res.status(403).json({
        message: "You are not a member of this group and cannot view messages",
      });
    }

    // Lấy tin nhắn của nhóm
    const messages = await Message.find({
      groupId,
      chatType: "group",
    })
      .populate("sender", "name avt")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching group messages:", error);
    res.status(500).json({
      message: "Error fetching group messages",
      error: error.message,
    });
  }
};

// Xóa tin nhắn trong nhóm (admin hoặc co-admin)
const deleteGroupMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  try {
    // Tìm tin nhắn
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Kiểm tra xem tin nhắn có phải từ nhóm không
    if (!message.groupId || message.chatType !== "group") {
      return res.status(400).json({ message: "This is not a group message" });
    }

    // Lấy thông tin nhóm
    const group = await Group.findById(message.groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isAdmin = group.admin.toString() === userId.toString();
    const isCoAdmin = group.coAdmins.some(
      (id) => id.toString() === userId.toString()
    );
    const isSender = message.sender.toString() === userId.toString();

    // Chỉ admin, co-admin hoặc người gửi mới có thể xóa tin nhắn
    if (!isAdmin && !isCoAdmin && !isSender) {
      return res.status(403).json({
        message: "You don't have permission to delete this message",
      });
    }

    // Thay vì xóa, chúng ta đánh dấu là đã bị xóa
    message.isUnsent = true;
    message.content = "Tin nhắn đã bị xóa";
    await message.save();

    res.status(200).json({
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting group message:", error);
    res.status(500).json({
      message: "Error deleting group message",
      error: error.message,
    });
  }
};

// Thêm reaction cho tin nhắn nhóm
const addGroupMessageReaction = async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user._id;

  try {
    // Tìm tin nhắn
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Kiểm tra xem tin nhắn có phải từ nhóm không
    if (!message.groupId || message.chatType !== "group") {
      return res.status(400).json({ message: "This is not a group message" });
    }

    // Kiểm tra xem người dùng có phải là thành viên của nhóm không
    const group = await Group.findById(message.groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!group.members.includes(userId)) {
      return res.status(403).json({
        message: "You are not a member of this group",
      });
    }

    // Thêm reaction
    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      {
        $set: { [`reactions.${userId}`]: emoji },
      },
      { new: true }
    );

    res.status(200).json(updatedMessage);
  } catch (error) {
    console.error("Error adding reaction to group message:", error);
    res.status(500).json({
      message: "Error adding reaction",
      error: error.message,
    });
  }
};

// Xóa reaction khỏi tin nhắn nhóm
const removeGroupMessageReaction = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  try {
    // Tìm tin nhắn
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Kiểm tra xem tin nhắn có phải từ nhóm không
    if (!message.groupId || message.chatType !== "group") {
      return res.status(400).json({ message: "This is not a group message" });
    }

    // Xóa reaction
    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      {
        $unset: { [`reactions.${userId}`]: "" },
      },
      { new: true }
    );

    res.status(200).json(updatedMessage);
  } catch (error) {
    console.error("Error removing reaction from group message:", error);
    res.status(500).json({
      message: "Error removing reaction",
      error: error.message,
    });
  }
};

module.exports = {
  saveGroupMessage,
  saveGroupMessageRoute,
  getGroupMessages,
  deleteGroupMessage,
  addGroupMessageReaction,
  removeGroupMessageReaction,
};

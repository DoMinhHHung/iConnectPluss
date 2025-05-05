const Friendship = require("../Models/Friendship");
const User = require("../Models/userModel");

const sendFriendRequest = async (req, res) => {
  const { recipientId } = req.body;
  const requesterId = req.user._id; // Ensure req.user is populated by authMiddleware

  try {
    const friendship = new Friendship({
      requester: requesterId,
      recipient: recipientId,
    });

    await friendship.save();
    res.status(201).json({ message: "Friend request sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error sending friend request", error });
  }
};

const acceptFriendRequest = async (req, res) => {
  const { friendshipId } = req.body;

  try {
    const friendship = await Friendship.findByIdAndUpdate(
      friendshipId,
      { status: "accepted" },
      { new: true }
    );

    if (!friendship) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    res.status(200).json({ message: "Friend request accepted", friendship });
  } catch (error) {
    res.status(500).json({ message: "Error accepting friend request", error });
  }
};

const rejectFriendRequest = async (req, res) => {
  const { friendshipId } = req.body;

  try {
    const friendship = await Friendship.findByIdAndUpdate(
      friendshipId,
      { status: "rejected" },
      { new: true }
    );

    if (!friendship) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    res.status(200).json({ message: "Friend request rejected", friendship });
  } catch (error) {
    res.status(500).json({ message: "Error rejecting friend request", error });
  }
};

const getFriends = async (req, res) => {
  const userId = req.user._id; // Ensure req.user is populated by authMiddleware

  try {
    console.log("Fetching friends for user ID:", userId);

    const friendships = await Friendship.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: "accepted",
    })
      .populate("requester", "name email avt _id") // Thêm email và _id
      .populate("recipient", "name email avt _id"); // Thêm email và _id

    console.log(
      `Found ${friendships.length} friendships with status 'accepted'`
    );
    console.log("Friendship data:", JSON.stringify(friendships));

    res.status(200).json(friendships);
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ message: "Error fetching friends", error });
  }
};

const checkFriendshipStatus = async (req, res) => {
  const { userId } = req.params; // ID của người dùng cần kiểm tra trạng thái
  const currentUserId = req.user._id; // ID của người dùng hiện tại

  // Add validation for userId
  if (!userId || userId === "undefined" || userId === "null") {
    return res.status(400).json({
      message: "Invalid user ID provided",
      status: null,
    });
  }

  try {
    const friendship = await Friendship.findOne({
      $or: [
        { requester: currentUserId, recipient: userId },
        { recipient: currentUserId, requester: userId },
      ],
    });

    if (!friendship) {
      return res.status(200).json({ status: null }); // Không có trạng thái
    }

    res.status(200).json({ status: friendship.status });
  } catch (error) {
    console.error("Error checking friendship status:", error);
    res
      .status(500)
      .json({ message: "Error checking friendship status", error });
  }
};

const unfriend = async (req, res) => {
  const { userId } = req.params; // ID của người dùng cần hủy kết bạn
  const currentUserId = req.user._id; // ID của người dùng hiện tại

  try {
    const friendship = await Friendship.findOneAndDelete({
      $or: [
        { requester: currentUserId, recipient: userId },
        { recipient: currentUserId, requester: userId },
      ],
    });

    if (!friendship) {
      return res.status(404).json({ message: "Friendship not found" });
    }

    res.status(200).json({ message: "Unfriended successfully" });
  } catch (error) {
    console.error("Error unfriending user:", error);
    res.status(500).json({ message: "Error unfriending user", error });
  }
};

// Lấy danh sách yêu cầu kết bạn đang chờ xử lý
const getPendingRequests = async (req, res) => {
  const currentUserId = req.user._id;

  try {
    // Tìm các yêu cầu kết bạn mà người dùng hiện tại là người nhận và có trạng thái pending
    const pendingRequests = await Friendship.find({
      recipient: currentUserId,
      status: "pending",
    }).populate("requester", "name avt");

    res.status(200).json(pendingRequests);
  } catch (error) {
    console.error("Error fetching pending friend requests:", error);
    res
      .status(500)
      .json({ message: "Error fetching pending friend requests", error });
  }
};

// Lấy tất cả yêu cầu kết bạn (cả đã gửi và đã nhận)
const getAllFriendshipRequests = async (req, res) => {
  const currentUserId = req.user._id;

  try {
    // Tìm các yêu cầu kết bạn mà người dùng hiện tại là người nhận hoặc người gửi
    const allRequests = await Friendship.find({
      $or: [{ recipient: currentUserId }, { requester: currentUserId }],
      status: "pending",
    })
      .populate("requester", "name avt")
      .populate("recipient", "name avt");

    // Chia thành hai danh sách: đã gửi và đã nhận
    const received = allRequests.filter(
      (request) => request.recipient._id.toString() === currentUserId.toString()
    );

    const sent = allRequests.filter(
      (request) => request.requester._id.toString() === currentUserId.toString()
    );

    res.status(200).json({
      received,
      sent,
      total: allRequests.length,
    });
  } catch (error) {
    console.error("Error fetching all friendship requests:", error);
    res.status(500).json({
      message: "Error fetching friendship requests",
      error: error.message,
    });
  }
};

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  checkFriendshipStatus,
  unfriend,
  getPendingRequests,
  getAllFriendshipRequests, // Thêm hàm mới vào exports
};

const User = require("../Models/userModel");
const Group = require("../Models/groupModel");
const Message = require("../Models/messageModels");

const search = async (req, res) => {
  const { q, filter = "all" } = req.query;
  console.log("Search query:", q);
  console.log("Filter:", filter);

  if (!q) {
    return res.status(400).json({ message: "Cần có từ khóa tìm kiếm" });
  }

  try {
    let results = [];

    if (filter === "all" || filter === "users") {
      console.log("Searching users with query:", q);

      // Escape special characters for regex safety
      const safeQuery = q.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

      const userQuery = {
        $or: [
          { name: { $regex: safeQuery, $options: "i" } },
          { email: { $regex: safeQuery, $options: "i" } },
          { phone: { $regex: safeQuery, $options: "i" } },
        ],
      };
      console.log("User query:", JSON.stringify(userQuery));

      const users = await User.find(userQuery).select("-password");
      console.log("Users found:", users.length);

      // Detailed logging for debugging
      if (users.length === 0) {
        // Let's try a direct query for exact match on phone to debug
        const directPhoneUser = await User.findOne({ phone: q }).select(
          "-password"
        );
        console.log(
          "Direct phone search result:",
          directPhoneUser ? "Found" : "Not found"
        );

        // Count total users in the database
        const totalUsers = await User.countDocuments();
        console.log("Total users in database:", totalUsers);

        // List a sample of users to verify data structure
        const sampleUsers = await User.find()
          .limit(3)
          .select("name phone email");
        console.log("Sample users:", JSON.stringify(sampleUsers));
      } else {
        console.log(
          "Found users:",
          JSON.stringify(
            users.map((u) => ({ id: u._id, name: u.name, phone: u.phone }))
          )
        );
      }

      if (users.length > 0) {
        results = [
          ...results,
          ...users.map((user) => ({
            ...user.toObject(),
            type: "user",
          })),
        ];
      }
    }

    // Tìm kiếm nhóm nếu filter là all hoặc groups
    if (filter === "all" || filter === "groups") {
      console.log("Searching groups with query:", q);
      const groups = await Group.find({
        name: { $regex: q, $options: "i" },
      });
      console.log("Groups found:", groups.length);

      if (groups.length > 0) {
        results = [
          ...results,
          ...groups.map((group) => ({
            ...group.toObject(),
            type: "group",
          })),
        ];
      }
    }

    // Tìm kiếm tin nhắn nếu filter là all hoặc messages
    if (filter === "all" || filter === "messages") {
      console.log("Searching messages with query:", q);
      const messages = await Message.find({
        content: { $regex: q, $options: "i" },
      }).populate("sender", "name avt");
      console.log("Messages found:", messages.length);

      if (messages.length > 0) {
        results = [
          ...results,
          ...messages.map((message) => ({
            ...message.toObject(),
            type: "message",
          })),
        ];
      }
    }

    console.log("Total results:", results.length);
    res.status(200).json(results);
  } catch (error) {
    console.error("Lỗi tìm kiếm:", error);
    res.status(500).json({ message: "Lỗi tìm kiếm", error: error.message });
  }
};

// Hàm tìm kiếm chỉ người dùng
const searchUsers = async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ message: "Cần có từ khóa tìm kiếm" });
  }

  try {
    // Escape special characters for regex safety
    const safeQuery = q.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

    const users = await User.find({
      $or: [
        { name: { $regex: safeQuery, $options: "i" } },
        { email: { $regex: safeQuery, $options: "i" } },
        { phone: { $regex: safeQuery, $options: "i" } },
      ],
    }).select("-password");

    res.status(200).json(users);
  } catch (error) {
    console.error("Lỗi tìm kiếm người dùng:", error);
    res.status(500).json({
      message: "Lỗi tìm kiếm người dùng",
      error: error.message,
    });
  }
};

// Hàm tìm kiếm chỉ nhóm
const searchGroups = async (req, res) => {
  const { q } = req.query;
  const userId = req.user._id;

  if (!q) {
    return res.status(400).json({ message: "Cần có từ khóa tìm kiếm" });
  }

  try {
    // Tìm các nhóm mà người dùng là thành viên và tên nhóm khớp với từ khóa
    const groups = await Group.find({
      name: { $regex: q, $options: "i" },
      members: userId, // Chỉ tìm các nhóm mà người dùng là thành viên
    });

    res.status(200).json(groups);
  } catch (error) {
    console.error("Lỗi tìm kiếm nhóm:", error);
    res.status(500).json({
      message: "Lỗi tìm kiếm nhóm",
      error: error.message,
    });
  }
};

// Hàm tìm kiếm chính xác theo tên
const searchByName = async (req, res) => {
  const { name } = req.params;

  try {
    const users = await User.find({
      name: { $regex: `^${name}$`, $options: "i" },
    }).select("-password");

    if (users.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy người dùng nào với tên chính xác này",
      });
    }

    res.status(200).json(users);
  } catch (error) {
    console.error("Lỗi tìm kiếm theo tên:", error);
    res.status(500).json({
      message: "Lỗi tìm kiếm theo tên",
      error: error.message,
    });
  }
};

module.exports = {
  search,
  searchUsers,
  searchGroups,
  searchByName,
};

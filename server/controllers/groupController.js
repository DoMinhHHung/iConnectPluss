const Group = require("../Models/groupModel");
const User = require("../Models/userModel");
const Message = require("../Models/messageModels");
const cloudinary = require("../config/cloudinaryConfig");

const createGroup = async (req, res) => {
  const { name, members, description } = req.body;
  const admin = req.user._id;
  let avatarUrl = null;

  try {
    if (req.files && req.files.avatar) {
      const uploadResult = await cloudinary.uploader.upload(
        req.files.avatar.tempFilePath,
        {
          folder: "group_avatars",
          width: 150,
          crop: "scale",
        }
      );
      avatarUrl = uploadResult.secure_url;
    }

    if (!members.includes(admin.toString())) {
      members.push(admin);
    }
    if (members.length < 3) {
      return res
        .status(400)
        .json({ message: "Nhóm phải có ít nhất 3 thành viên." });
    }

    const group = new Group({
      name,
      members,
      admin,
      description,
      avatarUrl,
      coAdmins: [],
    });

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("members", "name avt")
      .populate("admin", "name avt");

    res
      .status(201)
      .json({ message: "Group created successfully", group: populatedGroup });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating group", error: error.message });
  }
};

const addMember = async (req, res) => {
  const { groupId, memberId } = req.body;
  const userId = req.user._id;

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isAdmin = group.admin.toString() === userId.toString();
    const isCoAdmin = group.coAdmins.some(
      (id) => id.toString() === userId.toString()
    );

    if (!isAdmin && !isCoAdmin) {
      return res
        .status(403)
        .json({ message: "You don't have permission to add members" });
    }

    // Add member to group
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { members: memberId } },
      { new: true }
    )
      .populate("members", "name avt")
      .populate("admin", "name avt")
      .populate("coAdmins", "name avt");

    res
      .status(200)
      .json({ message: "Member added successfully", group: updatedGroup });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error adding member", error: error.message });
  }
};

const removeMember = async (req, res) => {
  const { groupId, memberId } = req.body;
  const userId = req.user._id;

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user has permission to remove members
    const isAdmin = group.admin.toString() === userId.toString();
    const isCoAdmin = group.coAdmins.some(
      (id) => id.toString() === userId.toString()
    );

    if (!isAdmin && !isCoAdmin) {
      return res
        .status(403)
        .json({ message: "You don't have permission to remove members" });
    }

    // Admin and co-admin can't be removed by co-admin
    if (isCoAdmin && !isAdmin) {
      if (
        group.admin.toString() === memberId.toString() ||
        group.coAdmins.some((id) => id.toString() === memberId.toString())
      ) {
        return res
          .status(403)
          .json({ message: "Co-admins can't remove admin or other co-admins" });
      }
    }

    // Remove member from group
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $pull: { members: memberId, coAdmins: memberId } },
      { new: true }
    )
      .populate("members", "name avt")
      .populate("admin", "name avt")
      .populate("coAdmins", "name avt");

    res
      .status(200)
      .json({ message: "Member removed successfully", group: updatedGroup });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error removing member", error: error.message });
  }
};

const getGroupDetails = async (req, res) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findById(groupId)
      .populate("members", "name avt")
      .populate("admin", "name avt")
      .populate("coAdmins", "name avt");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.status(200).json(group);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching group details", error: error.message });
  }
};

// Add a co-admin to the group
const addCoAdmin = async (req, res) => {
  const { groupId, userId } = req.body;
  const currentUserId = req.user._id;

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Không tìm thấy nhóm" });
    }

    // Only admin can add co-admins
    if (group.admin.toString() !== currentUserId.toString()) {
      return res
        .status(403)
        .json({ message: "Chỉ admin có thể thêm phó nhóm" });
    }

    // Check if the user is a member
    if (!group.members.some((id) => id.toString() === userId.toString())) {
      return res
        .status(400)
        .json({ message: "Người dùng phải là thành viên của nhóm" });
    }

    // Check if user is already a co-admin
    if (group.coAdmins.some((id) => id.toString() === userId.toString())) {
      return res.status(400).json({ message: "Người dùng đã là phó nhóm" });
    }

    // Check if user is the admin (admin can't be co-admin of their own group)
    if (group.admin.toString() === userId.toString()) {
      return res
        .status(400)
        .json({ message: "Admin không thể trở thành phó nhóm" });
    }

    // Add co-admin
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { coAdmins: userId } },
      { new: true }
    )
      .populate("members", "name avt")
      .populate("admin", "name avt")
      .populate("coAdmins", "name avt");

    res
      .status(200)
      .json({ message: "Đã thêm phó nhóm thành công", group: updatedGroup });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi thêm phó nhóm", error: error.message });
  }
};

// Remove co-admin role from a user
const removeCoAdmin = async (req, res) => {
  const { groupId, userId } = req.body;
  const currentUserId = req.user._id;

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Không tìm thấy nhóm" });
    }

    // Only admin can remove co-admins
    if (group.admin.toString() !== currentUserId.toString()) {
      return res
        .status(403)
        .json({ message: "Chỉ admin có thể hạ cấp phó nhóm" });
    }

    // Check if user is actually a co-admin
    if (!group.coAdmins.some((id) => id.toString() === userId.toString())) {
      return res
        .status(400)
        .json({ message: "Người dùng không phải là phó nhóm" });
    }

    // Remove co-admin
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $pull: { coAdmins: userId } },
      { new: true }
    )
      .populate("members", "name avt")
      .populate("admin", "name avt")
      .populate("coAdmins", "name avt");

    res
      .status(200)
      .json({ message: "Đã hạ cấp phó nhóm thành công", group: updatedGroup });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi hạ cấp phó nhóm", error: error.message });
  }
};

// Get all co-admins of a group
const getGroupCoAdmins = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  try {
    const group = await Group.findById(groupId)
      .populate("coAdmins", "name avt email")
      .select("coAdmins admin");

    if (!group) {
      return res.status(404).json({ message: "Không tìm thấy nhóm" });
    }

    const isMember = await Group.exists({
      _id: groupId,
      members: userId,
    });

    if (!isMember) {
      return res
        .status(403)
        .json({ message: "Bạn không phải là thành viên của nhóm này" });
    }

    res.status(200).json({
      coAdmins: group.coAdmins,
      admin: group.admin,
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy danh sách phó nhóm",
      error: error.message,
    });
  }
};

// Get all groups for a user
const getUserGroups = async (req, res) => {
  const userId = req.user._id;

  try {
    const groups = await Group.find({ members: userId })
      .populate("admin", "name avt")
      .populate("coAdmins", "name avt");

    res.status(200).json(groups);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching user groups", error: error.message });
  }
};

// Delete a group (only admin can do this)
const deleteGroup = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is admin
    if (group.admin.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Only the admin can delete the group" });
    }

    // Delete all messages in the group
    await Message.deleteMany({ groupId });

    // Delete the group
    await Group.findByIdAndDelete(groupId);

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting group", error: error.message });
  }
};

// Check if user is admin or co-admin of a group
const isAdminOrCoAdmin = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isAdmin = group.admin.toString() === userId.toString();
    const isCoAdmin = group.coAdmins.some(
      (id) => id.toString() === userId.toString()
    );

    res.status(200).json({
      isAdmin,
      isCoAdmin,
      hasPermission: isAdmin || isCoAdmin,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error checking permissions", error: error.message });
  }
};

// Update group information
const updateGroup = async (req, res) => {
  const { groupId } = req.params;
  const { name, description } = req.body;
  const userId = req.user._id;

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Không tìm thấy nhóm" });
    }

    // Kiểm tra quyền hạn
    const isAdmin = group.admin.toString() === userId.toString();
    const isCoAdmin = group.coAdmins.some(
      (id) => id.toString() === userId.toString()
    );

    if (!isAdmin && !isCoAdmin) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền cập nhật thông tin nhóm" });
    }

    // Cập nhật các trường thông tin nếu được cung cấp
    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;

    // Xử lý upload avatar nếu có
    if (req.files && req.files.avatar) {
      const uploadResult = await cloudinary.uploader.upload(
        req.files.avatar.tempFilePath,
        {
          folder: "group_avatars",
          width: 150,
          crop: "scale",
        }
      );
      updateData.avatarUrl = uploadResult.secure_url;
    }

    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $set: updateData },
      { new: true }
    )
      .populate("members", "name avt")
      .populate("admin", "name avt")
      .populate("coAdmins", "name avt");

    res.status(200).json({
      message: "Cập nhật thông tin nhóm thành công",
      group: updatedGroup,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Lỗi khi cập nhật thông tin nhóm",
        error: error.message,
      });
  }
};

const updateGroupAvatar = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Không tìm thấy nhóm" });
    }

    // Kiểm tra quyền hạn
    const isAdmin = group.admin.toString() === userId.toString();
    const isCoAdmin = group.coAdmins.some(
      (id) => id.toString() === userId.toString()
    );

    if (!isAdmin && !isCoAdmin) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thay đổi ảnh nhóm" });
    }

    // Kiểm tra có file upload không
    if (!req.files || !req.files.avatar) {
      return res.status(400).json({ message: "Không tìm thấy file ảnh" });
    }

    // Upload ảnh lên Cloudinary
    const uploadResult = await cloudinary.uploader.upload(
      req.files.avatar.tempFilePath,
      {
        folder: "group_avatars",
        width: 150,
        crop: "scale",
      }
    );

    // Cập nhật avatarUrl trong database
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $set: { avatarUrl: uploadResult.secure_url } },
      { new: true }
    )
      .populate("members", "name avt")
      .populate("admin", "name avt")
      .populate("coAdmins", "name avt");

    res.status(200).json({
      message: "Cập nhật ảnh nhóm thành công",
      group: updatedGroup,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi cập nhật ảnh nhóm", error: error.message });
  }
};

module.exports = {
  createGroup,
  addMember,
  removeMember,
  getGroupDetails,
  addCoAdmin,
  removeCoAdmin,
  getGroupCoAdmins,
  getUserGroups,
  deleteGroup,
  isAdminOrCoAdmin,
  updateGroup,
  updateGroupAvatar,
};

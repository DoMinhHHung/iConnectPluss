const Group = require("../Models/groupModel");
const User = require("../Models/userModel");
const Message = require("../Models/messageModels");
const cloudinary = require("../config/cloudinaryConfig");

const createGroup = async (req, res) => {
  const { name, members, description } = req.body;
  const admin = req.user._id;
  let avatarUrl = null;

  try {
    // Xử lý tải lên ảnh nhóm nếu có
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

    const group = new Group({
      name,
      members,
      admin,
      description,
      avatarUrl, // Lưu URL avatar vào model
      coAdmins: [],
    });

    await group.save();

    // Populate user details for response
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
    // Check if user has permission to add members
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
      return res.status(404).json({ message: "Group not found" });
    }

    // Only admin can add co-admins
    if (group.admin.toString() !== currentUserId.toString()) {
      return res
        .status(403)
        .json({ message: "Only the admin can add co-admins" });
    }

    // Check if the user is a member
    if (!group.members.some((id) => id.toString() === userId.toString())) {
      return res
        .status(400)
        .json({ message: "User must be a member of the group" });
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
      .json({ message: "Co-admin added successfully", group: updatedGroup });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error adding co-admin", error: error.message });
  }
};

// Remove co-admin role from a user
const removeCoAdmin = async (req, res) => {
  const { groupId, userId } = req.body;
  const currentUserId = req.user._id;

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Only admin can remove co-admins
    if (group.admin.toString() !== currentUserId.toString()) {
      return res
        .status(403)
        .json({ message: "Only the admin can remove co-admins" });
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
      .json({ message: "Co-admin removed successfully", group: updatedGroup });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error removing co-admin", error: error.message });
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

module.exports = {
  createGroup,
  addMember,
  removeMember,
  getGroupDetails,
  addCoAdmin,
  removeCoAdmin,
  getUserGroups,
  deleteGroup,
  isAdminOrCoAdmin,
};

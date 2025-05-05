import React, { useState, useEffect } from "react";
import axios from "axios";
import "../scss/GroupManagement.scss";

interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
}

interface Group {
  _id: string;
  name: string;
  description: string;
  members: string[];
  admin: string;
  createdAt: string;
}

const GroupManagement: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [newGroup, setNewGroup] = useState({ name: "", description: "" });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchGroups();
    fetchFriends();
  }, []);

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:3005/api/groups/user/groups",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setGroups(response.data);
    } catch (error) {
      console.error("Error fetching groups:", error);
      setError("Failed to load groups. Please try again later.");
    }
  };

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:3005/api/friendship/friends",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setFriends(response.data);
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newGroup.name.trim() === "") {
      setError("Tên nhóm không được để trống");
      return;
    }

    if (selectedMembers.length === 0) {
      setError("Vui lòng chọn ít nhất một thành viên");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:3005/api/groups/create",
        {
          name: newGroup.name,
          description: newGroup.description,
          members: selectedMembers,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccess("Tạo nhóm thành công!");
      setNewGroup({ name: "", description: "" });
      setSelectedMembers([]);
      setIsCreating(false);
      fetchGroups();
    } catch (error) {
      console.error("Error creating group:", error);
      setError("Đã xảy ra lỗi khi tạo nhóm");
    }
  };

  const handleMemberSelect = (userId: string) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa nhóm này không?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:3005/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess("Xóa nhóm thành công!");
      fetchGroups();
    } catch (error) {
      console.error("Error deleting group:", error);
      setError("Đã xảy ra lỗi khi xóa nhóm");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="group-management">
      <div className="group-header">
        <h2>Quản lý nhóm chat</h2>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="btn-create"
        >
          {isCreating ? "Hủy" : "Tạo nhóm mới"}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {isCreating && (
        <div className="create-group-form">
          <h3>Tạo nhóm mới</h3>
          <form onSubmit={handleCreateGroup}>
            <div className="form-group">
              <label>Tên nhóm</label>
              <input
                type="text"
                value={newGroup.name}
                onChange={(e) =>
                  setNewGroup({ ...newGroup, name: e.target.value })
                }
                placeholder="Nhập tên nhóm"
              />
            </div>
            <div className="form-group">
              <label>Mô tả</label>
              <textarea
                value={newGroup.description}
                onChange={(e) =>
                  setNewGroup({ ...newGroup, description: e.target.value })
                }
                placeholder="Nhập mô tả nhóm (tùy chọn)"
              />
            </div>
            <div className="form-group">
              <label>Chọn thành viên</label>
              <div className="member-list">
                {friends.map((friend) => (
                  <div key={friend._id} className="member-item">
                    <input
                      type="checkbox"
                      id={`friend-${friend._id}`}
                      checked={selectedMembers.includes(friend._id)}
                      onChange={() => handleMemberSelect(friend._id)}
                    />
                    <label htmlFor={`friend-${friend._id}`}>
                      {friend.avatar ? (
                        <img
                          src={friend.avatar}
                          alt={friend.username}
                          className="avatar"
                        />
                      ) : (
                        <div className="avatar-placeholder">
                          {friend.username.charAt(0)}
                        </div>
                      )}
                      <span>{friend.username}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-submit">
                Tạo nhóm
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="btn-cancel"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="group-list">
        <h3>Danh sách nhóm</h3>
        {groups.length === 0 ? (
          <p className="no-groups">Bạn chưa tham gia nhóm nào</p>
        ) : (
          <div className="groups">
            {groups.map((group) => (
              <div key={group._id} className="group-card">
                <div className="group-info">
                  <h4>{group.name}</h4>
                  <p className="description">
                    {group.description || "Không có mô tả"}
                  </p>
                  <p className="date">
                    Ngày tạo: {formatDate(group.createdAt)}
                  </p>
                </div>
                <div className="group-actions">
                  <button
                    onClick={() =>
                      setSelectedGroup(
                        selectedGroup?._id === group._id ? null : group
                      )
                    }
                    className="btn-details"
                  >
                    {selectedGroup?._id === group._id
                      ? "Ẩn chi tiết"
                      : "Xem chi tiết"}
                  </button>
                  {/* Chỉ admin mới có thể xóa nhóm */}
                  {group.admin ===
                    JSON.parse(localStorage.getItem("user") || "{}")._id && (
                    <button
                      onClick={() => handleDeleteGroup(group._id)}
                      className="btn-delete"
                    >
                      Xóa nhóm
                    </button>
                  )}
                </div>
                {selectedGroup?._id === group._id && (
                  <div className="group-details">
                    <h5>Thành viên ({group.members.length})</h5>
                    <div className="member-grid">
                      {/* Hiển thị danh sách thành viên nhóm */}
                      {/* Trong thực tế cần fetch thông tin chi tiết về thành viên */}
                      <p>ID Admin: {group.admin}</p>
                      <p>ID thành viên: {group.members.join(", ")}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupManagement;

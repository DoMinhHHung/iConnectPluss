import React, { useState, useEffect } from "react";
import { FiX, FiUserCheck, FiUserX } from "react-icons/fi";
import "./CoAdminDialog.scss";
import axios from "axios";
import { Group, GroupMember } from "./GroupChatTypes";

interface CoAdminDialogProps {
  isOpen: boolean;
  groupId: string;
  group: Group;
  userId: string;
  onClose: () => void;
  onCoAdminUpdated: () => void;
  socket: any;
}

const CoAdminDialog: React.FC<CoAdminDialogProps> = ({
  isOpen,
  groupId,
  group,
  userId,
  onClose,
  onCoAdminUpdated,
  socket,
}) => {
  const [selectedCoAdminAction, setSelectedCoAdminAction] = useState<
    "add" | "remove"
  >("add");
  const [coAdminSearchTerm, setCoAdminSearchTerm] = useState("");
  const [coAdminSearchResults, setCoAdminSearchResults] = useState<any[]>([]);

  // Animation control
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsShowing(true);
    } else {
      setTimeout(() => {
        setIsShowing(false);
      }, 300);
    }
  }, [isOpen]);

  if (!isOpen && !isShowing) {
    return null;
  }

  const handleSearch = () => {
    if (coAdminSearchTerm.trim()) {
      const results = group.members.filter((member) => {
        // Chỉ lấy các thành viên là object để có thể truy cập thuộc tính name
        if (typeof member === "object" && member !== null) {
          return member.name
            .toLowerCase()
            .includes(coAdminSearchTerm.toLowerCase());
        }
        return false;
      });

      // Lọc ra những người đã là admin hoặc phó nhóm
      const filteredResults = results.filter((member) => {
        const memberId = typeof member === "object" ? member._id : member;
        const isAdmin =
          typeof group.admin === "object"
            ? group.admin._id === memberId
            : group.admin === memberId;
        const isCoAdmin =
          Array.isArray(group.coAdmins) && group.coAdmins.includes(memberId);

        return !isAdmin && !isCoAdmin;
      });

      setCoAdminSearchResults(filteredResults);
    } else {
      setCoAdminSearchResults([]);
    }
  };

  const handleAddCoAdmin = async (memberId: string, memberName: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:3005/api/groups/add-co-admin`,
        {
          groupId,
          userId: memberId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Thông báo qua socket
      if (socket) {
        socket.emit("addCoAdmin", {
          groupId,
          userId: memberId,
          addedBy: userId,
        });
      }

      // Thông báo thành công và cập nhật thông tin nhóm
      alert(`Đã thăng cấp ${memberName} làm phó nhóm`);
      onCoAdminUpdated();
    } catch (error) {
      console.error("Error adding co-admin:", error);
      alert("Không thể thăng cấp thành viên. Vui lòng thử lại sau.");
    }
  };

  const handleRemoveCoAdmin = async (memberId: string, memberName: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:3005/api/groups/remove-co-admin`,
        {
          groupId,
          userId: memberId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Thông báo qua socket
      if (socket) {
        socket.emit("removeCoAdmin", {
          groupId,
          userId: memberId,
          removedBy: userId,
        });
      }

      // Thông báo thành công và cập nhật thông tin nhóm
      alert(`Đã hạ cấp ${memberName} xuống thành viên thường`);
      onCoAdminUpdated();
    } catch (error) {
      console.error("Error removing co-admin:", error);
      alert("Không thể hạ cấp thành viên. Vui lòng thử lại sau.");
    }
  };

  const renderCurrentCoAdmins = () => {
    // Kiểm tra nếu không có thành viên nào
    if (!group || !group.members || group.members.length === 0) {
      return (
        <div className="no-results">Không có thành viên nào trong nhóm</div>
      );
    }

    // Lọc ra các thành viên là phó nhóm
    const coAdmins = group.members.filter((member) => {
      const memberId = typeof member === "object" ? member._id : member;
      return Array.isArray(group.coAdmins) && group.coAdmins.includes(memberId);
    });

    if (coAdmins.length === 0) {
      return <div className="no-results">Nhóm hiện không có phó nhóm</div>;
    }

    return coAdmins.map((member) => {
      const memberId = typeof member === "object" ? member._id : member;
      const memberName = typeof member === "object" ? member.name : "Unknown";
      const memberAvt = typeof member === "object" ? member.avt : null;

      return (
        <div key={memberId} className="member-item">
          <div className="member-avatar">
            {memberAvt ? (
              <img src={memberAvt} alt={memberName} />
            ) : (
              <div className="avatar-placeholder">
                {memberName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="member-info">
            <div className="member-name">{memberName}</div>
          </div>
          <button
            className="demote-button"
            onClick={() => handleRemoveCoAdmin(memberId, memberName)}
          >
            <FiUserX /> Hủy quyền
          </button>
        </div>
      );
    });
  };

  return (
    <div
      className={`co-admin-dialog-overlay ${isShowing ? "show" : ""}`}
      onClick={onClose}
    >
      <div
        className={`co-admin-dialog-content ${isShowing ? "show" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="co-admin-dialog-header">
          <h3>Quản lý phó nhóm</h3>
          <button className="close-button" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="co-admin-actions">
          <div className="action-tabs">
            <button
              className={`tab-button ${
                selectedCoAdminAction === "add" ? "active" : ""
              }`}
              onClick={() => setSelectedCoAdminAction("add")}
            >
              Thêm phó nhóm
            </button>
            <button
              className={`tab-button ${
                selectedCoAdminAction === "remove" ? "active" : ""
              }`}
              onClick={() => setSelectedCoAdminAction("remove")}
            >
              Hủy quyền phó nhóm
            </button>
          </div>

          {selectedCoAdminAction === "add" ? (
            <div className="add-coadmin-section">
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Tìm kiếm thành viên..."
                  value={coAdminSearchTerm}
                  onChange={(e) => setCoAdminSearchTerm(e.target.value)}
                  onKeyUp={(e) => e.key === "Enter" && handleSearch()}
                />
                <button className="search-button" onClick={handleSearch}>
                  Tìm kiếm
                </button>
              </div>

              <div className="search-results">
                {coAdminSearchResults.map((member) => {
                  const memberId =
                    typeof member === "object" ? member._id : member;
                  const memberName =
                    typeof member === "object" ? member.name : "Unknown";
                  const memberAvt =
                    typeof member === "object" ? member.avt : null;

                  return (
                    <div key={memberId} className="member-item">
                      <div className="member-avatar">
                        {memberAvt ? (
                          <img src={memberAvt} alt={memberName} />
                        ) : (
                          <div className="avatar-placeholder">
                            {memberName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="member-info">
                        <div className="member-name">{memberName}</div>
                      </div>
                      <button
                        className="promote-button"
                        onClick={() => handleAddCoAdmin(memberId, memberName)}
                      >
                        <FiUserCheck /> Thăng cấp
                      </button>
                    </div>
                  );
                })}
                {coAdminSearchResults.length === 0 && coAdminSearchTerm && (
                  <div className="no-results">
                    Không tìm thấy thành viên phù hợp
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="remove-coadmin-section">
              <h4>Danh sách phó nhóm hiện tại</h4>
              <div className="co-admins-list">{renderCurrentCoAdmins()}</div>
            </div>
          )}

          <div className="button-group">
            <button className="cancel-button" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoAdminDialog;

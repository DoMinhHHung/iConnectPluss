import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../redux/hooks";
import "../scss/GroupList.scss";
import { FiPlus, FiUsers } from "react-icons/fi";
import CreateGroupDialog from "./CreateGroupDialog";

interface Group {
  _id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  members: {
    _id: string;
    name: string;
    avt?: string;
  }[];
  admin: string;
  lastMessage?: {
    content: string;
    sender: string;
    createdAt: string;
    type?: string;
  };
}

const GroupList: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        const response = await axios.get(
          "http://localhost:3005/api/groups/user/groups",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setGroups(response.data);
      } catch (err) {
        console.error("Error fetching groups:", err);
        setError("Failed to load groups. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [user]);

  const handleGroupClick = (groupId: string) => {
    navigate(`/group/${groupId}`);
  };

  const handleCreateGroup = () => {
    setShowCreateDialog(true);
  };

  // Format last activity time
  const formatLastActivity = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return diffDays === 1 ? "Yesterday" : `${diffDays} days ago`;
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours > 0) {
      return `${diffHours}h ago`;
    }

    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins > 0) {
      return `${diffMins}m ago`;
    }

    return "Just now";
  };

  // Get last message preview text
  const getLastMessagePreview = (group: Group) => {
    if (!group.lastMessage) {
      return "No messages yet";
    }

    const senderName =
      group.lastMessage.sender === user?._id
        ? "You"
        : group.members.find((m) => m._id === group.lastMessage?.sender)
            ?.name || "Unknown";

    let content = group.lastMessage.content;

    // Handle different message types
    if (group.lastMessage.type) {
      switch (group.lastMessage.type) {
        case "image":
          content = "📷 Image";
          break;
        case "video":
          content = "🎥 Video";
          break;
        case "audio":
          content = "🎵 Audio";
          break;
        case "file":
          content = "📄 File";
          break;
      }
    }

    return `${senderName}: ${content}`;
  };

  if (loading) {
    return <div className="group-list-loading">Loading groups...</div>;
  }

  return (
    <div className="group-list-container">
      <div className="group-list-header">
        <h2>Groups</h2>
        <button className="create-group-button" onClick={handleCreateGroup}>
          <FiPlus /> Create
        </button>
      </div>

      {error && <div className="group-list-error">{error}</div>}

      {groups.length === 0 ? (
        <div className="no-groups">
          <FiUsers className="no-groups-icon" />
          <p>You're not in any groups yet.</p>
          <button className="create-first-group" onClick={handleCreateGroup}>
            Create your first group
          </button>
        </div>
      ) : (
        <div className="groups">
          {groups.map((group) => (
            <div
              key={group._id}
              className="group-item"
              onClick={() => handleGroupClick(group._id)}
            >
              <div className="group-avatar">
                {group.avatarUrl ? (
                  <img src={group.avatarUrl} alt={group.name} />
                ) : (
                  <div className="avatar-placeholder">
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="group-info">
                <h3 className="group-name">{group.name}</h3>
                <p className="last-message">{getLastMessagePreview(group)}</p>
              </div>
              {group.lastMessage && (
                <div className="last-activity">
                  {formatLastActivity(group.lastMessage.createdAt)}
                </div>
              )}
              <div className="member-count">
                <FiUsers /> {group.members.length}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateDialog && (
        <CreateGroupDialog onClose={() => setShowCreateDialog(false)} />
      )}
    </div>
  );
};

export default GroupList;

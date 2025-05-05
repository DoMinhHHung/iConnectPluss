import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../redux/hooks";
import "../scss/CreateGroupDialog.scss";
import {
  FiX,
  FiPlus,
  FiSearch,
  FiCheck,
  FiTrash2,
  FiImage,
} from "react-icons/fi";

interface CreateGroupDialogProps {
  onClose: () => void;
}

interface SelectedUser {
  _id: string;
  name: string;
  avt?: string;
}

const CreateGroupDialog: React.FC<CreateGroupDialogProps> = ({ onClose }) => {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SelectedUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Group details, Step 2: Add members

  // Handle search for users
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setError(null);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:3005/api/search?q=${searchQuery}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Filter out the current user and already selected users
      const filteredResults = response.data.filter(
        (result: SelectedUser) =>
          result._id !== user?._id &&
          !selectedUsers.some((selected) => selected._id === result._id)
      );

      setSearchResults(filteredResults);
    } catch (err) {
      console.error("Error searching users:", err);
      setError("Error searching for users. Please try again.");
    }
  };

  // Handle selecting a user
  const handleSelectUser = (selectedUser: SelectedUser) => {
    setSelectedUsers([...selectedUsers, selectedUser]);
    // Remove the selected user from search results
    setSearchResults(
      searchResults.filter((user) => user._id !== selectedUser._id)
    );
    setSearchQuery(""); // Clear search query
  };

  // Handle removing a selected user
  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((user) => user._id !== userId));
  };

  // Handle avatar upload
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupAvatar(file);

      // Create a preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setGroupAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Move to next step
  const handleNextStep = () => {
    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }
    setError(null);
    setStep(2);
  };

  // Go back to previous step
  const handleBackStep = () => {
    setStep(1);
  };

  // Create the group
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }

    if (selectedUsers.length === 0) {
      setError("Please add at least one member to the group");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");

      // First upload avatar if exists
      let avatarUrl = null;
      if (groupAvatar) {
        const formData = new FormData();
        formData.append("file", groupAvatar);
        formData.append("type", "image");

        const uploadResponse = await axios.post(
          "http://localhost:3005/api/chat/upload",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        avatarUrl = uploadResponse.data.fileUrl;
      }

      // Create the group
      const response = await axios.post(
        "http://localhost:3005/api/groups/create",
        {
          name: groupName,
          description: groupDescription,
          avatarUrl,
          members: selectedUsers.map((user) => user._id),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Group created successfully:", response.data);

      // Navigate to the newly created group
      if (response.data && response.data.group && response.data.group._id) {
        navigate(`/group/${response.data.group._id}`);
      } else {
        console.error("Group ID not found in response:", response.data);
        setError(
          "Group created but ID not returned. Please check your groups list."
        );
      }
      onClose();
    } catch (err: any) {
      console.error("Error creating group:", err);
      setError(
        err.response?.data?.message || "Error creating group. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="create-group-dialog-overlay">
      <div className="create-group-dialog">
        <div className="dialog-header">
          <h2>{step === 1 ? "Create a New Group" : "Add Group Members"}</h2>
          <button className="close-button" onClick={onClose}>
            <FiX />
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {step === 1 ? (
          <div className="group-details">
            <div className="avatar-upload">
              <div
                className="avatar-preview"
                onClick={() =>
                  document.getElementById("group-avatar-input")?.click()
                }
              >
                {groupAvatarPreview ? (
                  <img src={groupAvatarPreview} alt="Group avatar preview" />
                ) : (
                  <div className="avatar-placeholder">
                    <FiImage />
                    <span>Add Image</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                id="group-avatar-input"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: "none" }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="group-name">Group Name*</label>
              <input
                type="text"
                id="group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="group-description">Description (Optional)</label>
              <textarea
                id="group-description"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Enter group description"
                rows={3}
              />
            </div>

            <div className="dialog-actions">
              <button className="cancel-button" onClick={onClose}>
                Cancel
              </button>
              <button className="next-button" onClick={handleNextStep}>
                Next
              </button>
            </div>
          </div>
        ) : (
          <div className="add-members">
            <div className="search-container">
              <div className="search-input-container">
                <input
                  type="text"
                  placeholder="Search for friends"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <button className="search-button" onClick={handleSearch}>
                  <FiSearch />
                </button>
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                <h3>Search Results</h3>
                <ul>
                  {searchResults.map((user) => (
                    <li key={user._id} className="search-result-item">
                      <div className="user-avatar">
                        {user.avt ? (
                          <img src={user.avt} alt={user.name} />
                        ) : (
                          <div className="avatar-placeholder">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="user-name">{user.name}</span>
                      <button
                        className="add-user-button"
                        onClick={() => handleSelectUser(user)}
                      >
                        <FiPlus />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="selected-users">
              <h3>
                Selected Members{" "}
                {selectedUsers.length > 0 && `(${selectedUsers.length})`}
              </h3>
              {selectedUsers.length === 0 ? (
                <p className="no-selected">No members selected yet</p>
              ) : (
                <ul>
                  {selectedUsers.map((user) => (
                    <li key={user._id} className="selected-user-item">
                      <div className="user-avatar">
                        {user.avt ? (
                          <img src={user.avt} alt={user.name} />
                        ) : (
                          <div className="avatar-placeholder">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="user-name">{user.name}</span>
                      <button
                        className="remove-user-button"
                        onClick={() => handleRemoveUser(user._id)}
                      >
                        <FiTrash2 />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="dialog-actions">
              <button className="back-button" onClick={handleBackStep}>
                Back
              </button>
              <button
                className="create-button"
                disabled={isLoading || selectedUsers.length === 0}
                onClick={handleCreateGroup}
              >
                {isLoading ? "Creating..." : "Create Group"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateGroupDialog;

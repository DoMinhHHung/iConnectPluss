import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import axios from "axios";
import "../scss/GroupChatInterface.scss";
import { useParams } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../redux/hooks";
import {
  incrementUnreadGroupMessages,
  resetUnreadGroupMessages,
} from "../redux/slices/messageSlice";

import {
  FiVideo,
  FiFileText,
  FiX,
  FiPaperclip,
  FiImage,
  FiMusic,
  FiSend,
  FiMoreVertical,
  FiSearch,
  FiTrash2,
  FiArchive,
  FiUserPlus,
  FiUserX,
  FiUserCheck,
  FiUsers,
  FiSettings,
} from "./IconComponents";

import {
  Message,
  MediaFile,
  commonEmojis,
  formatTime,
  renderMessageStatus,
  renderReactions,
  renderMessageContent,
  FileInfo,
  MediaPreview,
  ReplyBar,
  isMessageFromCurrentUser,
  showConfirmDialog,
} from "./ChatInterfaceComponent";

import {
  GroupMessage,
  Role,
  GroupMember,
  Group,
  MessageSender,
} from "./GroupChatTypes";

const GroupChatInterface: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAppSelector((state) => state.auth);
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [apiStatus, setApiStatus] = useState<{
    groupInfo: boolean;
    messages: boolean;
  }>({ groupInfo: false, messages: false });
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(
    new Map()
  );
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const [selectedMessage, setSelectedMessage] = useState<GroupMessage | null>(
    null
  );
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<GroupMessage | null>(
    null
  );
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaPreview, setMediaPreview] = useState<GroupMessage | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);

  // UI state variables
  const [showGroupOptions, setShowGroupOptions] = useState(false);
  const [showMembersList, setShowMembersList] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showRemoveMemberDialog, setShowRemoveMemberDialog] = useState(false);
  const [showManageCoAdminDialog, setShowManageCoAdminDialog] = useState(false);
  const [newMemberSearch, setNewMemberSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMessageResults, setSearchMessageResults] = useState<
    GroupMessage[]
  >([]);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedMediaType, setSelectedMediaType] = useState<
    "all" | "image" | "video" | "audio" | "file"
  >("all");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLeaveGroupDialog, setShowLeaveGroupDialog] = useState(false);
  const [showDeleteOptionsDialog, setShowDeleteOptionsDialog] = useState(false);
  const [selectedMessageForDelete, setSelectedMessageForDelete] =
    useState<GroupMessage | null>(null);

  // Các biến state cho chức năng chỉnh sửa thông tin nhóm
  const [newGroupName, setNewGroupName] = useState<string>("");
  const [showEditNameDialog, setShowEditNameDialog] = useState(false);
  const [showEditAvatarDialog, setShowEditAvatarDialog] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const dispatch = useAppDispatch();

  useEffect(() => {
    if (group && user) {
      // Chuyển đổi string ID sang string để so sánh chính xác
      const adminId =
        typeof group.admin === "object" && group.admin !== null
          ? group.admin._id
          : group.admin;

      const userId = user._id;

      console.log("Admin check:", {
        adminId,
        userId,
        isAdmin: adminId === userId,
      });

      if (adminId === userId) {
        setUserRole("admin");
      } else if (
        Array.isArray(group.coAdmins) &&
        group.coAdmins.includes(userId)
      ) {
        setUserRole("coAdmin");
      } else {
        setUserRole("member");
      }

      console.log(
        "User role set to:",
        adminId === userId
          ? "admin"
          : Array.isArray(group.coAdmins) && group.coAdmins.includes(userId)
          ? "coAdmin"
          : "member"
      );
    }
  }, [group, user]);

  useEffect(() => {
    // Reset counter tin nhắn nhóm khi vào trang chat nhóm
    dispatch(resetUnreadGroupMessages());
  }, [dispatch]);

  const fetchGroupInfo = async () => {
    try {
      if (!groupId || groupId === "undefined" || !user) {
        setError("Mã nhóm không hợp lệ. Vui lòng kiểm tra lại URL.");
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      setLoading(true);
      setError(null);

      const groupResponse = await axios.get(
        `http://localhost:3005/api/groups/${groupId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (groupResponse.data) {
        setGroup(groupResponse.data);
        setApiStatus((prev) => ({ ...prev, groupInfo: true }));

        const isMember = groupResponse.data.members.some(
          (member: any) => member._id === user._id
        );

        if (!isMember) {
          setError("Bạn không phải là thành viên của nhóm này");
          setLoading(false);
          return;
        }
      }

      const messagesResponse = await axios.get(
        `http://localhost:3005/api/groups/${groupId}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (messagesResponse.data) {
        setMessages(messagesResponse.data);
        setApiStatus((prev) => ({ ...prev, messages: true }));
      }

      setLoading(false);
    } catch (err: any) {
      console.error("Error fetching group data:", err);
      setError(
        err.response?.data?.message ||
          "Lỗi khi tải dữ liệu nhóm. Vui lòng thử lại sau."
      );
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupInfo();
  }, [groupId, user]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !user || !groupId) return;

    const newSocket = io("http://localhost:3005", {
      auth: {
        token,
      },
    });

    setSocket(newSocket);

    newSocket.emit("joinGroupRoom", groupId);

    newSocket.on("onlineUsers", (userIds: string[]) => {
      setOnlineUsers(new Set(userIds));
    });

    newSocket.on("userOnline", (userId: string) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.add(userId);
        return newSet;
      });
    });

    newSocket.on("userOffline", (userId: string) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });

      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    });

    newSocket.on("groupMessage", (data: any) => {
      console.log("Nhận tin nhắn nhóm:", data);

      const newMessage: GroupMessage = {
        _id: data._id,
        sender: data.sender,
        groupId: data.groupId,
        content: data.content,
        createdAt: data.createdAt,
        chatType: "group",
        receiver: "",
        ...(data.replyTo
          ? {
              replyTo: {
                _id: data.replyTo._id,
                content: data.replyTo.content,
                sender: data.replyTo.sender,
              },
            }
          : {}),
        ...(data.type ? { type: data.type } : {}),
        ...(data.fileUrl ? { fileUrl: data.fileUrl } : {}),
        ...(data.fileName ? { fileName: data.fileName } : {}),
        ...(data.fileSize ? { fileSize: data.fileSize } : {}),
        ...(data.fileThumbnail ? { fileThumbnail: data.fileThumbnail } : {}),
        ...(data.fileId ? { fileId: data.fileId } : {}),
        ...(data.expiryDate ? { expiryDate: data.expiryDate } : {}),
      };

      // Kiểm tra tin nhắn đến từ user hiện tại không
      const isFromCurrentUser =
        typeof data.sender === "string"
          ? data.sender === user?._id
          : data.sender._id === user?._id;

      // Kiểm tra có đang trong nhóm chat này không
      const isCurrentGroup = data.groupId === groupId;

      if (isFromCurrentUser) {
        // Chỉ thêm vào danh sách tin nhắn nếu từ user hiện tại
        setMessages((prev) => [...prev, newMessage]);
      } else {
        // Thêm tin nhắn vào danh sách nếu đang trong nhóm chat này
        if (isCurrentGroup) {
          setMessages((prev) => [...prev, newMessage]);
        } else {
          // Nếu không phải nhóm chat hiện tại, tăng số tin nhắn nhóm chưa đọc
          console.log("Tăng số tin nhắn nhóm chưa đọc");
          dispatch(incrementUnreadGroupMessages());
        }
      }

      // Xử lý tempId nếu có
      if (data._tempId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === data._tempId
              ? { ...newMessage, _tempId: data._tempId }
              : msg
          )
        );
      }
    });

    newSocket.on(
      "userTypingInGroup",
      (data: { userId: string; groupId: string; userName: string }) => {
        if (data.groupId === groupId && data.userId !== user._id) {
          setTypingUsers((prev) => {
            const newMap = new Map(prev);
            newMap.set(data.userId, data.userName);
            return newMap;
          });
        }
      }
    );

    newSocket.on(
      "userStoppedTypingInGroup",
      (data: { userId: string; groupId: string }) => {
        if (data.groupId === groupId) {
          setTypingUsers((prev) => {
            const newMap = new Map(prev);
            newMap.delete(data.userId);
            return newMap;
          });
        }
      }
    );

    newSocket.on(
      "groupMessageReaction",
      (data: {
        messageId: string;
        userId: string;
        emoji: string;
        groupId: string;
      }) => {
        if (data.groupId === groupId) {
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg._id === data.messageId
                ? {
                    ...msg,
                    reactions: {
                      ...(msg.reactions || {}),
                      [data.userId]: data.emoji,
                    },
                  }
                : msg
            )
          );
        }
      }
    );

    newSocket.on(
      "groupMessageDeleted",
      (data: { messageId: string; deletedBy: string; groupId: string }) => {
        if (data.groupId === groupId) {
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg._id === data.messageId
                ? {
                    ...msg,
                    content: "This message has been deleted",
                    isUnsent: true,
                  }
                : msg
            )
          );
        }
      }
    );

    newSocket.on(
      "newGroupMember",
      (data: { groupId: string; memberId: string; addedBy: string }) => {
        if (data.groupId === groupId) {
          fetchGroupInfo();
        }
      }
    );

    newSocket.on(
      "memberLeftGroup",
      (data: { groupId: string; memberId: string; removedBy: string }) => {
        if (data.groupId === groupId) {
          fetchGroupInfo();

          if (data.memberId === user._id) {
            setError("You have been removed from this group");
          }
        }
      }
    );

    newSocket.on(
      "groupDissolved",
      (data: { groupId: string; dissolvedBy: string }) => {
        if (data.groupId === groupId) {
          setError("This group has been dissolved by the admin");
        }
      }
    );

    newSocket.on(
      "newCoAdmin",
      (data: { groupId: string; userId: string; addedBy: string }) => {
        if (data.groupId === groupId) {
          fetchGroupInfo();

          if (data.userId === user._id) {
            setUserRole("coAdmin");
          }
        }
      }
    );

    newSocket.on(
      "coAdminRemoved",
      (data: { groupId: string; userId: string; removedBy: string }) => {
        if (data.groupId === groupId) {
          fetchGroupInfo();

          if (data.userId === user._id) {
            setUserRole("member");
          }
        }
      }
    );

    return () => {
      newSocket.disconnect();
    };
  }, [groupId, user, dispatch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (socket && user && groupId) {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      socket.emit("typingInGroup", {
        senderId: user._id,
        groupId: groupId,
        senderName: user.name,
      });

      const timeout = setTimeout(() => {
        if (socket) {
          socket.emit("stopTypingInGroup", {
            senderId: user._id,
            groupId: groupId,
          });
        }
      }, 2000);

      setTypingTimeout(timeout);
    }
  };

  const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !user || !groupId) return;

    if (socket) {
      socket.emit("stopTypingInGroup", {
        senderId: user._id,
        groupId: groupId,
      });
    }

    const tempId = Date.now().toString();

    const tempMessage: GroupMessage = {
      _id: tempId,
      sender: user._id,
      receiver: "",
      groupId: groupId,
      content: newMessage,
      createdAt: new Date().toISOString(),
      chatType: "group",
      ...(replyToMessage
        ? {
            replyTo: {
              _id: replyToMessage._id,
              content: replyToMessage.content,
              sender: replyToMessage.sender,
            },
          }
        : {}),
    };

    setMessages((prev) => [...prev, tempMessage]);

    socket.emit("sendGroupMessage", {
      senderId: user._id,
      groupId: groupId,
      content: newMessage,
      tempId,
      chatType: "group",
      ...(replyToMessage ? { replyToId: replyToMessage._id } : {}),
    });

    setNewMessage("");
    setReplyToMessage(null);
    setIsReplying(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket || !user || !groupId) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      let fileType: "image" | "video" | "audio" | "file" = "file";
      if (file.type.startsWith("image/")) fileType = "image";
      else if (file.type.startsWith("video/")) fileType = "video";
      else if (file.type.startsWith("audio/")) fileType = "audio";

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", fileType);

      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:3005/api/chat/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percentCompleted);
            }
          },
        }
      );

      const { fileUrl, fileName, fileThumbnail, fileId, expiryDate } =
        response.data;

      const tempId = Date.now().toString();
      const tempMessage: GroupMessage = {
        _id: tempId,
        sender: user._id,
        receiver: "",
        groupId: groupId,
        content: fileName || file.name,
        createdAt: new Date().toISOString(),
        chatType: "group",
        type: fileType,
        fileUrl,
        fileName: fileName || file.name,
        fileSize: file.size,
        fileThumbnail,
        fileId,
        expiryDate,
        ...(replyToMessage
          ? {
              replyTo: {
                _id: replyToMessage._id,
                content: replyToMessage.content,
                sender: replyToMessage.sender,
              },
            }
          : {}),
      };

      setMessages((prev) => [...prev, tempMessage]);

      socket.emit("sendGroupMessage", {
        senderId: user._id,
        groupId: groupId,
        content: fileName || file.name,
        tempId,
        type: fileType,
        fileUrl,
        fileName: fileName || file.name,
        fileSize: file.size,
        fileThumbnail,
        fileId,
        expiryDate,
        chatType: "group",
        ...(replyToMessage ? { replyToId: replyToMessage._id } : {}),
      });

      setReplyToMessage(null);
      setIsReplying(false);
      e.target.value = "";
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const renderMessages = () => {
    if (messages.length === 0) {
      return (
        <div className="no-messages">
          <p>No messages yet. Start the conversation!</p>
        </div>
      );
    }

    return messages.map((message) => {
      let sender: MessageSender = { _id: "", name: "Unknown User" };

      if (typeof message.sender === "object" && message.sender !== null) {
        sender = {
          _id: message.sender._id,
          name: message.sender.name || "Unknown User",
          avt: message.sender.avt,
        };
      } else if (typeof message.sender === "string" && group) {
        const memberInfo = group.members.find((m) => m._id === message.sender);
        if (memberInfo) {
          sender = {
            _id: memberInfo._id,
            name: memberInfo.name,
            avt: memberInfo.avt,
          };
        } else {
          sender = { _id: message.sender as string, name: "Unknown User" };
        }
      }

      const isOwnMessage = sender._id === user?._id;
      const isMessageUnsent = message.isUnsent || message.unsent;

      return (
        <div
          key={message._id}
          className={`message ${isOwnMessage ? "sent" : "received"} ${
            isMessageUnsent ? "unsent" : ""
          }`}
          onContextMenu={(e) => {
            e.preventDefault();
            handleLongPress(message);
          }}
        >
          {!isOwnMessage && !isMessageUnsent && (
            <div className="sender-name">{sender.name}</div>
          )}

          {!isOwnMessage && (
            <div className="sender-avatar">
              {sender && sender.avt ? (
                <img src={sender.avt} alt={sender.name} />
              ) : (
                <div className="avatar-placeholder">
                  {sender.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}

          {message.replyTo && (
            <div className="reply-content">
              <div className="reply-indicator"></div>
              <div className="reply-text">
                <span className="reply-sender">
                  {message.replyTo.sender === user?._id
                    ? "You"
                    : group?.members.find((m) => {
                        if (typeof message.replyTo?.sender === "string") {
                          return m._id === message.replyTo.sender;
                        } else if (
                          message.replyTo?.sender &&
                          typeof message.replyTo.sender === "object"
                        ) {
                          return m._id === message.replyTo.sender._id;
                        }
                        return false;
                      })?.name || "Unknown"}
                </span>
                <p>{message.replyTo.content}</p>
              </div>
            </div>
          )}

          <div className="message-content">
            {!isMessageUnsent ? (
              renderMessageContent(
                message,
                openMediaPreview,
                handleDownloadFile
              )
            ) : (
              <span className="unsent-message">Message has been deleted</span>
            )}

            {!isMessageUnsent && (
              <div className="message-hover-actions">
                <button
                  className="hover-action-button reply-button"
                  onClick={() => handleReply(message)}
                  title="Reply"
                >
                  ↩️
                </button>
                <button
                  className="hover-action-button reaction-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEmojiPicker(message);
                  }}
                  title="Add reaction"
                >
                  😀
                </button>

                {["image", "video", "audio", "file"].includes(
                  message.type || ""
                ) && (
                  <button
                    className="hover-action-button download-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadFile(message);
                    }}
                    title="Download"
                  >
                    💾
                  </button>
                )}

                {(userRole === "admin" ||
                  userRole === "coAdmin" ||
                  isOwnMessage) && (
                  <button
                    className="hover-action-button delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMessage(message);
                    }}
                    title="Delete message"
                  >
                    🗑️
                  </button>
                )}
              </div>
            )}
          </div>

          {renderReactions(message)}

          <div className="message-info">
            <span className="message-time">
              {formatTime(message.createdAt)}
            </span>
          </div>

          {selectedMessage?._id === message._id &&
            !showEmojiPicker &&
            !isMessageUnsent && (
              <div className="message-actions">
                <button
                  className="action-button"
                  onClick={() => setShowEmojiPicker(true)}
                >
                  😀 React
                </button>
                <button
                  className="action-button"
                  onClick={() => handleReply(message)}
                >
                  ↩️ Reply
                </button>

                {["image", "video", "audio", "file"].includes(
                  message.type || ""
                ) && (
                  <button
                    className="action-button"
                    onClick={() => handleDownloadFile(message)}
                  >
                    💾 Download
                  </button>
                )}

                {(userRole === "admin" ||
                  userRole === "coAdmin" ||
                  isOwnMessage) && (
                  <button
                    className="action-button"
                    onClick={() => handleDeleteMessage(message)}
                  >
                    🗑️ Delete message
                  </button>
                )}

                <button
                  className="action-button close"
                  onClick={() => setSelectedMessage(null)}
                >
                  ✖️ Close
                </button>
              </div>
            )}

          {selectedMessage?._id === message._id &&
            showEmojiPicker &&
            !isMessageUnsent && (
              <div className="emoji-picker">
                {commonEmojis.map((item) => (
                  <button
                    key={item.emoji}
                    className="emoji-button"
                    onClick={() => handleReaction(item.emoji)}
                    title={item.label}
                  >
                    {item.emoji}
                  </button>
                ))}
                <button
                  className="emoji-button close"
                  onClick={() => {
                    setShowEmojiPicker(false);
                    setSelectedMessage(null);
                  }}
                >
                  ✖️
                </button>
              </div>
            )}
        </div>
      );
    });
  };

  // Handle long press on message
  const handleLongPress = (message: GroupMessage) => {
    if (selectedMessage && selectedMessage._id === message._id) {
      setSelectedMessage(null);
      setShowEmojiPicker(false);
    } else {
      setSelectedMessage(message);
      setShowEmojiPicker(false);
    }
  };

  // Handle reply to message - Cải thiện chức năng trả lời tin nhắn
  const handleReply = (message: GroupMessage) => {
    console.log("Reply to message:", message);
    setReplyToMessage(message);
    setIsReplying(true);
    setSelectedMessage(null); // Đóng menu tương tác nếu đang mở
    // Focus input
    const input = document.querySelector(
      ".message-form input"
    ) as HTMLInputElement;
    if (input) input.focus();
  };

  // Cancel reply
  const cancelReply = () => {
    setReplyToMessage(null);
    setIsReplying(false);
  };

  // Open emoji picker
  const openEmojiPicker = (message: GroupMessage) => {
    setSelectedMessage(message);
    setShowEmojiPicker(true);
  };

  // Handle reaction
  const handleReaction = (emoji: string) => {
    if (!selectedMessage || !socket || !user || !groupId) return;

    socket.emit("addGroupReaction", {
      messageId: selectedMessage._id,
      userId: user._id,
      emoji: emoji,
      groupId: groupId,
    });

    // Cập nhật state ngay lập tức để hiển thị reaction
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg._id === selectedMessage._id
          ? {
              ...msg,
              reactions: {
                ...(msg.reactions || {}),
                [user._id]: emoji,
              },
            }
          : msg
      )
    );

    // Close menu
    setSelectedMessage(null);
    setShowEmojiPicker(false);
  };

  // Handle download file
  const handleDownloadFile = (message: GroupMessage) => {
    if (message.fileUrl) {
      window.open(message.fileUrl, "_blank");
    }
  };

  // Toggle attachment menu
  const toggleAttachMenu = () => {
    setShowAttachMenu((prev) => !prev);
  };

  // Handle file type selection
  const handleFileTypeSelect = (type: "image" | "video" | "audio" | "file") => {
    if (fileInputRef.current) {
      switch (type) {
        case "image":
          fileInputRef.current.accept = "image/*";
          break;
        case "video":
          fileInputRef.current.accept = "video/*";
          break;
        case "audio":
          fileInputRef.current.accept = "audio/*";
          break;
        case "file":
          fileInputRef.current.accept =
            ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt";
          break;
      }
      fileInputRef.current.click();
    }
    setShowAttachMenu(false);
  };

  // Open media preview - Cải thiện cách xem media
  const openMediaPreview = (message: GroupMessage) => {
    console.log("Opening media preview:", message);
    if (message.type && ["image", "video", "audio"].includes(message.type)) {
      setMediaPreview(message);
    }
  };

  // Delete message với hai tùy chọn
  const handleDeleteMessage = async (message: GroupMessage) => {
    if (!socket || !user || !groupId) return;

    // Hiển thị hộp thoại với hai tùy chọn
    setSelectedMessageForDelete(message);
    setShowDeleteOptionsDialog(true);
  };

  // Xóa tin nhắn với mọi người
  const deleteMessageForEveryone = async () => {
    if (!selectedMessageForDelete || !socket || !user || !groupId) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:3005/api/groups/message/${selectedMessageForDelete._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { deleteType: "everyone" },
        }
      );

      // Cập nhật state ngay lập tức
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === selectedMessageForDelete._id
            ? {
                ...msg,
                content: "Tin nhắn đã bị thu hồi",
                isUnsent: true,
                unsent: true,
              }
            : msg
        )
      );

      // Thông báo cho các thành viên khác
      socket.emit("deleteGroupMessage", {
        messageId: selectedMessageForDelete._id,
        userId: user._id,
        groupId: groupId,
        deleteType: "everyone",
      });

      // Đóng dialog
      setShowDeleteOptionsDialog(false);
      setSelectedMessageForDelete(null);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  // Xóa tin nhắn chỉ với bạn
  const deleteMessageForMe = async () => {
    if (!selectedMessageForDelete || !user || !groupId) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:3005/api/groups/message/${selectedMessageForDelete._id}/for-me`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Xóa tin nhắn khỏi danh sách chỉ ở phía client
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg._id !== selectedMessageForDelete._id)
      );

      // Đóng dialog
      setShowDeleteOptionsDialog(false);
      setSelectedMessageForDelete(null);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  // Fetch media files in the group
  const fetchMediaFiles = () => {
    const media = messages
      .filter(
        (message) =>
          message.type &&
          ["image", "video", "audio", "file"].includes(message.type) &&
          message.fileUrl
      )
      .map((message) => ({
        _id: message._id,
        type: message.type as "image" | "video" | "audio" | "file",
        fileUrl: message.fileUrl || "",
        fileName: message.fileName || "Unnamed file",
        fileThumbnail: message.fileThumbnail,
        createdAt: message.createdAt,
        sender:
          typeof message.sender === "object"
            ? message.sender._id
            : message.sender,
      }));

    setMediaFiles(media);
  };

  // Handle leave group
  const handleLeaveGroup = async () => {
    if (!user || !groupId) return;

    const confirmed = await showConfirmDialog(
      "Bạn có chắc chắn muốn rời khỏi nhóm này không?"
    );
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:3005/api/groups/remove-member`,
        {
          groupId,
          memberId: user._id,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Thông báo cho các thành viên khác
      if (socket) {
        socket.emit("memberRemovedFromGroup", {
          groupId,
          memberId: user._id, // tự rời nhóm
        });
      }

      // Chuyển hướng người dùng
      window.location.href = "/";
    } catch (error) {
      console.error("Error leaving group:", error);
    }
  };

  // Handle delete group
  const handleDeleteGroup = async () => {
    if (!user || !groupId) return;

    const confirmed = await showConfirmDialog(
      "Bạn có chắc chắn muốn xóa nhóm này không? Hành động này không thể hoàn tác."
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:3005/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Thông báo cho tất cả thành viên
      if (socket) {
        socket.emit("groupDissolved", {
          groupId,
          dissolvedBy: user._id,
        });
      }

      // Chuyển hướng người dùng
      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting group:", error);
    }
  };

  // Chức năng chỉnh sửa tên nhóm
  const handleEditGroupName = () => {
    if (group) {
      setNewGroupName(group.name);
      setShowEditNameDialog(true);
    }
  };

  // Phần còn lại của các hàm và JSX

  if (loading) {
    return <div className="chat-loading">Loading group chat...</div>;
  }

  if (error) {
    return <div className="chat-error">{error}</div>;
  }

  if (!group) {
    return <div className="chat-error">Group not found</div>;
  }

  const typingMembers = Array.from(typingUsers.values());

  return (
    <div className="group-chat-interface">
      <div className="chat-header"></div>
      <div className="chat-messages">
        {renderMessages()}
        {typingMembers.length > 0 && (
          <div className="typing-indicator">
            <span>
              {typingMembers.length === 1
                ? `${typingMembers[0]} is typing...`
                : typingMembers.length === 2
                ? `${typingMembers[0]} and ${typingMembers[1]} are typing...`
                : `${typingMembers.length} people are typing...`}
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form className="message-form" onSubmit={handleSendMessage}>
        {/* Form content */}
        <input
          type="text"
          placeholder={isReplying ? "Type your reply..." : "Type a message..."}
          value={newMessage}
          onChange={handleTyping}
        />
        <button type="submit" disabled={!newMessage.trim() && !isUploading}>
          <FiSend />
        </button>
      </form>
    </div>
  );
};

export default GroupChatInterface;

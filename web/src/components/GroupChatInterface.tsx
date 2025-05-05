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

import CoAdminDialog from "./CoAdminDialog";

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

  const [selectedCoAdminAction, setSelectedCoAdminAction] = useState<
    "add" | "remove"
  >("add");
  const [coAdminSearchResults, setCoAdminSearchResults] = useState<any[]>([]);
  const [coAdminSearchTerm, setCoAdminSearchTerm] = useState("");

  // Thêm state cho dialog chuyển quyền admin
  const [showTransferAdminDialog, setShowTransferAdminDialog] = useState(false);
  const [transferToUserId, setTransferToUserId] = useState<string | null>(null);

  const dispatch = useAppDispatch();

  useEffect(() => {
    if (group && user) {
      const adminId =
        typeof group.admin === "object" && group.admin !== null
          ? group.admin._id
          : group.admin;

      const userId = user._id;

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
    }
  }, [group, user]);

  useEffect(() => {
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

      const isFromCurrentUser =
        typeof data.sender === "string"
          ? data.sender === user?._id
          : data.sender._id === user?._id;

      const isCurrentGroup = data.groupId === groupId;

      if (isFromCurrentUser) {
        setMessages((prev) => [...prev, newMessage]);
      } else {
        if (isCurrentGroup) {
          setMessages((prev) => [...prev, newMessage]);
        } else {
          dispatch(incrementUnreadGroupMessages());
        }
      }

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

  const handleLongPress = (message: GroupMessage) => {
    if (selectedMessage && selectedMessage._id === message._id) {
      setSelectedMessage(null);
      setShowEmojiPicker(false);
    } else {
      setSelectedMessage(message);
      setShowEmojiPicker(false);
    }
  };

  const handleReply = (message: GroupMessage) => {
    setReplyToMessage(message);
    setIsReplying(true);
    setSelectedMessage(null);
    const input = document.querySelector(
      ".message-form input"
    ) as HTMLInputElement;
    if (input) input.focus();
  };

  const cancelReply = () => {
    setReplyToMessage(null);
    setIsReplying(false);
  };

  const openEmojiPicker = (message: GroupMessage) => {
    setSelectedMessage(message);
    setShowEmojiPicker(true);
  };

  const handleReaction = (emoji: string) => {
    if (!selectedMessage || !socket || !user || !groupId) return;

    socket.emit("addGroupReaction", {
      messageId: selectedMessage._id,
      userId: user._id,
      emoji: emoji,
      groupId: groupId,
    });

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

    setSelectedMessage(null);
    setShowEmojiPicker(false);
  };

  const handleDownloadFile = (message: GroupMessage) => {
    if (message.fileUrl) {
      window.open(message.fileUrl, "_blank");
    }
  };

  const toggleAttachMenu = () => {
    setShowAttachMenu((prev) => !prev);
  };

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

  const openMediaPreview = (message: GroupMessage) => {
    if (message.type && ["image", "video", "audio"].includes(message.type)) {
      setMediaPreview(message);
    }
  };

  const handleDeleteMessage = async (message: GroupMessage) => {
    if (!socket || !user || !groupId) return;

    setSelectedMessageForDelete(message);
    setShowDeleteOptionsDialog(true);
  };

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

      socket.emit("deleteGroupMessage", {
        messageId: selectedMessageForDelete._id,
        userId: user._id,
        groupId: groupId,
        deleteType: "everyone",
      });

      setShowDeleteOptionsDialog(false);
      setSelectedMessageForDelete(null);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

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

      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg._id !== selectedMessageForDelete._id)
      );

      setShowDeleteOptionsDialog(false);
      setSelectedMessageForDelete(null);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

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

  const handleTransferAdminRole = async () => {
    if (!transferToUserId || !groupId || !user) return;

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:3005/api/groups/transfer-admin`,
        {
          groupId,
          newAdminId: transferToUserId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (socket) {
        socket.emit("adminTransferred", {
          groupId,
          oldAdminId: user._id,
          newAdminId: transferToUserId,
        });
      }

      await handleLeaveAfterTransfer();
    } catch (error) {
      console.error("Error transferring admin role:", error);
      alert("Không thể chuyển quyền quản trị. Vui lòng thử lại sau.");
    }
  };

  const handleLeaveAfterTransfer = async () => {
    if (!user || !groupId) return;

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

      if (socket) {
        socket.emit("memberRemovedFromGroup", {
          groupId,
          memberId: user._id,
        });
      }

      window.location.href = "/";
    } catch (error) {
      console.error("Error leaving group:", error);
    }
  };

  const handleLeaveGroup = async () => {
    if (!user || !groupId) return;

    const confirmed = await showConfirmDialog(
      "Bạn có chắc chắn muốn rời khỏi nhóm này không?"
    );
    if (!confirmed) return;

    if (userRole === "admin") {
      setShowTransferAdminDialog(true);
      return;
    }

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

      if (socket) {
        socket.emit("memberRemovedFromGroup", {
          groupId,
          memberId: user._id,
        });
      }

      window.location.href = "/";
    } catch (error) {
      console.error("Error leaving group:", error);
    }
  };

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

      if (socket) {
        socket.emit("groupDissolved", {
          groupId,
          dissolvedBy: user._id,
        });
      }

      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting group:", error);
    }
  };

  const handleEditGroupName = () => {
    if (group) {
      setNewGroupName(group.name);
      setShowEditNameDialog(true);
    }
  };

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

  function handleManageCoAdmins(
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ): void {
    event.preventDefault();
    setShowManageCoAdminDialog(true);
  }

  return (
    <div className="group-chat-interface">
      <div className="chat-header">
        <div className="group-info">
          <div className="group-avatar">
            {group.avatarUrl ? (
              <img src={group.avatarUrl} alt={group.name} />
            ) : (
              <div className="avatar-placeholder">
                {group.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="group-details">
            <h2 className="group-name">{group.name}</h2>
            <div className="group-members-count">
              {group.members.length} members
              {group.members.length > 0 && (
                <span className="online-members">
                  •{" "}
                  {
                    Array.from(onlineUsers).filter((id) =>
                      group.members.some((member) =>
                        typeof member === "object"
                          ? member._id === id
                          : member === id
                      )
                    ).length
                  }{" "}
                  online
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="action-button search-button"
            onClick={() => setShowSearchDialog(true)}
            title="Search messages"
          >
            <FiSearch />
          </button>

          <button
            className="action-button members-button"
            onClick={() => setShowMembersList(true)}
            title="Group members"
          >
            <FiUsers />
          </button>

          <div className="dropdown">
            <button
              className="action-button more-button"
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              title="More options"
            >
              <FiMoreVertical />
            </button>

            {showMoreOptions && (
              <div className="drpdown-menu">
                {(userRole === "admin" || userRole === "coAdmin") && (
                  <>
                    <button onClick={handleEditGroupName}>
                      <FiSettings /> Chỉnh sửa tên nhóm
                    </button>
                    <button onClick={() => setShowAddMemberDialog(true)}>
                      <FiUserPlus /> Thêm thành viên
                    </button>
                    <button onClick={() => setShowRemoveMemberDialog(true)}>
                      <FiUserX /> Xóa thành viên
                    </button>
                    {userRole === "admin" && (
                      <button onClick={handleManageCoAdmins}>
                        <FiUserCheck /> Quản lý phó nhóm
                      </button>
                    )}
                    <div className="dropdown-divider"></div>
                  </>
                )}
                <button onClick={() => setShowMediaGallery(true)}>
                  <FiImage /> Thư viện media
                </button>
                <button onClick={handleLeaveGroup} className="danger-option">
                  <FiArchive /> Rời nhóm
                </button>
                {userRole === "admin" && (
                  <button onClick={handleDeleteGroup} className="danger-option">
                    <FiTrash2 /> Xóa nhóm
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showMembersList && (
        <div
          className="modal-overlay"
          onClick={() => setShowMembersList(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Group Members ({group.members.length})</h3>
              <button
                className="close-button"
                onClick={() => setShowMembersList(false)}
              >
                <FiX />
              </button>
            </div>
            <div className="members-list">
              {group.members.map((member) => {
                const memberId =
                  typeof member === "object" ? member._id : member;
                const memberName =
                  typeof member === "object" ? member.name : "Unknown";
                const memberAvt =
                  typeof member === "object" ? member.avt : null;
                const isAdmin =
                  typeof group.admin === "object"
                    ? group.admin._id === memberId
                    : group.admin === memberId;
                const isCoAdmin =
                  Array.isArray(group.coAdmins) &&
                  group.coAdmins.includes(memberId);
                const isOnline = onlineUsers.has(memberId);

                const canRemoveMember =
                  (userRole === "admin" && memberId !== user?._id) ||
                  (userRole === "coAdmin" &&
                    !isAdmin &&
                    !isCoAdmin &&
                    memberId !== user?._id);

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
                      {isOnline && <div className="online-indicator"></div>}
                    </div>
                    <div className="member-info">
                      <div className="member-name">
                        {memberName}
                        {memberId === user?._id && " (You)"}
                        {isAdmin && (
                          <span className="role-badge admin">Admin</span>
                        )}
                        {isCoAdmin && (
                          <span className="role-badge co-admin">Co-Admin</span>
                        )}
                      </div>
                    </div>

                    {canRemoveMember && (
                      <button
                        className="remove-button"
                        onClick={async () => {
                          const confirmed = await showConfirmDialog(
                            `Bạn có chắc chắn muốn xóa ${memberName} khỏi nhóm?`
                          );

                          if (!confirmed) return;

                          try {
                            const token = localStorage.getItem("token");
                            await axios.post(
                              `http://localhost:3005/api/groups/remove-member`,
                              {
                                groupId,
                                memberId,
                              },
                              {
                                headers: { Authorization: `Bearer ${token}` },
                              }
                            );

                            if (socket) {
                              socket.emit("memberRemovedFromGroup", {
                                groupId,
                                memberId,
                                removedBy: user?._id,
                              });
                            }

                            fetchGroupInfo();

                            alert(`Đã xóa ${memberName} khỏi nhóm`);
                          } catch (error) {
                            console.error("Error removing member:", error);
                            alert(
                              "Không thể xóa thành viên. Vui lòng thử lại sau."
                            );
                          }
                        }}
                      >
                        <FiUserX /> Xóa
                      </button>
                    )}

                    {userRole === "admin" && !isAdmin && !isCoAdmin && (
                      <button
                        className="promote-button"
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem("token");
                            await axios.post(
                              `http://localhost:3005/api/groups/add-co-admin`,
                              {
                                groupId,
                                userId: memberId,
                              },
                              {
                                headers: { Authorization: `Bearer ${token}` },
                              }
                            );

                            if (socket) {
                              socket.emit("addCoAdmin", {
                                groupId,
                                userId: memberId,
                                addedBy: user?._id,
                              });
                            }

                            fetchGroupInfo();

                            alert(`Đã thăng cấp ${memberName} làm phó nhóm`);
                          } catch (error) {
                            console.error("Error adding co-admin:", error);
                          }
                        }}
                      >
                        <FiUserCheck /> Thăng cấp
                      </button>
                    )}

                    {userRole === "admin" && isCoAdmin && (
                      <button
                        className="demote-button"
                        onClick={async () => {
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

                            if (socket) {
                              socket.emit("removeCoAdmin", {
                                groupId,
                                userId: memberId,
                                removedBy: user?._id,
                              });
                            }

                            fetchGroupInfo();

                            alert(
                              `Đã hạ cấp ${memberName} xuống thành viên thường`
                            );
                          } catch (error) {
                            console.error("Error removing co-admin:", error);
                          }
                        }}
                      >
                        <FiUserX /> Hạ cấp
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showAddMemberDialog && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddMemberDialog(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Members</h3>
              <button
                className="close-button"
                onClick={() => setShowAddMemberDialog(false)}
              >
                <FiX />
              </button>
            </div>
            <div className="search-container">
              <input
                type="text"
                placeholder="Search users..."
                value={newMemberSearch}
                onChange={(e) => setNewMemberSearch(e.target.value)}
              />
              <button
                className="search-button"
                onClick={() => {
                  const searchUsers = async () => {
                    try {
                      const token = localStorage.getItem("token");
                      const response = await axios.get(
                        `http://localhost:3005/api/search/users?query=${newMemberSearch}`,
                        {
                          headers: { Authorization: `Bearer ${token}` },
                        }
                      );
                      const filteredResults = response.data.filter(
                        (user: any) =>
                          !group.members.some((member) =>
                            typeof member === "object"
                              ? member._id === user._id
                              : member === user._id
                          )
                      );
                      setSearchResults(filteredResults);
                    } catch (error) {
                      console.error("Error searching users:", error);
                    }
                  };

                  if (newMemberSearch.trim()) {
                    searchUsers();
                  }
                }}
              >
                Search
              </button>
            </div>
            <div className="search-results">
              {searchResults.map((user) => (
                <div key={user._id} className="user-item">
                  <div className="user-avatar">
                    {user.avt ? (
                      <img src={user.avt} alt={user.name} />
                    ) : (
                      <div className="avatar-placeholder">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="user-info">
                    <div className="user-name">{user.name}</div>
                    <div className="user-email">{user.email}</div>
                  </div>
                  <button
                    className="add-button"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem("token");
                        await axios.post(
                          `http://localhost:3005/api/groups/add-member`,
                          {
                            groupId,
                            memberId: user._id,
                          },
                          {
                            headers: { Authorization: `Bearer ${token}` },
                          }
                        );

                        if (socket) {
                          socket.emit("addMemberToGroup", {
                            groupId,
                            memberId: user._id,
                            addedBy: user?._id,
                          });
                        }

                        fetchGroupInfo();
                        setShowAddMemberDialog(false);
                      } catch (error) {
                        console.error("Error adding member:", error);
                      }
                    }}
                  >
                    Add
                  </button>
                </div>
              ))}
              {searchResults.length === 0 && newMemberSearch && (
                <div className="no-results">No users found</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteOptionsDialog && selectedMessageForDelete && (
        <div
          className="modal-overlay"
          onClick={() => setShowDeleteOptionsDialog(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Message</h3>
              <button
                className="close-button"
                onClick={() => setShowDeleteOptionsDialog(false)}
              >
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <p>How do you want to delete this message?</p>
              <div className="delete-options">
                <button className="delete-option" onClick={deleteMessageForMe}>
                  Delete for me only
                </button>
                <button
                  className="delete-option delete-for-everyone"
                  onClick={deleteMessageForEveryone}
                >
                  Delete for everyone
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditNameDialog && (
        <div
          className="modal-overlay"
          onClick={() => setShowEditNameDialog(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Group Name</h3>
              <button
                className="close-button"
                onClick={() => setShowEditNameDialog(false)}
              >
                <FiX />
              </button>
            </div>
            <div className="edit-name-form">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter new group name"
              />
              <div className="button-group">
                <button
                  className="cancel-button"
                  onClick={() => setShowEditNameDialog(false)}
                >
                  Cancel
                </button>
                <button
                  className="save-button"
                  onClick={async () => {
                    if (!newGroupName.trim()) return;

                    try {
                      const token = localStorage.getItem("token");
                      await axios.put(
                        `http://localhost:3005/api/groups/${groupId}`,
                        {
                          name: newGroupName,
                        },
                        {
                          headers: { Authorization: `Bearer ${token}` },
                        }
                      );

                      setGroup((prev) =>
                        prev ? { ...prev, name: newGroupName } : null
                      );
                      setShowEditNameDialog(false);

                      if (socket) {
                        socket.emit("groupUpdated", {
                          groupId,
                          updatedBy: user?._id,
                        });
                      }
                    } catch (error) {
                      console.error("Error updating group name:", error);
                    }
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showManageCoAdminDialog && group && user && socket && (
        <CoAdminDialog
          isOpen={showManageCoAdminDialog}
          groupId={groupId || ""}
          group={group}
          userId={user._id}
          onClose={() => setShowManageCoAdminDialog(false)}
          onCoAdminUpdated={fetchGroupInfo}
          socket={socket}
        />
      )}

      {showRemoveMemberDialog && (
        <div
          className="modal-overlay"
          onClick={() => setShowRemoveMemberDialog(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Remove Members</h3>
              <button
                className="close-button"
                onClick={() => setShowRemoveMemberDialog(false)}
              >
                <FiX />
              </button>
            </div>
            <div className="remove-member-section">
              <p className="info-text">
                Select members to remove from the group
              </p>
              <div className="members-list">
                {group.members
                  .filter((member) => {
                    const memberId =
                      typeof member === "object" ? member._id : member;

                    if (userRole === "admin") {
                      return memberId !== user?._id;
                    }

                    const isAdmin =
                      typeof group.admin === "object"
                        ? group.admin._id === memberId
                        : group.admin === memberId;
                    const isCoAdmin =
                      Array.isArray(group.coAdmins) &&
                      group.coAdmins.includes(memberId);

                    return !isAdmin && !isCoAdmin && memberId !== user?._id;
                  })
                  .map((member) => {
                    const memberId =
                      typeof member === "object" ? member._id : member;
                    const memberName =
                      typeof member === "object" ? member.name : "Unknown";
                    const memberAvt =
                      typeof member === "object" ? member.avt : null;
                    const isOnline = onlineUsers.has(memberId);

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
                          {isOnline && <div className="online-indicator"></div>}
                        </div>
                        <div className="member-info">
                          <div className="member-name">{memberName}</div>
                        </div>
                        <button
                          className="remove-button"
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem("token");
                              await axios.post(
                                `http://localhost:3005/api/groups/remove-member`,
                                {
                                  groupId,
                                  memberId,
                                },
                                {
                                  headers: { Authorization: `Bearer ${token}` },
                                }
                              );

                              if (socket) {
                                socket.emit("memberRemovedFromGroup", {
                                  groupId,
                                  memberId,
                                  removedBy: user?._id,
                                });
                              }

                              fetchGroupInfo();

                              alert(`Đã xóa ${memberName} khỏi nhóm`);
                            } catch (error) {
                              console.error("Error removing member:", error);
                              alert(
                                "Không thể xóa thành viên. Vui lòng thử lại sau."
                              );
                            }
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
              </div>
              <div className="button-group">
                <button
                  className="cancel-button"
                  onClick={() => setShowRemoveMemberDialog(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {isReplying && replyToMessage && (
        <ReplyBar
          replyToMessage={replyToMessage}
          friend={null}
          user={user}
          cancelReply={cancelReply}
        />
      )}

      <form className="message-form" onSubmit={handleSendMessage}>
        <div className="form-actions">
          <div className="attach-menu-container">
            <button
              type="button"
              className="attach-button"
              onClick={toggleAttachMenu}
            >
              <FiPaperclip />
            </button>

            {showAttachMenu && (
              <div className="attach-menu">
                <button
                  type="button"
                  onClick={() => handleFileTypeSelect("image")}
                  className="attach-option"
                >
                  <FiImage /> Image
                </button>
                <button
                  type="button"
                  onClick={() => handleFileTypeSelect("video")}
                  className="attach-option"
                >
                  <FiVideo /> Video
                </button>
                <button
                  type="button"
                  onClick={() => handleFileTypeSelect("audio")}
                  className="attach-option"
                >
                  <FiMusic /> Audio
                </button>
                <button
                  type="button"
                  onClick={() => handleFileTypeSelect("file")}
                  className="attach-option"
                >
                  <FiFileText /> Document
                </button>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
          </div>
        </div>

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

      <MediaPreview
        mediaPreview={mediaPreview}
        closeMediaPreview={() => setMediaPreview(null)}
      />

      {isUploading && (
        <div className="upload-overlay">
          <div className="upload-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <div className="progress-text">{uploadProgress}%</div>
          </div>
        </div>
      )}

      {showTransferAdminDialog && (
        <div
          className="modal-overlay"
          onClick={() => setShowTransferAdminDialog(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chuyển quyền nhóm trưởng</h3>
              <button
                className="close-button"
                onClick={() => setShowTransferAdminDialog(false)}
              >
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Bạn cần chọn một thành viên để chuyển quyền nhóm trưởng trước
                khi rời nhóm.
              </p>

              <div className="members-list">
                {group?.members
                  .filter((member) => {
                    const memberId =
                      typeof member === "object" ? member._id : member;
                    return memberId !== user?._id;
                  })
                  .map((member) => {
                    const memberId =
                      typeof member === "object" ? member._id : member;
                    const memberName =
                      typeof member === "object" ? member.name : "Unknown";
                    const memberAvt =
                      typeof member === "object" ? member.avt : null;
                    const isCoAdmin =
                      Array.isArray(group?.coAdmins) &&
                      group?.coAdmins.includes(memberId);

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
                          <div className="member-name">
                            {memberName}
                            {isCoAdmin && (
                              <span className="role-badge co-admin">
                                Phó nhóm
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          className={`select-admin-button ${
                            transferToUserId === memberId ? "selected" : ""
                          }`}
                          onClick={() => setTransferToUserId(memberId)}
                        >
                          {transferToUserId === memberId ? "Đã chọn" : "Chọn"}
                        </button>
                      </div>
                    );
                  })}
              </div>

              <div className="button-group">
                <button
                  className="cancel-button"
                  onClick={() => setShowTransferAdminDialog(false)}
                >
                  Hủy
                </button>
                <button
                  className="confirm-button"
                  disabled={!transferToUserId}
                  onClick={handleTransferAdminRole}
                >
                  Chuyển quyền và rời nhóm
                </button>
              </div>

              <div className="auto-select-note">
                <p>
                  <i>
                    Ghi chú: Nếu có phó nhóm, chúng tôi khuyến nghị bạn nên chọn
                    một phó nhóm làm nhóm trưởng mới.
                  </i>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupChatInterface;

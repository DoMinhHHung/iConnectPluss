import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../redux/hooks";
import "../scss/ChatInterface.scss";
import {
  FiMoreVertical,
  FiSearch,
  FiArchive,
  FiTrash2,
  FiX,
  FiFileText,
  FiPaperclip,
  FiImage,
  FiVideo,
  FiMusic,
  FiSend,
} from "./IconComponents";

import {
  Message,
  Friend,
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
  incrementUnreadMessages,
  resetUnreadMessages,
} from "../redux/slices/messageSlice";

const ChatInterface: React.FC = () => {
  const { friendId } = useParams<{ friendId: string }>();
  const { user } = useAppSelector((state) => state.auth);
  const [friend, setFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [apiStatus, setApiStatus] = useState<{
    friendInfo: boolean;
    messages: boolean;
  }>({ friendInfo: false, messages: false });
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaPreview, setMediaPreview] = useState<Message | null>(null);

  // Thêm states cho menu tùy chọn và dialog
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedMediaType, setSelectedMediaType] = useState<
    "all" | "image" | "video" | "audio" | "file"
  >("all");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteAllMessages, setDeleteAllMessages] = useState(false);

  const dispatch = useAppDispatch();

  // Hàm tìm kiếm tin nhắn
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const results = messages.filter((message) =>
      message.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setSearchResults(results);
  };

  // Hàm lấy tất cả media từ cuộc trò chuyện
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

  // Hàm lọc media theo loại
  const filterMediaByType = (
    type: "all" | "image" | "video" | "audio" | "file"
  ) => {
    setSelectedMediaType(type);
  };

  // Hàm xóa cuộc trò chuyện
  const handleDeleteConversation = async () => {
    if (!socket || !user || !friendId) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:3005/api/chat/conversation/${user._id}/${friendId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (deleteAllMessages) {
        socket.emit("deleteConversation", {
          senderId: user._id,
          receiverId: friendId,
        });
      }

      setMessages([]);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  // Hàm xử lý thu hồi tin nhắn
  const handleUnsendMessage = async (message: Message) => {
    setSelectedMessage(message);

    // Sử dụng hàm showConfirmDialog thay vì window.confirm
    const result = await showConfirmDialog("Bạn muốn thu hồi tin nhắn này?");
    if (result) {
      unsendMessage(message, false);
    }
  };

  // Hàm thực hiện thu hồi tin nhắn
  const unsendMessage = async (
    message: Message,
    forEveryone: boolean = false
  ) => {
    try {
      if (!socket || !user) return;

      // Gọi API để thu hồi tin nhắn
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:3005/api/chat/messages/${message._id}/unsend`,
        { forEveryone },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Cập nhật tin nhắn trong state
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === message._id
            ? { ...msg, content: "Tin nhắn đã bị thu hồi", unsent: true }
            : msg
        )
      );

      // Gửi thông báo qua socket nếu thu hồi cho cả hai
      if (forEveryone && socket && friendId) {
        socket.emit("unsendMessage", {
          messageId: message._id,
          senderId: user._id,
          receiverId: friendId,
        });
      }
    } catch (error) {
      console.error("Error unsending message:", error);
    } finally {
      setSelectedMessage(null);
    }
  };

  // Khởi tạo socket
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !user) return;

    const newSocket = io("http://localhost:3005", {
      auth: {
        token,
      },
    });

    setSocket(newSocket);

    newSocket.on("receiveMessage", (data: any) => {
      console.log("Nhận tin nhắn mới:", data);
      const newMessage: Message = {
        _id: data._id,
        sender: data.sender,
        receiver: data.receiver,
        content: data.content,
        createdAt: data.createdAt,
        status: data.status || "delivered",
        chatType: "private",
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

      // Xử lý cập nhật tin nhắn tạm nếu có
      if (data._tempId) {
        // Thay thế tin nhắn tạm thời bằng tin nhắn thật từ server thay vì thêm tin nhắn mới
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === data._tempId
              ? { ...newMessage, _tempId: data._tempId }
              : msg
          )
        );
        // Thêm return để không thêm tin nhắn mới nếu đã có tin nhắn tạm
        return;
      }

      // Kiểm tra tin nhắn đến từ user hiện tại không (có thể từ tab khác)
      const isFromCurrentUser =
        typeof data.sender === "string"
          ? data.sender === user?._id
          : data.sender._id === user?._id;

      if (isFromCurrentUser) {
        // Chỉ thêm vào danh sách tin nhắn
        setMessages((prev) => [...prev, newMessage]);
      } else {
        // Kiểm tra xem có đang ở trong cuộc trò chuyện với người gửi không
        const isCurrentConversation =
          (typeof data.sender === "string" && data.sender === friendId) ||
          (typeof data.sender !== "string" && data.sender._id === friendId);

        // Thêm tin nhắn vào danh sách
        setMessages((prev) => [...prev, newMessage]);

        // Nếu không phải là cuộc trò chuyện hiện tại, tăng số tin nhắn chưa đọc
        if (!isCurrentConversation) {
          console.log("Tăng số tin nhắn chưa đọc");
          dispatch(incrementUnreadMessages());
        } else {
          // Đánh dấu là đã đọc nếu đang trong cuộc trò chuyện
          if (socket) {
            socket.emit("messageDelivered", { messageId: data._id });
          }
        }
      }
    });

    // Lắng nghe trạng thái tin nhắn
    newSocket.on("messageStatus", (data: any) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId ? { ...msg, status: data.status } : msg
        )
      );
    });

    // Thêm sự kiện unsendMessage
    newSocket.on("messageUnsent", (data: { messageId: string }) => {
      console.log("Tin nhắn đã bị thu hồi:", data);
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === data.messageId
            ? { ...msg, content: "Tin nhắn đã bị thu hồi", unsent: true }
            : msg
        )
      );
    });

    // Thêm sự kiện xóa toàn bộ tin nhắn
    newSocket.on("conversationDeleted", (data: { senderId: string }) => {
      console.log("Cuộc trò chuyện đã bị xóa bởi:", data.senderId);
      // Nếu là cuộc trò chuyện hiện tại, xóa tất cả tin nhắn
      if (data.senderId === friendId) {
        setMessages([]);
      }
    });

    // Lắng nghe sự kiện trạng thái người dùng
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
    });

    // Lấy danh sách người dùng online khi kết nối
    newSocket.on("onlineUsers", (userIds: string[]) => {
      setOnlineUsers(new Set(userIds));
    });

    // Lắng nghe sự kiện đang nhập
    newSocket.on("userTyping", (data: { userId: string }) => {
      if (friendId && data.userId === friendId) {
        setIsTyping(true);
      }
    });

    newSocket.on("userStoppedTyping", (data: { userId: string }) => {
      if (friendId && data.userId === friendId) {
        setIsTyping(false);
      }
    });

    // Lắng nghe sự kiện cập nhật trạng thái tin nhắn
    newSocket.on(
      "messageStatusUpdate",
      (data: { messageId: string; status: "delivered" | "seen" }) => {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg._id === data.messageId ? { ...msg, status: data.status } : msg
          )
        );
      }
    );

    // Lắng nghe reactions
    newSocket.on(
      "messageReaction",
      (data: { messageId: string; userId: string; emoji: string }) => {
        console.log("Nhận reaction:", data);
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
    );

    return () => {
      newSocket.disconnect();
    };
  }, [friendId, user, dispatch]);

  // Scroll đến tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Lấy thông tin người dùng và tin nhắn
  useEffect(() => {
    if (!friendId || !user) return;

    const fetchFriendInfo = async () => {
      try {
        const token = localStorage.getItem("token");
        setLoading(true);
        setError(null);

        console.log(`Đang lấy thông tin người dùng: ${friendId}`);

        try {
          const friendResponse = await axios.get(
            `http://localhost:3005/api/auth/${friendId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          console.log("Thông tin người dùng nhận được:", friendResponse.data);

          if (friendResponse.data) {
            setFriend(friendResponse.data);
            setApiStatus((prev) => ({ ...prev, friendInfo: true }));
          }
        } catch (friendErr: any) {
          console.error("Lỗi khi lấy thông tin người dùng:", friendErr);

          // Thử với endpoint dự phòng
          try {
            console.log("Thử với endpoint dự phòng...");
            const backupResponse = await axios.get(
              `http://localhost:3005/api/auth/search/${friendId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            if (backupResponse.data) {
              setFriend(backupResponse.data);
              setApiStatus((prev) => ({ ...prev, friendInfo: true }));
            }
          } catch (backupErr) {
            console.error("Endpoint dự phòng cũng thất bại:", backupErr);
            // Sử dụng ID để tạm thời hiển thị
            if (friendId) {
              const shortId = friendId.substring(0, 8);
              setFriend({
                _id: friendId,
                name: `Người dùng ${shortId}...`,
              });
            }

            setError(
              "Không thể tải thông tin người dùng. Vui lòng làm mới trang."
            );
          }
        }

        // Lấy tin nhắn bất kể có lấy được thông tin người dùng hay không
        try {
          console.log(`Đang lấy tin nhắn giữa ${user._id} và ${friendId}`);
          const messagesResponse = await axios.get(
            `http://localhost:3005/api/chat/messages/${user._id}/${friendId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          console.log("Tin nhắn nhận được:", messagesResponse.data);
          setMessages(messagesResponse.data || []);
          setApiStatus((prev) => ({ ...prev, messages: true }));
        } catch (messagesErr: any) {
          console.error("Lỗi khi lấy tin nhắn:", messagesErr);
          setMessages([]);
        }

        setLoading(false);
      } catch (err: any) {
        console.error("Lỗi tổng thể:", err);
        setError("Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.");
        setLoading(false);
      }
    };

    fetchFriendInfo();
  }, [friendId, user]);

  // Thêm xử lý đang nhập
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    // Thông báo đang nhập
    if (socket && user && friendId) {
      // Xóa timeout cũ nếu có
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // Gửi sự kiện đang nhập
      socket.emit("typing", {
        sender: user._id,
        receiver: friendId,
      });

      // Đặt timeout mới để thông báo ngừng nhập sau 2 giây
      const timeout = setTimeout(() => {
        if (socket) {
          socket.emit("stopTyping", {
            sender: user._id,
            receiver: friendId,
          });
        }
      }, 2000);

      setTypingTimeout(timeout);
    }
  };

  // Hàm gửi tin nhắn
  const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !user || !friendId) return;

    // Hủy sự kiện đang nhập
    if (socket) {
      socket.emit("stopTyping", {
        sender: user._id,
        receiver: friendId,
      });
    }

    // Tạo ID tạm thời cho tin nhắn
    const tempId = Date.now().toString();

    // Tạo tin nhắn tạm thời để hiển thị ngay lập tức
    const tempMessage: Message = {
      _id: tempId,
      sender: user._id,
      receiver: friendId,
      content: newMessage,
      createdAt: new Date().toISOString(),
      status: "sent",
      chatType: "private",
      // Thêm thông tin trả lời nếu có
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

    // Thêm tin nhắn tạm vào danh sách
    setMessages((prev) => [...prev, tempMessage]);

    console.log("Gửi tin nhắn:", {
      sender: user._id,
      receiver: friendId,
      content: newMessage,
      tempId, // Gửi ID tạm để server có thể cập nhật sau
      chatType: "private",
      ...(replyToMessage ? { replyToId: replyToMessage._id } : {}),
    });

    socket.emit("sendMessage", {
      sender: user._id,
      receiver: friendId,
      content: newMessage,
      tempId,
      chatType: "private",
      ...(replyToMessage ? { replyToId: replyToMessage._id } : {}),
    });

    setNewMessage("");
    // Reset trạng thái trả lời
    setReplyToMessage(null);
    setIsReplying(false);
  };

  // Thêm useEffect để đánh dấu tin nhắn đã đọc
  useEffect(() => {
    // Kiểm tra xem có tin nhắn chưa đọc từ người khác không
    if (socket && messages.length > 0 && friendId && user) {
      const unreadMessages = messages.filter((msg) => {
        const senderId =
          typeof msg.sender === "object" ? msg.sender._id : msg.sender;
        return senderId === friendId && msg.status !== "seen";
      });

      if (unreadMessages.length > 0) {
        // Đánh dấu tất cả là đã đọc
        unreadMessages.forEach((msg) => {
          socket.emit("messageRead", {
            messageId: msg._id,
            sender:
              typeof msg.sender === "object" ? msg.sender._id : msg.sender,
            receiver: user._id,
          });
        });

        // Cập nhật trạng thái tin nhắn trong state
        setMessages((prevMessages) =>
          prevMessages.map((msg) => {
            const senderId =
              typeof msg.sender === "object" ? msg.sender._id : msg.sender;
            return senderId === friendId && msg.status !== "seen"
              ? { ...msg, status: "seen" }
              : msg;
          })
        );
      }
    }
  }, [messages, socket, friendId, user]);

  // Xử lý long press để hiển thị menu
  const handleLongPress = (message: Message) => {
    if (selectedMessage && selectedMessage._id === message._id) {
      setSelectedMessage(null);
      setShowEmojiPicker(false);
    } else {
      setSelectedMessage(message);
      setShowEmojiPicker(false);
    }
  };

  // Mở bảng emoji
  const openEmojiPicker = (message: Message) => {
    setSelectedMessage(message);
    setShowEmojiPicker(true);
  };

  // Xử lý thả emoji cho tin nhắn
  const handleReaction = (emoji: string) => {
    if (!selectedMessage || !socket || !user) return;

    console.log("Đang thả reaction:", {
      messageId: selectedMessage._id,
      userId: user._id,
      emoji: emoji,
    });

    // Emit sự kiện thả emoji
    socket.emit("addReaction", {
      messageId: selectedMessage._id,
      userId: user._id,
      emoji: emoji,
    });

    // Đóng menu
    setSelectedMessage(null);
    setShowEmojiPicker(false);
  };

  // Xử lý trả lời tin nhắn
  const handleReply = (message: Message) => {
    setReplyToMessage(message);
    setIsReplying(true);
    // Focus vào input
    const input = document.querySelector(
      ".message-form input"
    ) as HTMLInputElement;
    if (input) input.focus();
  };

  // Hủy trả lời
  const cancelReply = () => {
    setReplyToMessage(null);
    setIsReplying(false);
  };

  // Xử lý hiển thị menu đính kèm file
  const toggleAttachMenu = () => {
    setShowAttachMenu((prev) => !prev);
  };

  // Xử lý khi click vào nút chọn loại file
  const handleFileTypeSelect = (type: "image" | "video" | "audio" | "file") => {
    if (fileInputRef.current) {
      // Đặt accept attribute dựa trên loại file
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

  // Xử lý upload file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket || !user || !friendId) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Xác định loại file
      let fileType: "image" | "video" | "audio" | "file" = "file";
      if (file.type.startsWith("image/")) fileType = "image";
      else if (file.type.startsWith("video/")) fileType = "video";
      else if (file.type.startsWith("audio/")) fileType = "audio";

      // Tạo form data để upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", fileType);
      formData.append("senderId", user._id);
      formData.append("receiverId", friendId);

      // Upload file lên server
      const response = await axios.post(
        "http://localhost:3005/api/chat/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
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

      // Lấy URL file đã upload
      const { fileUrl, fileName, fileThumbnail, fileId, expiryDate } =
        response.data;

      // Tạo ID tạm thời cho tin nhắn
      const tempId = Date.now().toString();

      // Tạo tin nhắn tạm thời để hiển thị ngay lập tức
      const tempMessage: Message = {
        _id: tempId,
        sender: user._id,
        receiver: friendId,
        content: fileName || file.name,
        createdAt: new Date().toISOString(),
        status: "sent",
        type: fileType,
        fileUrl,
        fileName: fileName || file.name,
        fileSize: file.size,
        fileThumbnail,
        fileId,
        expiryDate,
        chatType: "private",
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

      // Thêm tin nhắn tạm vào danh sách
      setMessages((prev) => [...prev, tempMessage]);

      // Gửi thông tin file qua socket
      socket.emit("sendMessage", {
        sender: user._id,
        receiver: friendId,
        content: fileName || file.name,
        tempId,
        type: fileType,
        fileUrl,
        fileName: fileName || file.name,
        fileSize: file.size,
        fileThumbnail,
        fileId,
        expiryDate,
        chatType: "private",
        ...(replyToMessage ? { replyToId: replyToMessage._id } : {}),
      });

      // Reset trạng thái
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

  // Mở media preview
  const openMediaPreview = (message: Message) => {
    if (message.type && ["image", "video", "audio"].includes(message.type)) {
      setMediaPreview(message);
    }
  };

  // Đóng media preview
  const closeMediaPreview = () => {
    setMediaPreview(null);
  };

  // Xử lý tải file
  const handleDownloadFile = (message: Message) => {
    if (message.fileUrl) {
      window.open(message.fileUrl, "_blank");
    }
  };

  // Thêm đoạn code sau trong useEffect khi component mount
  useEffect(() => {
    // Reset counter tin nhắn cá nhân khi vào trang chat
    dispatch(resetUnreadMessages());
  }, [dispatch]);

  if (loading) {
    return <div className="chat-loading">Đang tải cuộc trò chuyện...</div>;
  }

  if (!friend) {
    return (
      <div className="chat-error">Không tìm thấy thông tin người dùng</div>
    );
  }

  const isFriendOnline = friendId ? onlineUsers.has(friendId) : false;

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div className="avatar">
          {friend.avt ? (
            <img src={friend.avt} alt={friend.name} />
          ) : (
            <div className="avatar-placeholder">
              {friend.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="user-info">
          <h3>{friend.name}</h3>
          <span className={`status ${isFriendOnline ? "online" : "offline"}`}>
            {isFriendOnline ? "Đang hoạt động" : "Ngoại tuyến"}
          </span>
        </div>
        <div className="more-options">
          <button
            className="more-options-button"
            onClick={() => setShowMoreOptions((prev) => !prev)}
          >
            <FiMoreVertical />
          </button>
          {showMoreOptions && (
            <div className="more-options-menu">
              <button
                className="option-button"
                onClick={() => setShowSearchDialog(true)}
              >
                <FiSearch /> Tìm kiếm tin nhắn
              </button>
              <button
                className="option-button"
                onClick={() => {
                  fetchMediaFiles();
                  setShowMediaGallery(true);
                }}
              >
                <FiArchive /> Xem media
              </button>
              <button
                className="option-button"
                onClick={() => setShowDeleteDialog(true)}
              >
                <FiTrash2 /> Xóa tin nhắn
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search Dialog */}
      {showSearchDialog && (
        <div className="search-dialog">
          <div className="search-header">
            <h3>Tìm kiếm tin nhắn</h3>
            <button
              className="close-button"
              onClick={() => setShowSearchDialog(false)}
            >
              <FiX />
            </button>
          </div>
          <input
            type="text"
            placeholder="Nhập nội dung tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="search-button" onClick={handleSearch}>
            Tìm kiếm
          </button>
          <div className="search-results">
            {searchResults.length === 0 ? (
              <p>Không tìm thấy kết quả</p>
            ) : (
              searchResults.map((result) => (
                <div key={result._id} className="search-result-item">
                  <p>{result.content}</p>
                  <span>{new Date(result.createdAt).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Media Gallery */}
      {showMediaGallery && (
        <div className="media-gallery">
          <div className="gallery-header">
            <h3>Xem media</h3>
            <button
              className="close-button"
              onClick={() => setShowMediaGallery(false)}
            >
              <FiX />
            </button>
          </div>
          <div className="media-filters">
            <button
              className={`filter-button ${
                selectedMediaType === "all" ? "active" : ""
              }`}
              onClick={() => filterMediaByType("all")}
            >
              Tất cả
            </button>
            <button
              className={`filter-button ${
                selectedMediaType === "image" ? "active" : ""
              }`}
              onClick={() => filterMediaByType("image")}
            >
              Hình ảnh
            </button>
            <button
              className={`filter-button ${
                selectedMediaType === "video" ? "active" : ""
              }`}
              onClick={() => filterMediaByType("video")}
            >
              Video
            </button>
            <button
              className={`filter-button ${
                selectedMediaType === "audio" ? "active" : ""
              }`}
              onClick={() => filterMediaByType("audio")}
            >
              Âm thanh
            </button>
            <button
              className={`filter-button ${
                selectedMediaType === "file" ? "active" : ""
              }`}
              onClick={() => filterMediaByType("file")}
            >
              Tập tin
            </button>
          </div>
          <div className="media-items">
            {mediaFiles
              .filter(
                (file) =>
                  selectedMediaType === "all" || file.type === selectedMediaType
              )
              .map((file) => (
                <div key={file._id} className="media-item">
                  {file.type === "image" && (
                    <img src={file.fileUrl} alt={file.fileName} />
                  )}
                  {file.type === "video" && (
                    <video controls>
                      <source src={file.fileUrl} type="video/mp4" />
                    </video>
                  )}
                  {file.type === "audio" && (
                    <audio controls>
                      <source src={file.fileUrl} type="audio/mpeg" />
                    </audio>
                  )}
                  {file.type === "file" && (
                    <div className="file-item">
                      <FiFileText />
                      <span>{file.fileName}</span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {showDeleteDialog && (
        <div className="delete-dialog">
          <div className="dialog-header">
            <h3>Xóa tin nhắn</h3>
            <button
              className="close-button"
              onClick={() => setShowDeleteDialog(false)}
            >
              <FiX />
            </button>
          </div>
          <p>Bạn có chắc chắn muốn xóa toàn bộ tin nhắn?</p>
          <label>
            <input
              type="checkbox"
              checked={deleteAllMessages}
              onChange={(e) => setDeleteAllMessages(e.target.checked)}
            />
            Xóa tin nhắn cho cả hai bên
          </label>
          <button className="delete-button" onClick={handleDeleteConversation}>
            Xóa
          </button>
        </div>
      )}

      {/* Chat Messages */}
      <div className="chat-messages">
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}
        {!error && messages.length === 0 ? (
          <div className="no-messages">
            <p>Hãy bắt đầu cuộc trò chuyện với {friend.name}</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              data-message-id={message._id}
              className={`message ${
                isMessageFromCurrentUser(message, user?._id)
                  ? "sent"
                  : "received"
              } ${message.unsent ? "unsent" : ""}`}
              onContextMenu={(e) => {
                e.preventDefault();
                handleLongPress(message);
              }}
            >
              {/* Hiển thị tin nhắn đang trả lời nếu có */}
              {message.replyTo && (
                <div className="reply-content">
                  <div className="reply-indicator"></div>
                  <div className="reply-text">
                    <span className="reply-sender">
                      {message.replyTo.sender === user?._id
                        ? "Bạn"
                        : friend.name}
                    </span>
                    <p>{message.replyTo.content}</p>
                  </div>
                </div>
              )}

              <div className="message-content">
                {!message.unsent ? (
                  renderMessageContent(
                    message,
                    openMediaPreview,
                    handleDownloadFile
                  )
                ) : (
                  <span className="unsent-message">Tin nhắn đã bị thu hồi</span>
                )}

                {/* Nút hiển thị khi hover */}
                {!message.unsent && (
                  <div className="message-hover-actions">
                    <button
                      className="hover-action-button reply-button"
                      onClick={() => handleReply(message)}
                      title="Trả lời"
                    >
                      ↩️
                    </button>
                    <button
                      className="hover-action-button reaction-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEmojiPicker(message);
                      }}
                      title="Thả cảm xúc"
                    >
                      😀
                    </button>
                    {/* Thêm nút tải xuống cho file, ảnh, video */}
                    {["image", "video", "audio", "file"].includes(
                      message.type || ""
                    ) && (
                      <button
                        className="hover-action-button download-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadFile(message);
                        }}
                        title="Tải xuống"
                      >
                        💾
                      </button>
                    )}
                    {/* Nút thu hồi tin nhắn */}
                    {isMessageFromCurrentUser(message, user?._id) && (
                      <button
                        className="hover-action-button unsend-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnsendMessage(message);
                        }}
                        title="Thu hồi tin nhắn"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Hiển thị reactions */}
              {renderReactions(message)}

              <div className="message-info">
                <span className="message-time">
                  {formatTime(message.createdAt)}
                </span>
                {isMessageFromCurrentUser(message, user?._id) &&
                  renderMessageStatus(message.status)}
              </div>

              {/* Menu tương tác khi chọn tin nhắn */}
              {selectedMessage?._id === message._id &&
                !showEmojiPicker &&
                !message.unsent && (
                  <div className="message-actions">
                    <button
                      className="action-button"
                      onClick={() => setShowEmojiPicker(true)}
                    >
                      😀 Thả cảm xúc
                    </button>
                    <button
                      className="action-button"
                      onClick={() => handleReply(message)}
                    >
                      ↩️ Trả lời
                    </button>
                    {["image", "video", "audio", "file"].includes(
                      message.type || ""
                    ) && (
                      <button
                        className="action-button"
                        onClick={() => handleDownloadFile(message)}
                      >
                        💾 Tải xuống
                      </button>
                    )}
                    {isMessageFromCurrentUser(message, user?._id) && (
                      <>
                        <button
                          className="action-button"
                          onClick={() => unsendMessage(message, false)}
                        >
                          🗑️ Thu hồi với mình
                        </button>
                        <button
                          className="action-button"
                          onClick={() => unsendMessage(message, true)}
                        >
                          🗑️ Thu hồi với mọi người
                        </button>
                      </>
                    )}
                    <button
                      className="action-button close"
                      onClick={() => setSelectedMessage(null)}
                    >
                      ✖️ Đóng
                    </button>
                  </div>
                )}

              {/* Bảng chọn emoji */}
              {selectedMessage?._id === message._id &&
                showEmojiPicker &&
                !message.unsent && (
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
          ))
        )}
        {isTyping && (
          <div className="typing-indicator">
            <span>{friend.name} đang nhập...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File upload progress indicator */}
      {isUploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <span>{uploadProgress}%</span>
        </div>
      )}

      {/* Media preview */}
      <MediaPreview
        mediaPreview={mediaPreview}
        closeMediaPreview={closeMediaPreview}
      />

      {/* Hiển thị thanh trả lời nếu đang trả lời */}
      <ReplyBar
        replyToMessage={replyToMessage}
        friend={friend}
        user={user}
        cancelReply={cancelReply}
      />

      <form className="message-form" onSubmit={handleSendMessage}>
        {/* Nút đính kèm file */}
        <div className="attachment-container">
          <button
            type="button"
            className="attachment-button"
            onClick={toggleAttachMenu}
          >
            <FiPaperclip />
          </button>

          {showAttachMenu && (
            <div className="attachment-menu">
              <button
                type="button"
                className="attachment-option image"
                onClick={() => handleFileTypeSelect("image")}
              >
                <FiImage />
                <span>Hình ảnh</span>
              </button>
              <button
                type="button"
                className="attachment-option video"
                onClick={() => handleFileTypeSelect("video")}
              >
                <FiVideo />
                <span>Video</span>
              </button>
              <button
                type="button"
                className="attachment-option audio"
                onClick={() => handleFileTypeSelect("audio")}
              >
                <FiMusic />
                <span>Âm thanh</span>
              </button>
              <button
                type="button"
                className="attachment-option file"
                onClick={() => handleFileTypeSelect("file")}
              >
                <FiFileText />
                <span>Tập tin</span>
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

        <input
          type="text"
          placeholder={
            isReplying ? "Nhập tin nhắn trả lời..." : "Nhập tin nhắn..."
          }
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

export default ChatInterface;

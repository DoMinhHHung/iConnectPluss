import React from "react";
import { FiVideo, FiFileText, FiX } from "../components/IconComponents";

// Interfaces
export interface Message {
  _id: string;
  sender: string | { _id: string; name?: string; avt?: string };
  receiver: string;
  content: string;
  createdAt: string;
  status?: "sent" | "delivered" | "seen";
  reactions?: {
    [userId: string]: string;
  };
  replyTo?: {
    _id: string;
    content: string;
    sender: string | { _id: string; name?: string; avt?: string };
  };
  type?: "text" | "image" | "video" | "audio" | "file";
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileThumbnail?: string;
  fileId?: string;
  expiryDate?: string;
  fileExpired?: boolean;
  unsent?: boolean;
  _tempId?: string; // ID tạm thời cho tin nhắn mới gửi
  chatType?: "private" | "group"; // Loại chat (riêng tư hoặc nhóm)
}

export interface Friend {
  _id: string;
  name: string;
  avt?: string;
  isOnline?: boolean;
}

export interface EmojiOption {
  emoji: string;
  label: string;
}

export interface MediaFile {
  _id: string;
  type: "image" | "video" | "audio" | "file";
  fileUrl: string;
  fileName: string;
  fileThumbnail?: string;
  createdAt: string;
  sender: string;
}

// Common emojis
export const commonEmojis: EmojiOption[] = [
  { emoji: "👍", label: "Thích" },
  { emoji: "❤️", label: "Yêu thích" },
  { emoji: "😂", label: "Haha" },
  { emoji: "😮", label: "Wow" },
  { emoji: "😢", label: "Buồn" },
  { emoji: "😡", label: "Phẫn nộ" },
];

// Utility functions
export const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Render functions
export const renderMessageStatus = (status?: "sent" | "delivered" | "seen") => {
  if (!status) return null;

  switch (status) {
    case "sent":
      return <span className="message-status">Đã gửi</span>;
    case "delivered":
      return <span className="message-status">Đã nhận</span>;
    case "seen":
      return <span className="message-status seen">Đã xem</span>;
    default:
      return null;
  }
};

export const renderReactions = (message: Message) => {
  if (!message.reactions) return null;

  const reactionCount = Object.keys(message.reactions).length;
  if (reactionCount === 0) return null;

  // Tạo một đối tượng để đếm số lượng mỗi emoji
  const counts: { [emoji: string]: number } = {};
  Object.values(message.reactions).forEach((emoji) => {
    counts[emoji] = (counts[emoji] || 0) + 1;
  });

  return (
    <div className="message-reactions">
      {Object.entries(counts).map(([emoji, count]) => (
        <span
          key={emoji}
          className="reaction-item"
          title={`${count} người đã thả cảm xúc`}
        >
          {emoji} {count > 1 ? count : ""}
        </span>
      ))}
    </div>
  );
};

export const renderMessageContent = (
  message: Message,
  openMediaPreview: (message: Message) => void,
  handleDownloadFile: (message: Message) => void
) => {
  switch (message.type) {
    case "image":
      return (
        <div
          className="message-media"
          onClick={() => openMediaPreview(message)}
        >
          <img
            src={message.fileUrl}
            alt={message.fileName || "Image"}
            className="message-image"
            loading="lazy"
            onError={(e) => {
              // Fallback khi không load được ảnh
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.alt = "Không thể tải ảnh";
              target.style.height = "50px";
              target.style.width = "auto";
              target.style.opacity = "0.5";
            }}
          />
          <div className="message-file-info">
            <span className="message-file-name">{message.fileName}</span>
            {message.fileSize && (
              <span className="message-file-size">
                {formatFileSize(message.fileSize)}
              </span>
            )}
          </div>
        </div>
      );
    case "video":
      return (
        <div
          className="message-media"
          onClick={() => openMediaPreview(message)}
        >
          <div className="video-thumbnail">
            {message.fileThumbnail ? (
              <img
                src={message.fileThumbnail}
                alt="Video thumbnail"
                onError={(e) => {
                  // Fallback khi không load được thumbnail
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent) {
                    const iconDiv = document.createElement("div");
                    iconDiv.className = "video-icon";
                    iconDiv.innerHTML =
                      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polygon points='23 7 16 12 23 17 23 7'></polygon><rect x='1' y='5' width='15' height='14' rx='2' ry='2'></rect></svg>";
                    parent.appendChild(iconDiv);
                  }
                }}
              />
            ) : (
              <div className="video-icon">
                <FiVideo />
              </div>
            )}
            <div className="play-button">▶</div>
          </div>
          <div className="message-file-info">
            <span className="message-file-name">{message.fileName}</span>
            {message.fileSize && (
              <span className="message-file-size">
                {formatFileSize(message.fileSize)}
              </span>
            )}
          </div>
        </div>
      );
    case "audio":
      return (
        <div className="message-audio">
          <audio controls>
            <source src={message.fileUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
          <div className="message-file-info">
            <span className="message-file-name">{message.fileName}</span>
            <span className="message-file-size">
              {formatFileSize(message.fileSize || 0)}
            </span>
          </div>
        </div>
      );
    case "file":
      return (
        <div
          className="message-file"
          onClick={() => handleDownloadFile(message)}
        >
          <div className="file-icon">
            <FiFileText />
          </div>
          <div className="message-file-info">
            <span className="message-file-name">{message.fileName}</span>
            <span className="message-file-size">
              {formatFileSize(message.fileSize || 0)}
            </span>
          </div>
          <FileInfo message={message} />
        </div>
      );
    default:
      return message.content;
  }
};

// Components
export const FileInfo: React.FC<{ message: Message }> = ({ message }) => {
  // Thêm state để theo dõi trạng thái xem trước
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  // Kiểm tra xem file có thể xem trước được không (docx, pdf, text files)
  const isPreviewable = React.useMemo(() => {
    if (!message.fileName) return false;
    const ext = message.fileName.split(".").pop()?.toLowerCase();
    return [
      "pdf",
      "docx",
      "doc",
      "txt",
      "json",
      "md",
      "js",
      "html",
      "css",
      "xml",
    ].includes(ext || "");
  }, [message.fileName]);

  // Tạo URL xem trước
  const previewUrl = React.useMemo(() => {
    if (!message.fileId) return "";
    // Lấy URL từ server
    return `${window.location.protocol}//${window.location.host}/api/chat/preview/${message.fileId}`;
  }, [message.fileId]);

  // Mở xem trước trong iframe hoặc tab mới
  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPreviewOpen) {
      setIsPreviewOpen(false);
    } else {
      setIsPreviewOpen(true);
    }
  };

  // Xem trước trong tab mới
  const openInNewTab = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(previewUrl, "_blank");
  };

  if (message.fileId && message.expiryDate) {
    const expiryDate = new Date(message.expiryDate);
    const now = new Date();

    if (message.fileExpired) {
      return <div className="file-expired">File đã hết hạn và bị xóa</div>;
    }

    const daysLeft = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
      <div className="file-info-container">
        <div className="file-expiry-info">
          File này sẽ hết hạn trong {daysLeft} ngày
        </div>

        {isPreviewable && (
          <div className="file-preview-actions">
            <button className="preview-button" onClick={handlePreview}>
              {isPreviewOpen ? "Đóng xem trước" : "Xem trước"}
            </button>
            <button className="open-new-tab" onClick={openInNewTab}>
              Mở trong tab mới
            </button>
          </div>
        )}

        {isPreviewable && isPreviewOpen && (
          <div className="file-preview-container">
            <iframe
              src={previewUrl}
              title="Document Preview"
              className="file-preview-iframe"
              sandbox="allow-scripts"
            ></iframe>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const MediaPreview: React.FC<{
  mediaPreview: Message | null;
  closeMediaPreview: () => void;
}> = ({ mediaPreview, closeMediaPreview }) => {
  if (!mediaPreview) return null;

  return (
    <div className="media-preview-overlay" onClick={closeMediaPreview}>
      <div
        className="media-preview-container"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-preview" onClick={closeMediaPreview}>
          <FiX />
        </button>
        {mediaPreview.type === "image" && (
          <img
            src={mediaPreview.fileUrl}
            alt={mediaPreview.fileName || "Image"}
          />
        )}
        {mediaPreview.type === "video" && (
          <video controls autoPlay>
            <source src={mediaPreview.fileUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}
        {mediaPreview.type === "audio" && (
          <div className="audio-player-large">
            <h3>{mediaPreview.fileName}</h3>
            <audio controls autoPlay>
              <source src={mediaPreview.fileUrl} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
      </div>
    </div>
  );
};

export const ReplyBar: React.FC<{
  replyToMessage: Message | null;
  friend: Friend | null;
  user: any;
  cancelReply: () => void;
}> = ({ replyToMessage, friend, user, cancelReply }) => {
  if (!replyToMessage) return null;

  return (
    <div className="reply-bar">
      <div className="reply-preview">
        <div className="reply-indicator"></div>
        <div className="reply-info">
          <span className="reply-to">
            Trả lời{" "}
            {replyToMessage.sender === user?._id
              ? "chính bạn"
              : friend?.name || "người dùng"}
          </span>
          <p className="reply-content-preview">{replyToMessage.content}</p>
        </div>
      </div>
      <button className="cancel-reply" onClick={cancelReply}>
        ✖️
      </button>
    </div>
  );
};

// Function để kiểm tra xem tin nhắn có phải của người dùng hiện tại không
export const isMessageFromCurrentUser = (message: Message, userId?: string) => {
  if (!userId) return false;

  return (
    message.sender === userId ||
    (typeof message.sender === "object" && message.sender._id === userId)
  );
};

// Hàm hiển thị thông báo xác nhận an toàn hơn replace cho window.confirm
export const showConfirmDialog = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const result = window.confirm(message);
    resolve(result);
  });
};

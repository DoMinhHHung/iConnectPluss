import React, { useState, useRef, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../redux/hooks";
import { updateUserSuccess } from "../redux/slices/authSlice";
import { uploadAvatar } from "../api/auth";
import { uploadImageToCloudinary } from "../api/cloudinary";
import "../scss/AvatarUpload.scss";

interface AvatarUploadProps {
  currentAvatar?: string;
  userName?: string;
  userId?: string;
  onSuccess?: (avatarUrl: string) => void;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatar,
  userName,
  userId,
  onSuccess,
}) => {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentAvatar || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [directUrl, setDirectUrl] = useState<string>("");
  const [uploadMethod, setUploadMethod] = useState<"file" | "url">("file");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log("AvatarUpload - Thông tin user:", user);
    console.log("AvatarUpload - userId prop:", userId);
  }, [user, userId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File change handler triggered", e.target.files);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log("Selected file:", file.name, "Size:", Math.round(file.size / 1024), "KB", "Type:", file.type);

      // Kiểm tra kích thước file (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Kích thước file không được vượt quá 5MB");
        return;
      }

      // Kiểm tra loại file (chỉ cho phép hình ảnh)
      if (!file.type.startsWith("image/")) {
        setError("Chỉ chấp nhận file hình ảnh");
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      console.log("File selected successfully, preview URL created");
    } else {
      console.log("No file selected or file selection cancelled");
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDirectUrl(e.target.value);
    setError(null);
  };

  const handleUploadByFile = async () => {
    if (!selectedFile) {
      setError("Vui lòng chọn file trước khi tải lên");
      return;
    }

    // Ưu tiên sử dụng userId từ props, nếu không có thì dùng từ redux store
    const actualUserId = userId || user?._id;

    if (!actualUserId) {
      setError("Không thể xác định người dùng. Vui lòng đăng nhập lại.");
      return;
    }

    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      // Kiểm tra kích thước file trước khi đọc
      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        setError("Kích thước file quá lớn (tối đa 5MB). Vui lòng chọn file nhỏ hơn.");
        setLoading(false);
        return;
      }

      // Đọc file dưới dạng base64
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        const base64Image = reader.result as string;

        try {
          // Upload image to Cloudinary first
          setSuccess("Đang tải ảnh lên Cloudinary...");
          console.log("Uploading avatar to Cloudinary...");
          console.log("File size before processing:", Math.round(base64Image.length / 1024), "KB");
          
          const cloudinaryUrl = await uploadImageToCloudinary(base64Image, "italk_app/avatars");
          
          console.log("Cloudinary upload successful:", cloudinaryUrl);
          setSuccess("Đang cập nhật thông tin người dùng...");
          console.log("Updating avatar for userId:", actualUserId);
          
          // Update the avatar URL in the database
          const updatedUser = await uploadAvatar(actualUserId, cloudinaryUrl);
          
          // Update Redux state
          dispatch(updateUserSuccess(updatedUser));
          
          setSuccess("Avatar đã được cập nhật thành công");
          
          // Call onSuccess callback if provided
          if (onSuccess) {
            onSuccess(cloudinaryUrl);
          }
        } catch (uploadError: any) {
          console.error("Lỗi chi tiết:", uploadError);
          let errorMessage = "Có lỗi xảy ra khi upload avatar";
          
          if (uploadError.message.includes("request entity too large")) {
            errorMessage = "Kích thước ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn hoặc giảm kích thước ảnh.";
          } else if (uploadError.message.includes("timeout")) {
            errorMessage = "Quá thời gian kết nối. Vui lòng thử lại hoặc chọn ảnh nhỏ hơn.";
          } else if (uploadError.message.includes("network")) {
            errorMessage = "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.";
          } else if (uploadError.response) {
            errorMessage = `Lỗi máy chủ: ${uploadError.response.status} - ${uploadError.response.data.message || uploadError.message}`;
          }
          
          setError(errorMessage);
        } finally {
          setLoading(false);
        }
      };
      
      reader.onerror = (event) => {
        console.error("Lỗi khi đọc file:", event);
        setError("Không thể đọc file. Vui lòng thử lại với file khác.");
        setLoading(false);
      };
    } catch (err: any) {
      console.error("Lỗi khi đọc file:", err);
      setError("Không thể đọc file. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  const handleUploadByUrl = async () => {
    if (!directUrl) {
      setError("Vui lòng nhập URL hình ảnh");
      return;
    }

    // Ưu tiên sử dụng userId từ props, nếu không có thì dùng từ redux store
    const actualUserId = userId || user?._id;

    if (!actualUserId) {
      setError("Không thể xác định người dùng. Vui lòng đăng nhập lại.");
      return;
    }

    // Kiểm tra URL
    if (!directUrl.match(/\.(jpeg|jpg|gif|png)$/i)) {
      setError("URL không hợp lệ. Chỉ chấp nhận định dạng JPEG, JPG, GIF, PNG");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Kiểm tra URL có tồn tại không
      const imgTest = new Image();
      imgTest.onload = async () => {
        try {
          console.log("Updating avatar URL for userId:", actualUserId);
          
          // Cập nhật avatar trong database trực tiếp với URL đã cung cấp
          const updatedUser = await uploadAvatar(actualUserId, directUrl);
          
          // Cập nhật state Redux
          dispatch(updateUserSuccess(updatedUser));
          
          setSuccess("Avatar đã được cập nhật thành công");
          setPreviewUrl(directUrl);
          
          // Gọi callback onSuccess nếu được cung cấp
          if (onSuccess) {
            onSuccess(directUrl);
          }
        } catch (err: any) {
          console.error("Lỗi khi cập nhật avatar:", err);
          setError(
            err.response?.data?.message || "Có lỗi xảy ra khi cập nhật avatar"
          );
        } finally {
          setLoading(false);
        }
      };

      imgTest.onerror = () => {
        setError("Không thể tải hình ảnh từ URL này. Vui lòng kiểm tra lại.");
        setLoading(false);
      };

      imgTest.src = directUrl;
    } catch (err: any) {
      console.error("Lỗi khi kiểm tra URL:", err);
      setError("URL không hợp lệ. Vui lòng kiểm tra lại.");
      setLoading(false);
    }
  };

  const handleUpload = () => {
    if (uploadMethod === "file") {
      handleUploadByFile();
    } else {
      handleUploadByUrl();
    }
  };

  const handleRemoveAvatar = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setDirectUrl("");
  };

  const displayAvatar = previewUrl || currentAvatar;
  const displayName = userName || user?.name || "";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="avatar-upload-container">
      <div className="avatar-preview">
        {displayAvatar ? (
          <img src={displayAvatar} alt={displayName} />
        ) : (
          <div className="avatar-placeholder">{initial}</div>
        )}
      </div>

      <div className="upload-methods">
        <div className="btn-group mb-3" role="group">
          <button
            type="button"
            className={`btn ${
              uploadMethod === "file" ? "btn-primary" : "btn-outline-primary"
            }`}
            onClick={() => {
              console.log("File upload method button clicked");
              setUploadMethod("file");
            }}
          >
            Upload từ máy
          </button>
          <button
            type="button"
            className={`btn ${
              uploadMethod === "url" ? "btn-primary" : "btn-outline-primary"
            }`}
            onClick={() => {
              console.log("URL upload method button clicked");
              setUploadMethod("url");
            }}
          >
            Dùng URL
          </button>
        </div>
      </div>

      {uploadMethod === "file" ? (
        <div className="file-upload-section">
          <div className="avatar-actions">
            <label className="btn btn-primary mb-0">
              {loading ? (
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
              ) : (
                "Chọn ảnh"
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  console.log("File input change event triggered directly");
                  handleFileChange(e);
                }}
                style={{ display: "none" }}
              />
            </label>

            {previewUrl && previewUrl !== currentAvatar && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleRemoveAvatar}
              >
                Xóa
              </button>
            )}

            {selectedFile && (
              <button
                type="button"
                className="btn btn-success"
                onClick={handleUpload}
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Tải lên"}
              </button>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            className="file-input"
            accept="image/*"
            onChange={(e) => {
              console.log("File input change event triggered");
              handleFileChange(e);
            }}
            style={{ display: "none" }}
          />
        </div>
      ) : (
        <div className="url-upload-section">
          <div className="input-group mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Nhập URL hình ảnh"
              value={directUrl}
              onChange={handleUrlChange}
              disabled={loading}
            />
            <button
              className="btn btn-success"
              type="button"
              onClick={handleUpload}
              disabled={loading || !directUrl}
            >
              {loading ? (
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
              ) : (
                "Sử dụng"
              )}
            </button>
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger mt-2">{error}</div>}
      {success && <div className="alert alert-success mt-2">{success}</div>}

      <div className="avatar-tips">
        <p>Gợi ý:</p>
        <ul>
          <li>Kích thước tối ưu: 500x500 pixel</li>
          <li>Dung lượng tối đa: 5MB</li>
          <li>Định dạng: JPG, PNG, GIF</li>
        </ul>
      </div>
    </div>
  );
};

export default AvatarUpload;

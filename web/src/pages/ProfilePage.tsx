import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { updateUser, requestOtp } from "../api/auth";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import {
  getUserSuccess,
  updateUserSuccess,
} from "../redux/slices/authSlice";
import { User } from "../types";
import "../scss/ProfilePage.scss";
import AvatarUpload from "../components/AvatarUpload";

const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEmailChanged, setIsEmailChanged] = useState(false);
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, any>>({});
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Nếu đang xem profile của chính mình
        if (!userId && currentUser) {
          setProfileUser(currentUser);
          setLoading(false);
          return;
        }

        // Nếu đang xem profile người khác
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Bạn cần đăng nhập để xem thông tin");
        }

        const targetId = userId || (currentUser?._id as string);
        if (!targetId) {
          throw new Error("Không tìm thấy ID người dùng");
        }

        const response = await axios.get(
          `http://localhost:3005/api/auth/user/${targetId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setProfileUser(response.data);

        // Cập nhật thông tin người dùng hiện tại nếu đang xem profile của chính mình
        if (!userId && response.data) {
          dispatch(getUserSuccess(response.data));
        }
      } catch (err: any) {
        console.error("Lỗi lấy thông tin profile:", err);
        setError(
          err.response?.data?.message || "Không thể lấy thông tin người dùng"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, currentUser, dispatch]);

  // Theo dõi thay đổi email
  useEffect(() => {
    if (profileUser && profileUser.email !== currentUser?.email) {
      setIsEmailChanged(true);
    } else {
      setIsEmailChanged(false);
    }
  }, [profileUser, currentUser]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Chưa cập nhật";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN");
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    if (profileUser) {
      setProfileUser({
        ...profileUser,
        [e.target.name]: e.target.value,
      });
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOtp(e.target.value);
  };

  const handleRequestOtp = async () => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    try {
      // Đảm bảo email luôn là string
      const emailToVerify = profileUser?.email || "";
      await requestOtp({ email: emailToVerify });
      setShowOtpForm(true);
      setSuccess("Mã OTP đã được gửi đến email mới của bạn");
    } catch (err: any) {
      setError(err.response?.data?.message || "Gửi mã OTP thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    // Chỉ gửi các trường đã được thay đổi so với giá trị ban đầu
    const updatedFields: Record<string, any> = {};

    // So sánh giá trị hiện tại với giá trị ban đầu của user
    Object.entries(profileUser || {}).forEach(([key, value]) => {
      // Kiểm tra key có tồn tại trong user object và có thay đổi không
      if (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        key in currentUser &&
        // @ts-ignore - Kiểm tra runtime đã được thực hiện với "key in user"
        value !== currentUser[key]
      ) {
        updatedFields[key] = value;
      }
    });

    // Kiểm tra xem có trường nào được thay đổi không
    if (Object.keys(updatedFields).length === 0) {
      setSuccess("Không có thông tin nào được thay đổi");
      setLoading(false);
      return;
    }

    // Nếu có thay đổi email, cần xác thực OTP
    if (isEmailChanged) {
      // Lưu các trường cần cập nhật để sử dụng sau khi xác thực OTP
      setPendingUpdates(updatedFields);
      // Yêu cầu OTP
      await handleRequestOtp();
      setLoading(false);
      return;
    }

    // Nếu không thay đổi email, cập nhật thông tin ngay
    try {
      const updatedUser = await updateUser(currentUser._id, updatedFields);
      dispatch(updateUserSuccess(updatedUser));
      setSuccess("Cập nhật thông tin thành công");
    } catch (err: any) {
      setError(err.response?.data?.message || "Cập nhật thông tin thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser || !otp) return;

    setLoading(true);
    setError(null);

    try {
      // Thêm OTP vào dữ liệu cập nhật với type annotation
      const dataWithOtp: Partial<User> & { otp: string } = {
        ...pendingUpdates,
        otp,
      };
      const updatedUser = await updateUser(currentUser._id, dataWithOtp);

      dispatch(updateUserSuccess(updatedUser));
      setSuccess("Cập nhật thông tin thành công");
      setShowOtpForm(false);
      setOtp("");
      setPendingUpdates({});
    } catch (err: any) {
      setError(err.response?.data?.message || "Xác thực OTP thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUploadSuccess = (avatarUrl: string) => {
    if (profileUser) {
      console.log("Avatar upload success with URL:", avatarUrl);
      setProfileUser({
        ...profileUser,
        avt: avatarUrl,
      });
      setShowAvatarUpload(false);
      setSuccess("Avatar đã được cập nhật thành công");
    }
  };

  // Debug log để xem thông tin người dùng
  useEffect(() => {
    console.log("ProfilePage - currentUser:", currentUser);
    console.log("ProfilePage - profileUser:", profileUser);
  }, [currentUser, profileUser]);

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p>Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="error-container">
          <div className="alert alert-danger">{error}</div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="profile-page">
        <div className="error-container">
          <div className="alert alert-warning">
            Không tìm thấy thông tin người dùng
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-banner"></div>
        <div className="profile-info-container">
          <div className="profile-avatar">
            {profileUser?.avt ? (
              <img
                src={profileUser.avt}
                alt={profileUser.name}
                onClick={() =>
                  currentUser?._id === profileUser._id &&
                  setShowAvatarUpload(true)
                }
                className={
                  currentUser?._id === profileUser._id ? "editable" : ""
                }
                title={
                  currentUser?._id === profileUser._id
                    ? "Nhấn để thay đổi avatar"
                    : ""
                }
              />
            ) : (
              <div
                className={`avatar-placeholder ${
                  currentUser?._id === profileUser?._id ? "editable" : ""
                }`}
                onClick={() =>
                  currentUser?._id === profileUser?._id &&
                  setShowAvatarUpload(true)
                }
                title={
                  currentUser?._id === profileUser?._id
                    ? "Nhấn để thay đổi avatar"
                    : ""
                }
              >
                {profileUser?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
          </div>
          <div className="profile-name">
            <h1>{profileUser?.name}</h1>
            {profileUser?.role === "admin" && (
              <span className="badge bg-primary">Admin</span>
            )}
          </div>
        </div>
      </div>

      {showAvatarUpload && profileUser && profileUser._id && (
        <div className="avatar-upload-modal">
          <div className="avatar-upload-content">
            <div className="avatar-upload-header">
              <h3>Thay đổi ảnh đại diện</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowAvatarUpload(false)}
              ></button>
            </div>
            <AvatarUpload
              currentAvatar={profileUser.avt}
              userName={profileUser.name}
              userId={profileUser._id}
              onSuccess={handleAvatarUploadSuccess}
            />
          </div>
        </div>
      )}

      <div className="profile-content">
        <div className="row">
          <div className="col-md-8">
            <div className="profile-card">
              <h2>Thông tin cá nhân</h2>
              <div className="info-group">
                <div className="info-item">
                  <label>Email:</label>
                  <p>{profileUser.email || "Chưa cập nhật"}</p>
                </div>
                <div className="info-item">
                  <label>Số điện thoại:</label>
                  <p>{profileUser.phone || "Chưa cập nhật"}</p>
                </div>
                <div className="info-item">
                  <label>Ngày sinh:</label>
                  <p>{formatDate(profileUser.birthDate)}</p>
                </div>
                <div className="info-item">
                  <label>Giới tính:</label>
                  <p>
                    {profileUser.gender === "male"
                      ? "Nam"
                      : profileUser.gender === "female"
                      ? "Nữ"
                      : "Chưa cập nhật"}
                  </p>
                </div>
                <div className="info-item">
                  <label>Địa chỉ:</label>
                  <p>{profileUser.address || "Chưa cập nhật"}</p>
                </div>
                <div className="info-item">
                  <label>Ngày tham gia:</label>
                  <p>{formatDate(profileUser.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="profile-card">
              <h2>Hoạt động</h2>
              <div className="activity-stats">
                <div className="activity-item">
                  <span className="activity-count">0</span>
                  <span className="activity-label">Bài viết</span>
                </div>
                <div className="activity-item">
                  <span className="activity-count">0</span>
                  <span className="activity-label">Bạn bè</span>
                </div>
                <div className="activity-item">
                  <span className="activity-count">0</span>
                  <span className="activity-label">Nhóm</span>
                </div>
              </div>
            </div>

            {currentUser && currentUser._id === profileUser._id && (
              <div className="profile-card mt-4">
                <h2>Tùy chọn</h2>
                <div className="profile-actions">
                  <a href="/settings" className="btn btn-primary btn-block">
                    Chỉnh sửa hồ sơ
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

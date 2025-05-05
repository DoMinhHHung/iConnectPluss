"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../redux/hooks";
import {
  updateUser,
  requestPasswordChangeOtp,
  changePassword,
} from "../api/auth";
import { updateUserSuccess, logoutSuccess } from "../redux/slices/authSlice";
import AvatarUpload from "../components/AvatarUpload";
import "../scss/SettingsPage.scss";

const SettingsPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    birthDate: "",
    address: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    otp: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (user) {
      setUserData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        gender: user.gender || "",
        birthDate: user.birthDate ? user.birthDate.substring(0, 10) : "",
        address: user.address || "",
      });
    }
  }, [user]);

  const handleUserDataChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setUserData({
      ...userData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Kiểm tra email có thay đổi không
      const updateData = { ...userData };
      const updatedUser = await updateUser(user._id, updateData);

      dispatch(updateUserSuccess(updatedUser));
      setSuccess("Cập nhật thông tin thành công");
    } catch (err: any) {
      setError(err.response?.data?.message || "Lỗi khi cập nhật thông tin");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      await requestPasswordChangeOtp({ email: user.email });
      setShowOtpForm(true);
      setSuccess("Mã OTP đã được gửi đến email của bạn");
    } catch (err: any) {
      setError(err.response?.data?.message || "Không thể gửi mã OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        otp: passwordData.otp,
      });

      setSuccess("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");

      // Đăng xuất sau 2 giây
      setTimeout(() => {
        dispatch(logoutSuccess());
        localStorage.removeItem("token");
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Lỗi khi đổi mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch(logoutSuccess());
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleAvatarUploadSuccess = () => {
    setShowAvatarUpload(false);
    setSuccess("Avatar đã được cập nhật thành công");
  };

  if (!user) {
    return (
      <div className="text-center my-5">
        Vui lòng đăng nhập để xem trang này
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-container">
        <div className="settings-sidebar">
          <h2>Cài đặt</h2>
          <ul className="settings-nav">
            <li>
              <button
                className={activeTab === "profile" ? "active" : ""}
                onClick={() => setActiveTab("profile")}
              >
                <i className="fas fa-user"></i> Thông tin cá nhân
              </button>
            </li>
            <li>
              <button
                className={activeTab === "avatar" ? "active" : ""}
                onClick={() => setActiveTab("avatar")}
              >
                <i className="fas fa-image"></i> Ảnh đại diện
              </button>
            </li>
            <li>
              <button
                className={activeTab === "password" ? "active" : ""}
                onClick={() => setActiveTab("password")}
              >
                <i className="fas fa-lock"></i> Đổi mật khẩu
              </button>
            </li>
            <li>
              <button onClick={handleLogout}>
                <i className="fas fa-sign-out-alt"></i> Đăng xuất
              </button>
            </li>
          </ul>
        </div>

        <div className="settings-content">
          {success && <div className="alert alert-success">{success}</div>}
          {error && <div className="alert alert-danger">{error}</div>}

          {activeTab === "profile" && (
            <div className="settings-section">
              <h3>Thông tin cá nhân</h3>
              <form onSubmit={handleUpdateProfile}>
                <div className="form-group">
                  <label htmlFor="name">Họ tên</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={userData.name}
                    onChange={handleUserDataChange}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={userData.email}
                    onChange={handleUserDataChange}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Số điện thoại</label>
                  <input
                    type="text"
                    id="phone"
                    name="phone"
                    value={userData.phone}
                    onChange={handleUserDataChange}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="gender">Giới tính</label>
                  <select
                    id="gender"
                    name="gender"
                    value={userData.gender}
                    onChange={handleUserDataChange}
                    className="form-control"
                  >
                    <option value="">-- Chọn giới tính --</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="birthDate">Ngày sinh</label>
                  <input
                    type="date"
                    id="birthDate"
                    name="birthDate"
                    value={userData.birthDate}
                    onChange={handleUserDataChange}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="address">Địa chỉ</label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={userData.address}
                    onChange={handleUserDataChange}
                    className="form-control"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? "Đang cập nhật..." : "Cập nhật thông tin"}
                </button>
              </form>
            </div>
          )}

          {activeTab === "avatar" && (
            <div className="settings-section">
              <h3>Ảnh đại diện</h3>
              <div className="avatar-section">
                {user && (
                  <AvatarUpload
                    currentAvatar={user.avt}
                    userName={user.name}
                    userId={user._id}
                    onSuccess={handleAvatarUploadSuccess}
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === "password" && (
            <div className="settings-section">
              <h3>Đổi mật khẩu</h3>
              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label htmlFor="currentPassword">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordDataChange}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">Mật khẩu mới</label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordDataChange}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordDataChange}
                    className="form-control"
                    required
                  />
                </div>

                {!showOtpForm ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleRequestOtp}
                    disabled={loading}
                  >
                    {loading ? "Đang xử lý..." : "Yêu cầu mã OTP"}
                  </button>
                ) : (
                  <>
                    <div className="form-group">
                      <label htmlFor="otp">Mã OTP</label>
                      <input
                        type="text"
                        id="otp"
                        name="otp"
                        value={passwordData.otp}
                        onChange={handlePasswordDataChange}
                        className="form-control"
                        required
                      />
                      <small className="form-text text-muted">
                        Mã OTP đã được gửi đến email của bạn. Mã có hiệu lực
                        trong 5 phút.
                      </small>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
                    </button>
                  </>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

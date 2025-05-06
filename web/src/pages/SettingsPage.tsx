"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../redux/hooks";
import { updateUserSuccess, logoutSuccess } from "../redux/slices/authSlice";
import AvatarUpload from "../components/AvatarUpload";
import PersonalInfoTab from "../components/settings/PersonalInfoTab";
import AccountInfoTab from "../components/settings/AccountInfoTab";
import PasswordTab from "../components/settings/PasswordTab";
import "../scss/SettingsPage.scss";

const SettingsPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("profile");

  const handleLogout = () => {
    dispatch(logoutSuccess());
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleAvatarUploadSuccess = () => {
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
                className={activeTab === "account" ? "active" : ""}
                onClick={() => setActiveTab("account")}
              >
                <i className="fas fa-id-card"></i> Thông tin tài khoản
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

          {activeTab === "profile" && user && <PersonalInfoTab user={user} />}

          {activeTab === "account" && user && <AccountInfoTab user={user} />}

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

          {activeTab === "password" && user && <PasswordTab user={user} />}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

"use client";

import React, { useState } from "react";
import { requestPasswordChangeOtp, changePassword } from "../../api/auth";
import { User } from "../../types";

interface PasswordTabProps {
  user: User;
}

const PasswordTab: React.FC<PasswordTabProps> = ({ user }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới không khớp với xác nhận mật khẩu");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

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

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await changePassword({
        currentPassword,
        newPassword,
        otp,
      });

      setSuccess("Đổi mật khẩu thành công");
      setShowOtpForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOtp("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Đổi mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="mb-4">Thay đổi mật khẩu</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {!showOtpForm ? (
        <form onSubmit={handleRequestOtp}>
          <div className="mb-3">
            <label htmlFor="currentPassword" className="form-label">
              Mật khẩu hiện tại
            </label>
            <input
              type="password"
              className="form-control"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="newPassword" className="form-label">
              Mật khẩu mới
            </label>
            <input
              type="password"
              className="form-control"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="confirmPassword" className="form-label">
              Xác nhận mật khẩu mới
            </label>
            <input
              type="password"
              className="form-control"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Đang xử lý..." : "Tiếp tục"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleChangePassword}>
          <div className="mb-3">
            <label htmlFor="otp" className="form-label">
              Mã OTP đã được gửi đến email của bạn
            </label>
            <input
              type="text"
              className="form-control"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Nhập mã OTP 6 số"
              required
            />
          </div>

          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowOtpForm(false)}
              disabled={loading}
            >
              Quay lại
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default PasswordTab;

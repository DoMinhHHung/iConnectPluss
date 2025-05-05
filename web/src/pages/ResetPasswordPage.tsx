import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestOtp, resetPassword } from "../api/auth";
import "../scss/AuthPages.scss";

const ResetPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRequestOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) {
      setError("Vui lòng nhập email");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await requestOtp({ email });
      setSuccess("Mã OTP đã được gửi tới email của bạn");
      setStep(2);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Không thể gửi OTP. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!otp) {
      setError("Vui lòng nhập mã OTP");
      return;
    }

    if (!newPassword) {
      setError("Vui lòng nhập mật khẩu mới");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await resetPassword({ email, otp, newPassword });
      setSuccess("Đặt lại mật khẩu thành công!");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Đặt lại mật khẩu thất bại. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-container">
        <h2>Đặt lại mật khẩu</h2>

        {success && <div className="alert alert-success">{success}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control"
                placeholder="Nhập email của bạn"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : "Gửi mã OTP"}
            </button>

            <div className="auth-links">
              <a href="/login">Quay lại đăng nhập</a>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label htmlFor="otp">Mã OTP</label>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="form-control"
                placeholder="Nhập mã OTP"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-password">Mật khẩu mới</label>
              <input
                type="password"
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-control"
                placeholder="Nhập mật khẩu mới"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">Xác nhận mật khẩu</label>
              <input
                type="password"
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-control"
                placeholder="Nhập lại mật khẩu mới"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
            </button>

            <div className="auth-links">
              <button
                type="button"
                className="btn-link"
                onClick={() => setStep(1)}
              >
                Đổi email khác
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;

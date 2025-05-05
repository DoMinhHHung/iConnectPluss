import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requestOtp, resetPassword } from "../api/auth";

const ForgotPasswordPage: React.FC = () => {
  const [step, setStep] = useState<"request-otp" | "reset-password">(
    "request-otp"
  );
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      setStep("reset-password");
      setSuccess("Mã OTP đã được gửi đến email của bạn");
    } catch (err: any) {
      setError(err.response?.data?.message || "Gửi mã OTP thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu và xác nhận mật khẩu không khớp");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await resetPassword({
        email,
        otp,
        newPassword,
      });
      setSuccess(
        "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới."
      );
      // Wait 3 seconds then redirect to login
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Đặt lại mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card my-5">
            <h2 className="text-center mb-4">Quên mật khẩu</h2>
            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {step === "request-otp" ? (
              <form onSubmit={handleRequestOtp}>
                <p className="text-center mb-4">
                  Nhập email của bạn để nhận mã OTP đặt lại mật khẩu
                </p>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group mt-4">
                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={loading}
                  >
                    {loading ? "Đang gửi..." : "Gửi OTP"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword}>
                <p className="text-center mb-4">
                  Nhập mã OTP đã được gửi đến email của bạn và mật khẩu mới
                </p>
                <div className="form-group">
                  <label htmlFor="otp">Mã OTP</label>
                  <input
                    type="text"
                    className="form-control"
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="newPassword">Mật khẩu mới</label>
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
                <div className="form-group">
                  <label htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
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
                <div className="form-group mt-4">
                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={loading}
                  >
                    {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
                  </button>
                </div>
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    className="btn btn-link"
                    onClick={() => setStep("request-otp")}
                    disabled={loading}
                  >
                    Quay lại
                  </button>
                </div>
              </form>
            )}

            <div className="mt-3 text-center">
              <p>
                <Link to="/login">Quay lại đăng nhập</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

import React, { useState, useEffect } from "react";
import { updateUser } from "../../api/auth";
import { useAppDispatch } from "../../redux/hooks";
import { updateUserSuccess } from "../../redux/slices/authSlice";
import { User } from "../../types";

interface PersonalInfoTabProps {
  user: User;
}

const PersonalInfoTab: React.FC<PersonalInfoTabProps> = ({ user }) => {
  const [formData, setFormData] = useState({
    name: "",
    gender: "",
    birthDate: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const dispatch = useAppDispatch();

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        gender: user.gender || "",
        birthDate: user.birthDate ? user.birthDate.split("T")[0] : "",
        address: user.address || "",
      });
    }
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    // cập nhật các trường thông tin cá nhân đã thay đổi
    const updatedFields: Record<string, any> = {};
    if (formData.name !== user.name) updatedFields.name = formData.name;
    if (formData.gender !== user.gender) updatedFields.gender = formData.gender;
    if (
      formData.birthDate !==
      (user.birthDate ? user.birthDate.split("T")[0] : "")
    )
      updatedFields.birthDate = formData.birthDate;
    if (formData.address !== user.address)
      updatedFields.address = formData.address;

    // Nếu không có thay đổi
    if (Object.keys(updatedFields).length === 0) {
      setSuccess("Không có thông tin nào được thay đổi");
      setLoading(false);
      return;
    }

    try {
      const updatedUser = await updateUser(user._id, updatedFields);
      dispatch(updateUserSuccess(updatedUser));
      setSuccess("Cập nhật thông tin thành công");
    } catch (err: any) {
      setError(err.response?.data?.message || "Cập nhật thông tin thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="mb-4">Thông tin cá nhân</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="name" className="form-label">
            Họ và tên
          </label>
          <input
            type="text"
            className="form-control"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-3">
          <label htmlFor="gender" className="form-label">
            Giới tính
          </label>
          <select
            className="form-select"
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            required
          >
            <option value="">-- Chọn giới tính --</option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
          </select>
        </div>

        <div className="mb-3">
          <label htmlFor="birthDate" className="form-label">
            Ngày sinh
          </label>
          <input
            type="date"
            className="form-control"
            id="birthDate"
            name="birthDate"
            value={formData.birthDate}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label htmlFor="address" className="form-label">
            Địa chỉ
          </label>
          <input
            type="text"
            className="form-control"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Đang cập nhật..." : "Lưu thay đổi"}
        </button>
      </form>
    </div>
  );
};

export default PersonalInfoTab;

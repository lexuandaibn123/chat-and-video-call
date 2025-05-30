import { useState } from "react";
import { passwordUpdate } from "../../api/setting";
import { infoApi } from "../../api/auth";
import { toast } from "react-toastify";

const PasswordForm = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await infoApi();
      if (response.success && response.userInfo) {
        const email = response.userInfo.email;

        const result = await passwordUpdate(email, currentPassword, newPassword);
        if (result.success) {
          toast.success(result.message || "Password updated successfully!");
          // Reset form
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setPasswordError("");
        } else {
          setPasswordError(result.message || "Cập nhật mật khẩu thất bại");
        }
      } else {
        setError("Không thể lấy thông tin người dùng");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCurrentPasswordChange = (e) => {
    setCurrentPassword(e.target.value);
    setPasswordError("");
  };

  const handleNewPasswordChange = (e) => {
    setNewPassword(e.target.value);
    setPasswordError("");
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    setPasswordError("");
  };

  return (
    <div className="account-details">
      <h4>Đổi mật khẩu</h4>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Mật khẩu hiện tại</label>
          <input
            type="password"
            className="form-input"
            value={currentPassword}
            onChange={handleCurrentPasswordChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Mật khẩu mới</label>
          <input
            type="password"
            className="form-input"
            value={newPassword}
            onChange={handleNewPasswordChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Xác nhận mật khẩu mới</label>
          <input
            type="password"
            className="form-input"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            required
          />
        </div>

        {passwordError && <div className="error-message">{passwordError}</div>}
        {error && <div className="error-message">{error}</div>}

        <button type="submit" className="save-button" disabled={isSubmitting}>
          {isSubmitting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
        </button>
      </form>
    </div>
  );
};

export default PasswordForm;

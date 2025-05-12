import { useState, useEffect } from "react";
import { avtUpdate } from "../../api/setting";

const AvatarForm = () => {
  const [avatarUrl, setAvatarUrl] = useState(
    "/placeholder.svg?height=80&width=80"
  );
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // Giảm kích thước tối đa xuống 500KB để tránh lỗi 413
  const MAX_FILE_SIZE = 500 * 1024; // 500KB in bytes
  const MAX_IMAGE_DIMENSION = 800; // pixels

  const handleAvatarSelect = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Kiểm tra kích thước file
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`Kích thước ảnh vượt quá 500KB. Vui lòng chọn ảnh nhỏ hơn hoặc nén ảnh.`);
      return;
    }

    setFile(selectedFile);
    setError(""); // Xóa thông báo lỗi nếu có

    // Thay vì đọc file nguyên bản, ta sẽ resize ảnh trước
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Resize ảnh nếu cần
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Giảm kích thước nếu ảnh quá lớn
        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          if (width > height) {
            height = Math.round(height * MAX_IMAGE_DIMENSION / width);
            width = MAX_IMAGE_DIMENSION;
          } else {
            width = Math.round(width * MAX_IMAGE_DIMENSION / height);
            height = MAX_IMAGE_DIMENSION;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Chất lượng 0.7 là đủ tốt cho avatar và giảm kích thước
        const resizedImage = canvas.toDataURL('image/jpeg', 0.7);
        setAvatarUrl(resizedImage);
      };
      img.onerror = () => {
        setError("Không thể xử lý ảnh. Vui lòng thử một ảnh khác.");
      };
      img.src = e.target?.result;
    };
    reader.onerror = () => {
      setError("Không thể đọc file. Vui lòng thử lại.");
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleSave = async () => {
    if (!file) {
      setError("Vui lòng chọn một ảnh trước.");
      return;
    }

    setUploading(true);
    setError("");
    
    try {
      // Sử dụng avatarUrl đã được resize
      await avtUpdate(avatarUrl);
      alert("Cập nhật ảnh đại diện thành công!");
    } catch (err) {
      setError(`Có lỗi xảy ra: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="account-details">
      <h4>Đổi ảnh đại diện</h4>

      <div className="avatar-upload">
        <div className="avatar-preview">
          <img src={avatarUrl} alt="Avatar Preview" className="avatar-large" />
        </div>

        <div className="avatar-controls">
          <p className="upload-instruction">Tải lên ảnh đại diện mới của bạn</p>

          <label className="upload-button">
            <i className="fas fa-camera icon"></i>
            <span>Chọn ảnh</span>
            <input
              type="file"
              accept="image/*"
              className="hidden-input"
              onChange={handleAvatarSelect}
            />
          </label>

          <p className="upload-note">
            Hỗ trợ JPG, GIF hoặc PNG. Kích thước tối đa 2MB.
          </p>

          {error && <p className="error-message">{error}</p>}

          <button
            className="save-button"
            onClick={handleSave}
            disabled={uploading}
          >
            {uploading ? "Đang tải lên..." : "Lưu ảnh đại diện"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarForm;
import { useState, useEffect } from "react";
import { avtUpdate } from "../../api/setting";
import { UploadButton } from '../../utils/uploadthing';
import { toast } from 'react-toastify';

const AvatarForm = () => {
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");

  useEffect(() => {
    // Simulate fetching initial avatar (replace with actual API call if needed)
    // For now, it starts with defaultUserAvatar
  }, []);

  const handleSave = async () => {
    if (!uploadedUrl) {
      setError("Vui lòng tải lên một ảnh trước.");
      return;
    }

    setError("");
    console.log("avatarUrl: ", avatarUrl);

    try {
      await avtUpdate(uploadedUrl);
      toast.success("Cập nhật ảnh đại diện thành công!");
      alert("Cập nhật ảnh đại diện thành công!");
    } catch (err) {
      setError(`Có lỗi xảy ra: ${err.message}`);
      toast.error(`Có lỗi xảy ra: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="account-details">
      <h4>Đổi ảnh đại diện</h4>

      <div className="avatar-upload">
        <div className="avatar-wrapper">
          <div
            className="avatar-preview"
            style={{ backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
          ></div>
          {uploading && (
            <div className="avatar-loading-overlay">
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#fff' }}></i>
            </div>
          )}
        </div>

        <div className="avatar-controls">
          <p className="upload-instruction">Tải lên ảnh đại diện mới của bạn</p>

          <UploadButton
            endpoint="avatarUploader"
            accept="image/*"
            content={{ button: <i className="fas fa-camera" title="Update Avatar"></i> }}
            appearance={{
              button: {
                padding: "8px",
                background: "#0056b3",
                color: "white",
                borderRadius: "50%",
                cursor: "pointer",
                margin: "0 0 2px 0",
                fontSize: "16px", 
                width: "36px",
                height: "36px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              },
              container: {
                display: "inline-block",
                textAlign: "center",
                marginBottom: "5px"
              },
            }}
            onBeforeUploadBegin={(files) => {
              setUploading(true);
              const previewUrl = URL.createObjectURL(files[0]);
              setAvatarUrl(previewUrl);
              return files;
            }}
            onClientUploadComplete={(res) => {
              if (res && res[0]) {
                const fileUrl = res[0].ufsUrl;
                const sizeInBytes = res[0].size;
                let fileSizeValue, sizeUnit;

                if (sizeInBytes / (1024 * 1024) < 0.1) {
                  fileSizeValue = Math.round(sizeInBytes / 1024);
                  sizeUnit = "kB";
                } else {
                  fileSizeValue = (sizeInBytes / (1024 * 1024)).toFixed(2);
                  sizeUnit = "MB";
                }

                const name = res[0].name || "Uploaded Image";
                setUploadedUrl(fileUrl);
                setAvatarUrl(fileUrl);
                setFileName(name);
                setFileSize(`${fileSizeValue} ${sizeUnit}`);
                toast.success(`Image (${name}, ${fileSizeValue} ${sizeUnit}) uploaded successfully!`);
              }

              setUploading(false);
            }}
            onUploadError={(error) => {
              setError(`Lỗi tải lên: ${error.message}`);
              toast.error(`Lỗi tải lên: ${error.message}`);
              setUploading(false);
            }}
            onUploadProgress={(progress) => {
              console.log(`Upload progress: ${progress}%`);
            }}
            disabled={uploading}
          />

          <div className="file-requirements">
            <p>Định dạng hỗ trợ:</p>
            <ul>
              <li>Hỗ trợ JPG, GIF hoặc PNG</li>
            </ul>
            {fileName && fileSize && (
              <p className="file-info">
                File: {fileName} ({fileSize})
              </p>
            )}
          </div>

          {error && <p className="error-message">{error}</p>}

          <button
            className="save-button"
            onClick={handleSave}
            disabled={uploading || !uploadedUrl}
          >
            {uploading ? "Đang tải lên..." : "Lưu ảnh đại diện"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarForm;
import { useState } from "react";
import { avtUpdate } from "../../api/setting";
import { UploadButton } from '../../utils/uploadthing';

const AvatarForm = () => {
  const [avatarUrl, setAvatarUrl] = useState("/placeholder.svg?height=80&width=80");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [fileName, setFileName] = useState(""); // State for file name
  const [fileSize, setFileSize] = useState(""); // State for file size

  const handleSave = async () => {
    if (!uploadedUrl) {
      setError("Vui lòng tải lên một ảnh trước.");
      return;
    }

    setUploading(true);
    setError("");
    console.log("avatarUrl: ", avatarUrl);

    try {
      await avtUpdate(uploadedUrl);
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
        <div
          className="avatar-preview"
          style={{ backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
        ></div>

        <div className="avatar-controls">
          <p className="upload-instruction">Tải lên ảnh đại diện mới của bạn</p>

          <UploadButton
            endpoint="avatarUploader"
            accept="image/*"
            content={{ button: "Chọn ảnh" }}
            appearance={{
              button: {
                padding: "8px 16px",
                background: "#0056b3",
                color: "white",
                borderRadius: "4px",
                cursor: "pointer",
                margin: "10px"
              },
              container: {
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              },
            }}
            onClientUploadComplete={(res) => {
              if (res && res[0]) {
                const fileUrl = res[0].ufsUrl;
                const sizeInBytes = res[0].size;
                let fileSize, sizeUnit;

                if (sizeInBytes / (1024 * 1024) < 0.1) {
                  fileSize = Math.round(sizeInBytes / 1024); // Size in kB
                  sizeUnit = "kB";
                } else {
                  fileSize = (sizeInBytes / (1024 * 1024)).toFixed(2); // Size in MB with 2 decimals
                  sizeUnit = "MB";
                }

                const name = res[0].name || "Uploaded Image"; // Fallback if name is not provided
                setUploadedUrl(fileUrl);
                setAvatarUrl(fileUrl);
                setFileName(name); // Store file name
                setFileSize(`${fileSize} ${sizeUnit}`); // Store file size with unit
                alert(`Image (${fileSize} ${sizeUnit}) uploaded successfully!`);
              }
            }}
            onUploadError={(error) => {
              setError(`Lỗi tải lên: ${error.message}`);
            }}
            onUploadProgress={(progress) => {
              console.log(`Upload progress: ${progress}%`);
            }}
            onBeforeUploadBegin={(files) => {
              const previewUrl = URL.createObjectURL(files[0]);
              setAvatarUrl(previewUrl);
              return files;
            }}
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

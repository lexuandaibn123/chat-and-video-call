import { useEffect, useState } from "react";
import { createPost } from "../../api/feeds";
import { infoApi } from "../../api/auth";
import { UploadButton } from "../../utils/uploadthing";

const CreatePost = () => {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [avt, setAvt] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");

  useEffect(() => {
    const getInfo = async () => {
      try {
        const response = await infoApi();
        if (response.success && response.userInfo) {
          setAvt(response.userInfo.avatar);
        } else {
          console.log("Error: ", response.error);
        }
      } catch (error) {
        console.error(error);
      }
    };
    getInfo();
  }, []);

  const handlePost = async () => {
    if (!content.trim() && previewUrls.length === 0) {
      setError("Post content or at least one image is required");
      return;
    }
    try {
      setIsSubmitting(true);
      setError("");
      // Chuẩn bị mảng content đúng định dạng yêu cầu
      const contentArr = [];
      if (content.trim()) {
        contentArr.push({ type: "text", data: content.trim() });
      }
      if (previewUrls.length > 0) {
        previewUrls.forEach((url) => {
          contentArr.push({ type: "image", data: url });
        });
      }
      // Call API to create a post
      const response = await createPost({ content: contentArr });
      if (response.success) {
        setContent("");
        setSelectedFiles([]);
        setPreviewUrls([]);
        setUploadedUrl("");
        setImageUrl("");
        setShowPreview(false);
        alert("Post successfully!");
      } else {
        setError(response.message || "Failed to create post");
      }
    } catch (error) {
      console.error("Failed to post:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hàm đóng preview
  const handleCancel = () => {
    setShowPreview(false);
  };

  // Hàm xóa file khỏi preview
  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Helper function to format timestamp

  return (
    <article className="create-post">
      <header className="create-post-header">
        <img src={avt} alt="Profile" className="profile-image" />
        <input
          type="text"
          placeholder="Share what's on your mind..."
          className="create-post-input"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setShowPreview(true);
          }}
        />
      </header>
      <footer className="create-post-footer">
        <button
          className="photo-video-button"
          style={{ position: "relative", overflow: "hidden" }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <span>Image/File</span>
          <span
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0,
              zIndex: 2,
            }}
          >
            <UploadButton
              endpoint="avatarUploader"
              accept="image/*"
              content={{ button: null }}
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
                  marginBottom: "5px",
                },
              }}
              onBeforeUploadBegin={(files) => {
                setUploading(true);
                const previewUrl = URL.createObjectURL(files[0]);
                setImageUrl(previewUrl);
                return files;
              }}
              onClientUploadComplete={(res) => {
                if (res && res.length > 0) {
                  // Lấy danh sách url và file info
                  const urls = res.map((file) => file.ufsUrl);
                  setUploadedUrl(urls[0]);
                  setImageUrl(urls[0]);
                  // Thêm các file mới vào danh sách thay vì ghi đè
                  setSelectedFiles((prev) => [
                    ...prev,
                    ...res.map((file) => ({
                      type: "image/",
                      name: file.name || "Uploaded Image",
                    })),
                  ]);
                  setPreviewUrls((prev) => [...prev, ...urls]);
                }
                setUploading(false);
              }}
              onUploadError={(error) => {
                setError(`Lỗi tải lên: ${error.message}`);
                if (typeof toast !== "undefined")
                  toast.error(`Lỗi tải lên: ${error.message}`);
                setUploading(false);
              }}
              onUploadProgress={(progress) => {
                console.log(`Upload progress: ${progress}%`);
              }}
              disabled={uploading}
            />
          </span>
        </button>
        <button className="post-button" onClick={handlePost}>
          Post
        </button>
      </footer>

      {showPreview && (
        <article className="post-preview">
          <div className="post-preview-header">
            <h3>Preview</h3>
            <button className="preview-cancel" onClick={handleCancel}>
              ✕
            </button>
          </div>

          <header className="post-header">
            <div className="post-author">
              <img
                src={avt}
                alt="You"
                width={40}
                height={40}
                className="profile-image"
              />
              <div className="post-author-info">
                <h3 className="post-author-name">You</h3>
              </div>
            </div>
          </header>

          <section className="post-content">
            {content && <p className="post-text">{content}</p>}

            {selectedFiles.length > 0 && (
              <div
                className={`post-preview-files ${
                  selectedFiles.length === 1
                    ? "single-file"
                    : selectedFiles.length === 2
                    ? "two-files"
                    : "multiple-files"
                }`}
              >
                {selectedFiles.map((file, index) => (
                  <div key={index} className="preview-file-item">
                    {file.type.startsWith("image/") ? (
                      <div className="preview-image-container" style={{ position: 'relative' }}>
                        <img
                          src={previewUrls[index] || "/placeholder.svg"}
                          alt={`Preview ${index + 1}`}
                          className="preview-image"
                          style={{
                            border: '2px solid #ccc',
                            borderRadius: '8px',
                            maxWidth: '100%',
                            maxHeight: '400px',
                            objectFit: 'contain',
                            display: 'block'
                          }}
                        />
                        {/* Overlay loading chỉ cho ảnh cuối cùng khi uploading */}
                        {uploading && index === selectedFiles.length - 1 && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              background: 'rgba(255,255,255,0.5)',
                              borderRadius: '8px',
                              zIndex: 2,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              pointerEvents: 'none'
                            }}
                          >
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                border: '4px solid #ccc',
                                borderTop: '4px solid #0056b3',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                              }}
                            />
                          </div>
                        )}
                        <button
                          className="remove-file-btn"
                          style={{
                            zIndex: 10,
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            background: 'rgba(255,255,255,0.85)',
                            border: 'none',
                            borderRadius: '50%',
                            width: 28,
                            height: 28,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f44336'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.85)'}
                          onClick={() => handleRemoveFile(index)}
                          type="button"
                        >
                          <span style={{ color: '#333', fontWeight: 700, fontSize: 18, lineHeight: 1 }}>✕</span>
                        </button>
                      </div>
                    ) : file.type.startsWith("video/") ? (
                      <div className="preview-video-container">
                        <video
                          src={previewUrls[index]}
                          className="preview-video"
                          controls
                        />
                        <button
                          className="remove-file-btn"
                          onClick={() => handleRemoveFile(index)}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="preview-file-container">
                        <div className="file-icon">📄</div>
                        <span className="file-name">{file.name}</span>
                        <button
                          className="remove-file-btn"
                          onClick={() => handleRemoveFile(index)}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </article>
      )}
    </article>
  );
};

export default CreatePost;
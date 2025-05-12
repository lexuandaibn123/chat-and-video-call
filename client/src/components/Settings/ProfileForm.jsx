import { useState, useEffect } from "react";
import { infoApi } from "../../api/auth";

const ProfileForm = () => {
  const [userInfo, setUserInfo] = useState({
    id: "",
    fullName: "",
    email: ""
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        setLoading(true);
        const response = await infoApi();
        
        if (response.success && response.userInfo) {
          // Cập nhật state với thông tin người dùng từ API
          console.log("Thông tin người dùng từ API:", response.userInfo);
          
          // Chỉ hiển thị các trường có trong response
          setUserInfo({
            id: response.userInfo.id || "",
            fullName: response.userInfo.fullName || "",
            email: response.userInfo.email || ""
          });
        } else {
          setError("Không thể lấy thông tin người dùng");
        }
      } catch (err) {
        setError(err.message || "Đã xảy ra lỗi khi lấy thông tin người dùng");
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  if (loading) {
    return <div className="loading">Đang tải thông tin...</div>;
  }

  if (error) {
    return <div className="error-message">Lỗi: {error}</div>;
  }

  return (
    <form className="account-details">
      <h4>Thông tin cá nhân</h4>
      
      <div className="form-group">
        <label htmlFor="id">ID người dùng</label>
        <input
          type="text"
          id="id"
          name="id"
          className="form-input"
          value={userInfo.id}
          readOnly
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="fullName">Tên người dùng</label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          className="form-input"
          value={userInfo.fullName}
          readOnly
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          className="form-input"
          value={userInfo.email}
          readOnly
        />
      </div>
    </form>
  );
};

export default ProfileForm;
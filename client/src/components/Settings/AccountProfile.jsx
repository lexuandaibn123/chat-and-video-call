import { useEffect, useState } from "react";
import { infoApi } from "../../api/auth";
import defaultUserAvatar from "../../assets/images/avatar_male.jpg";

const AccountProfile = () => {
  const [userInfo, setUserInfo] = useState({
    fullName: "",
    email: "",
    avatar: ""
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        setLoading(true);
        const response = await infoApi();

        if (response.success && response.userInfo) {
          setUserInfo({
            fullName: response.userInfo.fullName || "",
            email: response.userInfo.email || "",
            avatar: response.userInfo.avatar || "" // Ensure avatar is set
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
    <div className="account-header">
      <div className="account-avatar">
        <img src={userInfo.avatar || defaultUserAvatar} alt="Profile" />
        {/* <button className="change-avatar-btn">
          <i className="fas fa-camera icon"></i>
        </button> */}
      </div>
      <div className="account-info">
        <h3>{userInfo.fullName}</h3>
        <p>{userInfo.email}</p>
      </div>
    </div>
  );
};

export default AccountProfile;
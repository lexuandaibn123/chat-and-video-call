import { useState } from "react";
import { useNavigate } from "react-router-dom"; // cần cho điều hướng
import AccountProfile from "./AccountProfile";
import AccountOptions from "./AccountOptions";
import ProfileForm from "./ProfileForm";
import AvatarForm from "./AvatarForm";
import PasswordForm from "./PasswordForm";
import { logoutApi } from '../../api/auth';

const AccountSettings = () => {
  const [activeOption, setActiveOption] = useState("profile");
  const navigate = useNavigate(); // hook dùng để chuyển trang

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Do you really want to log out?");
    if (confirmLogout) {
        try {
            await logoutApi();
        } catch (error) {
            console.error("Logout API failed:", error);
        } finally {
            localStorage.removeItem('access_token');
            navigate('/auth', { replace: true });
        }
    }
  };

  return (
    <section className="settings-form">
      <div className="account-section">
        <AccountProfile />
        <AccountOptions activeOption={activeOption} setActiveOption={setActiveOption} />
        
        {activeOption === "profile" && <ProfileForm />}
        {activeOption === "avatar" && <AvatarForm />}
        {activeOption === "password" && <PasswordForm />}

        {/* Nút Logout */}
        <div className="logout-wrapper">
          <button className="logout-button" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </div>
    </section>
  );
};

export default AccountSettings;

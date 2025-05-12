const AccountOptions = ({ activeOption, setActiveOption }) => {
  return (
    <div className="account-options">
      <button 
        className={`account-option-btn ${activeOption === "profile" ? "active" : ""}`}
        onClick={() => setActiveOption("profile")}
      >
        <i className="fas fa-user icon"></i>
        <span>Thông tin cá nhân</span>
      </button>
      <button 
        className={`account-option-btn ${activeOption === "avatar" ? "active" : ""}`}
        onClick={() => setActiveOption("avatar")}
      >
        <i className="fas fa-image icon"></i>
        <span>Đổi ảnh đại diện</span>
      </button>
      <button 
        className={`account-option-btn ${activeOption === "password" ? "active" : ""}`}
        onClick={() => setActiveOption("password")}
      >
        <i className="fas fa-lock icon"></i>
        <span>Đổi mật khẩu</span>
      </button>
    </div>
  )
}

export default AccountOptions;
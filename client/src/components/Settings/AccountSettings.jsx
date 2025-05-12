import { useState } from "react";
import AccountProfile from "./AccountProfile";
import AccountOptions from "./AccountOptions";
import ProfileForm from "./ProfileForm";
import AvatarForm from "./AvatarForm";
import PasswordForm from "./PasswordForm";

const AccountSettings = () => {
  const [activeOption, setActiveOption] = useState("profile")
  
  return (
    <section className="settings-form">
      <div className="account-section">
        <AccountProfile />
        <AccountOptions activeOption={activeOption} setActiveOption={setActiveOption} />
        
        {activeOption === "profile" && <ProfileForm />}
        {activeOption === "avatar" && <AvatarForm />}
        {activeOption === "password" && <PasswordForm />}
      </div>
    </section>
  )
}

export default AccountSettings;
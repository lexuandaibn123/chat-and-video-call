const SettingsSidebar = ({ activeTab, setActiveTab }) => {
  return (
    <aside className="settings-sidebar">
      <ul>
        <li className={activeTab === "appearance" ? "active" : ""} onClick={() => setActiveTab("appearance")}>
          Appearance
        </li>
        <li className={activeTab === "account" ? "active" : ""} onClick={() => setActiveTab("account")}>
          Account
        </li>
      </ul>
    </aside>
  )
}

export default SettingsSidebar;
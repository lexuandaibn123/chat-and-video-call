import { useState } from "react";
import Sidebar from "../components/Settings/Sidebar";
import SearchBar from "../components/Settings/SearchBar";
import SettingsHeader from "../components/Settings/SettingsHeader";
import SettingsSidebar from "../components/Settings/SettingsSidebar";
import AppearanceSettings from "../components/Settings/AppearanceSettings";
import AccountSettings from "../components/Settings/AccountSettings";
import "../components/Settings/styles.scss";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("appearance");
  const [theme, setTheme] = useState("light");
  const [fontSize, setFontSize] = useState("medium");
  const [language, setLanguage] = useState("English");

  return (
      <section className="content-area">

        <section className="settings-container">
          <SettingsHeader />
          <h2 className="settings-subheader">Interface Settings</h2>

          <section className="settings-content">
            <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            {activeTab === "appearance" ? (
              <AppearanceSettings 
                theme={theme}
                setTheme={setTheme}
                fontSize={fontSize}
                setFontSize={setFontSize}
                language={language}
                setLanguage={setLanguage}
              />
            ) : (
              <AccountSettings />
            )}
          </section>
        </section>
      </section>
  )
}

export default SettingsPage;
const AppearanceSettings = ({ theme, setTheme, fontSize, setFontSize, language, setLanguage }) => {
  return (
    <section className="settings-form">
      <div className="form-group">
        <label>Theme</label>
        <div className="theme-options">
          <button
            className={`theme-option ${theme === "light" ? "active" : ""}`}
            onClick={() => setTheme("light")}
          >
            Light
          </button>
          <button
            className={`theme-option dark ${theme === "dark" ? "active" : ""}`}
            onClick={() => setTheme("dark")}
          >
            Dark
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Font Size</label>
        <div className="font-options">
          <button
            className={`font-option ${fontSize === "small" ? "active" : ""}`}
            onClick={() => setFontSize("small")}
          >
            Small
          </button>
          <button
            className={`font-option ${fontSize === "medium" ? "active" : ""}`}
            onClick={() => setFontSize("medium")}
          >
            Medium
          </button>
          <button
            className={`font-option ${fontSize === "large" ? "active" : ""}`}
            onClick={() => setFontSize("large")}
          >
            Large
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Language</label>
        <select className="language-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="English">English</option>
          <option value="French">French</option>
          <option value="Spanish">Spanish</option>
          <option value="German">German</option>
          <option value="Japanese">Japanese</option>
        </select>
      </div>

      <button className="save-button">Save Changes</button>
    </section>
  )
}

export default AppearanceSettings
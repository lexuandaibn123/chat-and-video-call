const Sidebar = () => {
  return (
    <nav className="sidebar">
      <div className="profile">
        <img src="/placeholder.svg?height=60&width=60" alt="Profile" className="avatar" />
      </div>

      <ul className="nav-links">
        <li>
          <a href="#">
            <i className="fas fa-home icon"></i>
          </a>
        </li>
        <li>
          <a href="#">
            <i className="fas fa-comment-dots icon"></i>
          </a>
        </li>
        <li>
          <a href="#">
            <i className="fas fa-bell icon"></i>
          </a>
        </li>
        <li className="active">
          <a href="#">
            <i className="fas fa-cog icon"></i>
          </a>
        </li>
        <li>
          <a href="#">
            <i className="fas fa-file-alt icon"></i>
          </a>
        </li>
      </ul>
    </nav>
  )
}

export default Sidebar;
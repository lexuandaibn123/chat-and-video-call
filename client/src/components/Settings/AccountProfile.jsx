// src/components/AccountProfile.jsx
import { useEffect, useState } from "react";
import { infoApi } from "../../api/auth";
import { updateFullName } from "../../api/setting";
import defaultUserAvatar from "../../assets/images/avatar_male.jpg";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AccountProfile = () => {
  const [userInfo, setUserInfo] = useState({
    fullName: "",
    email: "",
    avatar: ""
  });
  const [loading, setLoading] = useState(true);

  // edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        setLoading(true);
        const response = await infoApi();

        if (response.success && response.userInfo) {
          setUserInfo({
            fullName: response.userInfo.fullName || "",
            email: response.userInfo.email || "",
            avatar: response.userInfo.avatar || ""
          });
        } else {
          toast.error("Unable to load user information.");
        }
      } catch (err) {
        toast.error(err.message || "An error occurred while fetching user info.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  // Start editing
  const startEdit = () => {
    setEditedName(userInfo.fullName);
    setIsEditing(true);
  };

  // Cancel editing
  const cancelEdit = () => {
    setIsEditing(false);
  };

  // Save updated name
  const handleSave = async () => {
    if (!editedName.trim()) {
      toast.warn("Name cannot be empty.");
      return;
    }

    try {
      setIsSaving(true);
      const res = await updateFullName(editedName.trim());

      if (res.success) {
        const newName = res.userInfo?.fullName || editedName.trim();
        setUserInfo((u) => ({ ...u, fullName: newName }));
        toast.success("Name updated successfully!");
        setIsEditing(false);
      } else {
        toast.error(res.message || "Failed to update name.");
      }
    } catch (err) {
      toast.error(err.message || "An error occurred while saving name.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading user information…</div>;
  }

  return (
    <>
      <div className="account-header">
        <div className="account-avatar">
          <img src={userInfo.avatar || defaultUserAvatar} alt="Profile" />
        </div>

        <div className="account-info">
          <div className="name-row">
            {isEditing ? (
              <>
                <input
                  type="text"
                  className="name-input"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  disabled={isSaving}
                  placeholder="Enter your name"
                />
                <button
                  className="btn save-btn"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving…" : "Save"}
                </button>
                <button
                  className="btn cancel-btn"
                  onClick={cancelEdit}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h3 className="display-name">{userInfo.fullName}</h3>
                <button
                  className="edit-btn"
                  onClick={startEdit}
                  title="Edit name"
                >
                  <i className="fas fa-edit" />
                </button>
              </>
            )}
          </div>

          <p className="email">{userInfo.email}</p>
        </div>
      </div>

      {/* Toast container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        pauseOnHover
      />
    </>
  );
};

export default AccountProfile;

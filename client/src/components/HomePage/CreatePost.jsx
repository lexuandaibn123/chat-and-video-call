import { useEffect, useState } from "react";
import { createPost } from "../../api/feeds";
import { infoApi } from "../../api/auth";

const CreatePost = () => {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [avt, setAvt] = useState(null);

  useEffect(() => {
    const getInfo = async () => {
      try {
        const response = await infoApi();
        if (response.success && response.userInfo) {
          setAvt(response.userInfo.avatar);
        } else {
          console.log("Error: ", response.error);
        }
      } catch (error) {
        console.error(error);
      }
    };
    getInfo();
  }, []);

  const handlePost = async () => {
    if (!content.trim()) {
      setError("Post content cannot be empty");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      // Call API to create a post
      const response = await createPost("text", content.trim());

      if (response.success) {
        // Create properly formatted post object from API response
        // const newPost = {
        //   id: response.post._id || "",
        //   avatar: response.post.poster?.avatar || "/api/placeholder/40/40",
        //   name: response.post.poster?.fullName || "Anonymous",
        //   content: response.post.content || [],
        //   react: response.post.reacts || [],
        //   comment: response.post.comments || [],
        //   time: formatTimestamp(response.post.datetime_created) || "Just now",
        // };

        // Pass the new post to parent component
        // onPostCreate(newPost);
        console.log("Post Successfully!");
        // Clear the input field
        setContent("");
      } else {
        setError(response.message || "Failed to create post");
      }
      alert("Post successfully!");
    } catch (error) {
      console.error("Failed to post:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to format timestamp

  return (
    <article className="create-post">
      <header className="create-post-header">
        <img src={avt} alt="Profile" className="profile-image" />
        <input
          type="text"
          placeholder="Share what's on your mind..."
          className="create-post-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </header>
      <footer className="create-post-footer">
        <button className="photo-video-button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <span>Photo/Video</span>
        </button>
        <button className="post-button" onClick={handlePost}>
          Post
        </button>
      </footer>
    </article>
  );
};

export default CreatePost;
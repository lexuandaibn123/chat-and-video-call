import { use, useEffect, useState } from "react";
import { infoApi } from "../../api/auth";
import { editPost, deletePost, likePost, unlikePost } from "../../api/feeds";
import PostComments from "./PostComments";

const PostItem = ({ postId, avatar, name, id_poster, content, isDeleted, isEdited, reacts, comments, datetime_created, last_updated }) => {
  // Function to check if post has images
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content[0].data);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [user_id, setUserId] = useState("");
  // const [postComments, setPostComments] = useState(comment);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false); 
  const [likeCount, setLikeCount] = useState(0);
  const [positionLiked, setPositionLiked] = useState(-1);
  const [visibleComments, setVisibleComments] = useState(3);
  const [userInfo, setUserInfo] = useState({});

  // const handleLike = () => {
  //   if (isLiked) {
  //     setLikeCount(likeCount - 1)
  //   } else {
  //     setLikeCount(likeCount + 1)
  //   }
  //   setIsLiked(!isLiked)
  // }
  useEffect(() => {
    const fetchUser = async () => {
      const response = await infoApi();
      if (response.success) {
        setUserId(response.userInfo.id);
        setUserInfo(response.userInfo);
      } else {
        console.log("can't get user info!");
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    let count = 0;
    let liked = false;
    reacts.forEach((react, index) => {
      if (react.react.type !== "unreacted") {
        count++;
        if (react.react.userId._id === user_id) {
          liked = true;
          setPositionLiked(index);
        }
      }
    });
    setLikeCount(count);
    setIsLiked(liked);
  }, [reacts, user_id]);

  const handleEdit = () => {
    setIsEditing(true);
    setIsMenuOpen(false);
  }

  const handleSaveEdit = async () => {
    if (editedContent.trim() === "") {
      alert("Post content cannot be empty");
      setEditedContent(content[0].data);
      setIsEditing(false);
      return;
    }
    if (editedContent === content[0].data) {
      alert("No changes made to the post");
      setIsEditing(false);
      return;
    }
    try {
      const response = await editPost(postId, editedContent);
      if (response.success) {
        alert("Post updated successfully!");
        setEditedContent(editedContent);
        isEdited = response.data.isEdited;  
      } else {
        alert("Failed to update post");
      }
    } catch (error) {
      console.error("Error updating post:", error); 
    }
    setIsEditing(false);
  }

  const handleCancelEdit = () => {
    setEditedContent(content[0].data);
    setIsEditing(false);
  }

  const handleDelete = async () => {
  if (window.confirm("Are you sure you want to delete this post?")) {
    try {
      const response = await deletePost(postId);
      if (response.success) {
        alert("Post deleted successfully!");
        // Có thể gọi callback từ props để xóa post khỏi danh sách cha
        // hoặc reload lại danh sách bài đăng
      } else {
        alert("Failed to delete post");
      }
    } catch (error) {
      alert("Error deleting post!");
      console.error(error);
    }
    setIsMenuOpen(false);
  }
};

  const handleLikePost = async () => { 
    try {
      const response = await likePost(postId);  
      if (response.success) {
        setIsLiked(true);
        setLikeCount(likeCount + 1);  
      } else {
        alert("Failed to like post", response.message || response.error);
      }   
    } catch (error) {
      console.error("Error liking post:", error); 
  }
}

const handleunlikePost = async () => {
  try { 
    const response = await unlikePost(postId);
    if (response.success) {
      setIsLiked(false);
      setLikeCount(likeCount - 1);
    } else {
      alert("Failed to unlike post", response.message || response.error);
    }
  } catch (error) {
    console.error("Error unliking post:", error);
  }
}

  // const handleAddComment = (e) => {
  //   e.preventDefault()
  //   if (newComment.trim() === "") return

  //   const newCommentObj = {
  //     id: `c${Date.now()}`,
  //     name: "You",
  //     time: "Just now",
  //     content: newComment,
  //     avatar: "/placeholder.svg?height=32&width=32",
  //   }

  //   setPostComments([...postComments, newCommentObj])
  //   setNewComment("")
  // }

  // const displayedComments = comments.slice(-visibleComments); // Lấy N comment cuối cùng

  // const hasMoreComments = comments.length > visibleComments;

  // const handleShowMoreComments = () => setVisibleComments((prev) => prev + 3);
  // const handleShowLessComments = () => setVisibleComments(3);

  return (
    <article className="post">
      <header className="post-header">
        <div className="post-author">
          <img
            src={avatar}
            alt={name}
            width="40"
            height="40"
            className="profile-image"
          />
          <div className="post-author-info">
            <h3 className="post-author-name">{name}</h3>
            <div className="post-meta">
              <span className="post-time">{datetime_created}</span>
            </div>
          </div>
        </div>
        {id_poster === user_id && (
          <div className="post-menu">
            <button
              className="post-menu-button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <i className="fas fa-ellipsis-v"></i>
            </button>
            {isMenuOpen && (
              <div className="post-menu-dropdown">
                <button className="post-menu-item" onClick={handleEdit}>
                  <i className="fas fa-edit"></i>
                  <span>Edit</span>
                </button>
                <button
                  className="post-menu-item post-menu-item-delete" onClick={handleDelete}
                >
                  <i className="fas fa-trash-alt"></i>
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <section className="post-content">
        {isEditing ? (
          <div className="post-edit">
            <textarea
              className="post-edit-textarea"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
            />
            <div className="post-edit-actions">
              <button className="post-edit-cancel" onClick={handleCancelEdit}>
                Cancel
              </button>
              <button className="post-edit-save" onClick={handleSaveEdit}>
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className="post-text">{editedContent}</p>
        )}

        {/* Hiển thị tất cả ảnh nếu có */}
        {content && Array.isArray(content) && content.filter(item => item.type === "image").length > 0 && (
          <div className="post-images">
            {content.filter(item => item.type === "image").map((img, idx) => (
              <img
                key={idx}
                src={img.data}
                alt={`Project image ${idx + 1}`}
                className="post-image"
                onClick={() => window.open(img.data, "_blank")}
              />
            ))}
          </div>
        )}

        <div className="post-stats">
          {reacts.length > 0 && (
            <>
              <span className={`like-icon ${isLiked ? "liked" : ""}`}>❤</span>
              <span>{likeCount} {(likeCount > 1) ? `likes` : `like`}</span>
            </>
          )}
          {comments.length > 0 && (
            <button
              className="post-comments-count"
              onClick={() => setShowComments(!showComments)}
            >
              {comments.length} comments
            </button>
          )}
        </div>
      </section>

      <footer className="post-footer">
        <button className={`post-action-button ${isLiked ? "liked" : ""}`} 
        onClick={isLiked ? handleunlikePost : handleLikePost}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={isLiked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <span>Like</span>
        </button>
        <button
          className={`post-action-button ${showComments ? "active" : ""}`}
          onClick={() => setShowComments(!showComments)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          <span>Comment</span>
        </button>
      </footer>
      {showComments && (
        <PostComments
          postId={postId}
          avatar={userInfo.avatar}
          name={userInfo.fullName}
          comments={comments}
          visibleComments={visibleComments}
          setVisibleComments={setVisibleComments}
          newComment={newComment}
          setNewComment={setNewComment}
        />
      )}
    </article>
  );
};

export default PostItem;
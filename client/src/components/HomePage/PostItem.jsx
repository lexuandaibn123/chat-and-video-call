import { useEffect, useState } from "react";
import { infoApi } from "../../api/auth";
import { editPost, deletePost } from "../../api/feeds";

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
  // const [likeCount, setLikeCount] = useState(react);

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
      } else {
        console.log("can't get user info!");
      }
    };
    fetchUser();
  }, []);

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

        {(content.length > 1 && content[1].type === "image") && (
          <div className="post-images">
            <img
              src={content[1].data}
              alt="Project image 1"
              width="600"
              height="400"
              className="post-image"
            />
          </div>
        )}

        <div className="post-stats">
          {reacts.length > 0 && (
            <>
              <span className={`like-icon ${isLiked ? "liked" : ""}`}>❤</span>
              <span>{reacts.length} likes</span>
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
        <button
          className={`post-action-button ${isLiked ? "liked" : ""}`}
        >
          <i className={`${isLiked ? "fas" : "far"} fa-heart`}></i>
          <span>Like</span>
        </button>
        <button
          className={`post-action-button ${showComments ? "active" : ""}`}
          onClick={() => setShowComments(!showComments)}
        >
          <i className="far fa-comment"></i>
          <span>Comment</span>
        </button>
      </footer>

      {showComments && (
        <div className="post-comments">
          {postComments.map((comment) => (
            <div key={comment.id} className="comment">
              <div className="comment-avatar">
                <img
                  src={comment.avatar || "/placeholder.svg"}
                  alt={comment.name}
                  width="32"
                  height="32"
                  className="profile-image"
                />
              </div>
              <div className="comment-content">
                <div className="comment-header">
                  <span className="comment-name">{comment.name}</span>
                  <span className="comment-role">{comment.role}</span>
                  <span className="comment-time">{comment.time}</span>
                </div>
                <p className="comment-text">{comment.content}</p>
              </div>
            </div>
          ))}

          <form className="comment-form" onSubmit={handleAddComment}>
            <div className="comment-avatar">
              <img
                src="/placeholder.svg?height=32&width=32"
                alt="Your avatar"
                width="32"
                height="32"
                className="profile-image"
              />
            </div>
            <div className="comment-input-container">
              <input
                type="text"
                className="comment-input"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button type="submit" className="comment-submit">
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </form>
        </div>
      )}
    </article>
  );
};

export default PostItem;
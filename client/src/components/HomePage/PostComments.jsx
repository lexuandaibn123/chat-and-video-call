import React from "react";

const PostComments = ({
    postId,
    avatar,
    name,
  comments,
  visibleComments = 3,
  setVisibleComments,
  newComment = "",
  setNewComment,
}) => {
  const displayedComments = comments.slice(-visibleComments);
  const hasMoreComments = comments.length > visibleComments;

  const handleShowMoreComments = () => setVisibleComments((prev) => prev + 3);
  const handleShowLessComments = () => setVisibleComments(3);
  const handleAddComment = (e) => {
    e.preventDefault();
    if (newComment.trim() === "") return;
    // Xử lý thêm comment ở đây nếu cần
    setNewComment("");
  };

  return (
    <div className="post-comments">
      {displayedComments.map((comment, index) => (
        <div key={index} className="comment">
          <div className="comment-avatar">
            <img
              src={comment.comment.userId.avatar}
              alt={comment.comment.userId.name}
              className="profile-image"
            />
          </div>
          <div className="comment-content-wrapper">
            <div className="comment-content">
              <div className="comment-header">
                <span className="comment-name">{comment.name}</span>
                <span className="comment-time">{comment.time}</span>
              </div>
              <p className="comment-text">{comment.comment.content.text.data}</p>
            </div>
          </div>
        </div>
      ))}

      {hasMoreComments && (
        <button className="show-more-comments" onClick={handleShowMoreComments}>
          <i className="fas fa-chevron-down"></i>
          <span>
            Show more comments ({comments.length - visibleComments} more)
          </span>
        </button>
      )}

      {visibleComments > 3 && (
        <button className="show-less-comments" onClick={handleShowLessComments}>
          <span>Show fewer comments</span>
        </button>
      )}

      <form className="comment-form" onSubmit={handleAddComment}>
        <div className="comment-avatar">
          <img
            src={avatar}
            alt={name}
            width={32}
            height={32}
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
  );
};

export default PostComments;
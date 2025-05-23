import { use, useState } from "react";
import { commentPost } from "../../api/feeds";

const PostComments = ({
    postId,
    avatar,
    name,
    userId,
  comments,
  visibleComments = 3,
  setVisibleComments,
  newComment = "",
  setNewComment,
}) => {
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedCommentContent, setEditedCommentContent] = useState("");

  const displayedComments = comments.slice(-visibleComments);
  const hasMoreComments = comments.length > visibleComments;

  const handleShowMoreComments = () => setVisibleComments((prev) => prev + 3);
  const handleShowLessComments = () => setVisibleComments(3);
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (newComment.trim() === "") return;
    try {
      const response = await commentPost(postId, newComment);
      if (response.success) {
        setVisibleComments((prev) => prev + 1);
        setNewComment("");
      } else {
        console.error("Failed to add comment:", response.message);
      }
    } catch (error) { 
      console.error("Error adding comment:", error);
    }
    setNewComment("");
  };

  // Dummy handlers for edit/delete (implement logic as needed)
  const handleEditComment = (id) => {
    setEditingCommentId(id);
    const comment = comments.find(c => c === id);
    setEditedCommentContent(comment?.content || "");
  };
  const handleCancelCommentEdit = () => {
    setEditingCommentId(null);
    setEditedCommentContent("");
  };
  const handleSaveCommentEdit = () => {
    // Implement save logic here
    setEditingCommentId(null);
    setEditedCommentContent("");
  };
  const handleDeleteComment = (id) => {
    // Implement delete logic here
  };

  return (
    <div className="post-comments">
      {displayedComments.map((comment, index) => (
        <div key={index} className="comment">
          <div className="comment-avatar">
            <img
              src={comment.comment.userId.avatar}
              alt={comment.comment.userId.fullName}
              className="profile-image"
            />
          </div>
          <div className="comment-content-wrapper">
            <div className="comment-content">
              <div className="comment-header">
                <span className="comment-name">{comment.comment.userId.fullName}</span>
                <span className="comment-time">{comment.comment.datetime_created}</span>
              {comment.comment.userId._id === userId  && (
                      <div className="comment-actions">
                        <button
                          className="comment-action-button"
                          onClick={() => handleEditComment(comment.comment._id)}
                          aria-label="Edit comment"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          className="comment-action-button comment-delete-button"
                          onClick={() => handleDeleteComment(comment.comment._id)}
                          aria-label="Delete comment"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    )}
                  </div>

                  {editingCommentId === comment.comment._id ? (
                    <div className="comment-edit">
                      <textarea
                        className="comment-edit-textarea"
                        value={editedCommentContent}
                        onChange={(e) => setEditedCommentContent(e.target.value)}
                      />
                      <div className="comment-edit-actions">
                        <button className="comment-edit-cancel" onClick={handleCancelCommentEdit}>
                          Cancel
                        </button>
                        <button className="comment-edit-save" onClick={handleSaveCommentEdit}>
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="comment-text">{comment.comment.content.text.data}</p>
                  )}

                  <div className="comment-footer">
                    <button className="comment-reply-button">
                      <i className="fas fa-reply"></i>
                      <span>Reply</span>
                    </button>

                    {comment.comment.replyToCommentId && (
                      <button className="comment-view-replies" onClick={() => toggleReplies(comment.comment._id)}>
                        {expandedReplies[comment.id] ? (
                          <>
                            <i className="fas fa-chevron-up"></i>
                            <span>Hide replies</span>
                          </>
                        ) : (
                          <>
                            <i className="fas fa-chevron-down"></i>
                            <span>View {comment.replies.length} replies</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
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
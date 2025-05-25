import { useEffect, useState } from "react";
import { commentPost, getCommentsByPostId, editComment, deleteComment, replyComment } from "../../api/feeds";
import { toast } from "react-toastify";

const PostComments = ({
  postId,
  avatar,
  name,
  userId,
  visibleComments = 3,
  setVisibleComments,
  newComment = "",
  setNewComment,
}) => {
  const [comments, setComments] = useState([]);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedCommentContent, setEditedCommentContent] = useState("");
  const [expandedReplies, setExpandedReplies] = useState({});
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);
  const [newReply, setNewReply] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [repliesMap, setRepliesMap] = useState({}); // { [commentId]: [replyObj, ...] }

  // Đặt fetchComments ở đầu component, trước useEffect
  const fetchComments = async () => {
    try {
      const response = await getCommentsByPostId(postId);
      if (response.success) {
        const rootComments = [];
        const repliesMap = {};
        for (const comment of response.data) {
          if (!comment.replyToCommentId) {
            rootComments.push(comment);
          } else {
            const parentId = comment.replyToCommentId._id || comment.replyToCommentId;
            if (!repliesMap[parentId]) {
              repliesMap[parentId] = [];
            }
            repliesMap[parentId].push(comment);
          }
        }
        setComments(rootComments);
        setRepliesMap(repliesMap);
        setVisibleComments(3);
      } else {
        console.error("Failed to fetch comments:", response.message);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  // Sử dụng fetchComments trong useEffect
  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line
  }, [postId]);

  // Hiển thị N comment mới nhất (ở cuối mảng)
  const displayedComments = comments.slice(Math.max(comments.length - visibleComments, 0));
  const hasMoreComments = comments.length > visibleComments;

  const handleShowMoreComments = () => setVisibleComments((prev) => prev + 3);
  const handleShowLessComments = () => setVisibleComments(3);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return; // Không thêm comment rỗng
    try {
      const response = await commentPost(postId, newComment);
      if (response.success) {
        setNewComment("");
        // Reload comments
        const response = await getCommentsByPostId(postId);
        if (response.success) setComments(response.data);
        setVisibleComments((prev) => prev + 1);
      } else {
        console.error("Failed to add comment:", response.message);
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleEditComment = (id) => {
    setEditingCommentId(id);
    // Tìm trong comments (gốc)
    let comment = comments.find(c => c._id === id);
    // Nếu không thấy, tìm trong repliesMap
    if (!comment) {
      for (const replies of Object.values(repliesMap)) {
        const reply = replies.find(r => r._id === id);
        if (reply) {
          comment = reply;
          break;
        }
      }
    }
    setEditedCommentContent(comment?.content?.text?.data || "");
  };

  const handleCancelCommentEdit = () => {
    setEditingCommentId(null);
    setEditedCommentContent("");
  }; 

  const handleSaveCommentEdit = async () => {
    // Sửa lại: kiểm tra editedCommentContent thay vì newComment
    if (editedCommentContent.trim() === "") {
      alert("Comment content cannot be empty.");
      return;
    }
    try {
      const response = await editComment(editingCommentId, editedCommentContent);
      if (response.success) {
        setEditingCommentId(null);
        setEditedCommentContent("");
        // Reload comments
        const response = await getCommentsByPostId(postId);
        if (response.success) setComments(response.data);
      } else {
        console.error("Failed to edit comment:", response.message || response.error);
      }
    } catch (error) {
      console.error("Error editing comment:", error);
    }
  };

  const handleDeleteComment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      const response = await deleteComment(id);
      if (response.success) {
        toast.success(response.message);
        setEditingCommentId(null);
        await fetchComments(); // Luôn fetch lại comments sau khi xóa, kể cả reply
      } else {
        console.error("Failed to delete comment:", response.message || response.error);
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  // Hàm fetch replies cho một comment
  const fetchReplies = async (commentId, replyIds) => {
    // Giả sử bạn có API getRepliesByIds (nếu không, cần implement ở backend)
    // Nếu backend chỉ trả về id, bạn cần fetch từng reply hoặc batch fetch
    try {
      // Ví dụ: const res = await getRepliesByIds(replyIds);
      // if (res.success) setRepliesMap(prev => ({ ...prev, [commentId]: res.data }));
      // Nếu chưa có API, tạm thời để rỗng hoặc log ra replyIds
      setRepliesMap(prev => ({ ...prev, [commentId]: replyIds }));
    } catch (error) {
      console.error("Error fetching replies:", error);
    }
  };

  // Khi expand replies, fetch replies nếu chưa có
  const toggleReplies = (commentId, replyIds) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
    if (!repliesMap[commentId] && replyIds && replyIds.length > 0) {
      fetchReplies(commentId, replyIds);
    }
  };

  const handleReplyClick = async (commentId) => {
    setReplyingToCommentId(commentId);
    setNewReply("");
  };

  const handleAddReply = async (commentId, e) => {
    console.log(postId, newReply, commentId);
    e.preventDefault();
    if (!newReply.trim()) return;
    setIsSubmittingReply(true);
    try {
      const response = await replyComment(postId, newReply, commentId);
      if (response.success) {
        setNewReply("");
        setReplyingToCommentId(null);
        await fetchComments(); // Gọi lại để cập nhật toàn bộ comments và replies
      } else {
        toast.error("Failed to add reply: " + (response.message || "Unknown error"));
      }
    } catch (error) {
      toast.error("Error adding reply: " + error.message);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Hàm render replies dạng cây
  const RenderReplies = ({ parentId }) => {
    const replies = repliesMap[parentId] || [];
    return replies.map((reply) => (
      <div key={reply._id} className="reply">
        <div className="reply-avatar">
          <img
            src={reply.userId?.avatar}
            alt={reply.userId?.fullName}
            className="profile-image"
          />
        </div>
        <div className="reply-content">
          <div className="reply-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="reply-name">{reply.userId?.fullName || name}</span>
            <span className="reply-time">{new Date(reply.datetime_created).toLocaleString()}</span>
            {reply.userId?._id === userId && (
              <div className="reply-actions" style={{ display: 'inline-flex', gap: '4px' }}>
                <button className="reply-action-button" onClick={() => handleEditComment(reply._id)} aria-label="Edit reply">
                  <i className="fas fa-edit"></i>
                </button>
                <button className="reply-action-button reply-delete-button" onClick={() => handleDeleteComment(reply._id)} aria-label="Delete reply">
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            )}
          </div>
          <p className="reply-text">{reply.content?.text?.data || ''}</p>
        </div>
      </div>
    ));
  };

  return (
  <div className="post-comments">
    {displayedComments.map((comment, index) => (
      <div key={index} className="comment">
        <div className="comment-main">
          <div className="comment-avatar">
            <img
              src={comment.userId.avatar}
              alt={comment.userId.fullName}
              className="profile-image"
            />
          </div>
          <div className="comment-content-wrapper">
            <div className="comment-content">
              <div className="comment-header">
                <span className="comment-name">{comment.userId.fullName}</span>
                <span className="comment-time">{new Date(comment.datetime_created).toLocaleString()}</span>
                {comment.userId._id === userId && (
                  <div className="comment-actions">
                    <button
                      className="comment-action-button"
                      onClick={() => handleEditComment(comment._id)}
                      aria-label="Edit comment"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      className="comment-action-button comment-delete-button"
                      onClick={() => handleDeleteComment(comment._id)}
                      aria-label="Delete comment"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                )}
              </div>

              {editingCommentId === comment._id ? (
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
                <p className="comment-text">{comment.content.text.data}</p>
              )}

              <div className="comment-footer">
                <button className="comment-reply-button" onClick={() => handleReplyClick(comment._id)}>
                  <i className="fas fa-reply"></i>
                  <span>Reply</span>
                </button>

                {Array.isArray(comment.replies) && comment.replies.length > 0 && (
                  <button className="comment-view-replies" onClick={() => toggleReplies(comment._id, comment.replies)}>
                    {expandedReplies[comment._id] ? (
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

        {/* Render replies nếu có */}
        {expandedReplies[comment._id] && repliesMap[comment._id] && (
          <div className="comment-replies">
            <RenderReplies parentId={comment._id} />
          </div>
        )}

        {/* Render form reply nếu đang trả lời comment này */}
        {replyingToCommentId === comment._id && (
          <form className="reply-form" onSubmit={(e) => handleAddReply(comment._id, e)}>
            <div className="reply-avatar">
              <img
                src={avatar}
                alt={name}
                width={28}
                height={28}
                className="profile-image"
              />
            </div>
            <div className="reply-input-container">
              <input
                type="text"
                className="reply-input"
                placeholder={`Reply to ${comment.userId.fullName}...`}
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                autoFocus
              />
              <div className="reply-input-actions">
                <button type="button" className="reply-cancel">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="reply-submit"
                  disabled={isSubmittingReply}
                >
                  {isSubmittingReply ? "Sending..." : "Reply"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    ))}

    {/* Phần còn lại giữ nguyên */}
    {hasMoreComments && (
      <button className="show-more-comments" onClick={handleShowMoreComments}>
        <i className="fas fa-chevron-down"></i>
        <span>
          Show more comments ({comments.length - visibleComments} more)
        </span>
      </button>
    )}

    {visibleComments > 3 && comments.length > 3 && (
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
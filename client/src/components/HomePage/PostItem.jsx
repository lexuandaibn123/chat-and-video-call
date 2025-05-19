import { useState } from "react";

const PostItem = ({ id, avatar, name, content, react, comment, time }) => {
  // Function to check if post has images
  const hasImages = () => {
    if (!content || !Array.isArray(content)) return false;
    return content.some(item => item.type === "image");
  };

  // Function to get text content
  const getTextContent = () => {
    if (!content || !Array.isArray(content)) return "";
    const textItems = content.filter(item => item.type === "text");
    return textItems.length > 0 ? textItems[0].data : "";
  };

  // Function to get image content
  const getImages = () => {
    if (!content || !Array.isArray(content)) return [];
    return content.filter(item => item.type === "image");
  };

  // Get images if they exist
  const postImages = getImages();
  
  return (
    <article className="post border rounded-lg shadow-sm p-4 mb-6 bg-white">
      <header className="post-header flex justify-between items-center mb-4">
        <div className="post-author flex items-center">
          <img
            src={avatar || "/api/placeholder/40/40"}
            alt={name || "Author"}
            className="profile-image w-10 h-10 rounded-full mr-3"
          />
          <div className="post-author-info">
            <h3 className="post-author-name font-semibold text-gray-800">{name}</h3>
            <div className="post-meta">
              <span className="post-time text-sm text-gray-500">{time}</span>
            </div>
          </div>
        </div>
        <button className="post-menu-button text-gray-500 hover:text-gray-700">
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
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="19" cy="12" r="1"></circle>
            <circle cx="5" cy="12" r="1"></circle>
          </svg>
        </button>
      </header>

      <section className="post-content mb-4">
        <p className="post-text mb-4 text-gray-700">
          {getTextContent()}
        </p>

        {postImages.length > 0 && (
          <div className="post-images grid gap-2">
            {postImages.map((image, index) => (
              <img
                key={index}
                src={image.data || "/api/placeholder/600/400"}
                alt={image.altText || `Image ${index + 1}`}
                className="post-image w-full rounded-lg"
              />
            ))}
          </div>
        )}

        <div className="post-stats flex items-center mt-4 text-sm text-gray-500">
          <span className="like-icon mr-1">❤</span>
          <span className="mr-4">{react?.length || 0} {react.length > 0 ? `reacts` : `react`}</span>
          <span className="post-comments-count">{comment?.length || 0} {comment.length > 0 ? `comments` : `comment`}</span>
        </div>
      </section>

      <footer className="post-footer flex border-t pt-3">
        <button className="post-action-button flex items-center mr-6 text-gray-600 hover:text-blue-600">
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
            className="mr-2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <span>React</span>
        </button>
        <button className="post-action-button flex items-center text-gray-600 hover:text-blue-600">
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
            className="mr-2"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          <span>Comment</span>
        </button>
      </footer>
    </article>
  );
};

export default PostItem;
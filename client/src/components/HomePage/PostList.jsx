import PostItem from "./PostItem";

const PostList = ({ posts }) => {
  return (
    <>
      {posts && posts.length > 0 ? (
        posts.map((post, index) => (
          <PostItem
            key={index}
            {...post}
          />
        ))
      ) : (
        <div className="no-posts text-center py-8 text-gray-500">
          No posts to display. Create a new post to get started.
        </div>
      )}
    </>
  );
};

export default PostList;
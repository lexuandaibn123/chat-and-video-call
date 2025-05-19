// src/pages/HomePage.jsx
import { useState, useEffect } from "react";
import CreatePost from "../components/HomePage/CreatePost";
import PostList from "../components/HomePage/PostList";
import "../components/HomePage/HomePage.scss";
import { getPosts } from "../api/feeds";

const HomePage = () => {
  // Sample data for posts
  // const [posts, setPosts] = useState([
  //   {
  //     id: 1,
  //     name: "Alex Morgan",
  //     role: "Product Designer",
  //     time: "2 hours ago",
  //     content: "Just finished an amazing project with the team! Here are some highlights from our latest design sprint. Really proud of what we've accomplished! 💯",
  //     likes: 24,
  //     comments: 12,
  //     hasImages: true,
  //   },
  //   {
  //     id: 2,
  //     name: "Emma Watson",
  //     role: "Product Manager",
  //     time: "5 hours ago",
  //     content: "Exciting news! We've just hit 1 million active users! 🎉 Thank you to our amazing community for your continued support and feedback. Here's to the next million! 🚀",
  //     likes: 0,
  //     comments: 0,
  //     hasImages: false,
  //   }
  // ]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avt, setAvt] = useState("");

  // Load posts on component mount
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await getPosts();
        if (response.success) {
          console.log("Get successfully!");
          setAvt(response.data[0].poster.avatar) || "";
          setPosts(
            response.data.map((p) => ({
              id: p._id || "",
              avatar: p.poster?.avatar || "/api/placeholder/40/40",
              name: p.poster?.fullName || "Anonymous",
              content: p.content || [],
              react: p.reacts || [],
              comment: p.comments || [],
              time: formatTimestamp(p.datetime_created) || "Just now",
            }))
          );
          // setPosts((prev) => [p, ...prev]);
        } else {
          console.log("can't get posts!");
        }
      } catch (error) {
        console.error("Failed to fetch posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // Handle new post created
  // const handlePostCreate = (newPost) => {
  //   setPosts((prev) => [newPost, ...prev]);
  // };

  // Helper: Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Just now";
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return "Just now";
    }
  };

  return (

    <main className="app-container">

      {/* Main Content */}
      <section className="main-content-">

        {/* Feed */}
        <section className="feed">
          <CreatePost avt={avt}/> {loading ? (
        <div className="text-center text-gray-500 py-6">Loading posts...</div>
      ) : (
        <PostList posts={posts} />
      )}
        </section>
      </section>
    </main>
  );
};

export default HomePage;
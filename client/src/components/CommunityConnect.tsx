import React, { useState, useEffect } from "react";
import {
  MessageCircle,
  ThumbsUp,
  Reply,
  Users,
  Plus,
  Loader,
  Send,
  X,
} from "lucide-react";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  increment,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";

interface CommunityPost {
  id: string;
  author: string;
  title: string;
  content: string;
  category: "question" | "tip" | "success" | "alert";
  timestamp: any;
  likes: number;
  replies: number;
}

interface ReplyType {
  id: string;
  author: string;
  content: string;
  timestamp: any;
}

const CommunityConnect: React.FC = () => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    category: "question" as CommunityPost["category"],
  });
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [activeReplyPost, setActiveReplyPost] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState<Record<string, ReplyType[]>>({});

  // Fetch posts
  useEffect(() => {
    const q = query(collection(db, "communityPosts"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPosts: CommunityPost[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<CommunityPost, "id">),
      }));
      setPosts(fetchedPosts);
    });
    return () => unsubscribe();
  }, []);

  // Auth listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Listen to replies for each post
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    posts.forEach((post) => {
      const repliesQuery = query(
        collection(db, "communityPosts", post.id, "replies"),
        orderBy("timestamp", "asc")
      );
      const unsub = onSnapshot(repliesQuery, (snapshot) => {
        const postReplies: ReplyType[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<ReplyType, "id">),
        }));
        setReplies((prev) => ({ ...prev, [post.id]: postReplies }));
      });
      unsubscribes.push(unsub);
    });
    return () => unsubscribes.forEach((unsub) => unsub());
  }, [posts]);

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert("You must be logged in to create a post.");
      return;
    }

    await addDoc(collection(db, "communityPosts"), {
      author:
        currentUser.displayName ||
        currentUser.email?.split("@")[0] ||
        "Anonymous Farmer",
      title: newPost.title,
      content: newPost.content,
      category: newPost.category,
      timestamp: serverTimestamp(),
      likes: 0,
      replies: 0,
    });
    setNewPost({ title: "", content: "", category: "question" });
    setShowNewPost(false);
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return alert("Please log in to like posts.");
    const postRef = doc(db, "communityPosts", postId);
    await updateDoc(postRef, { likes: increment(1) });
  };

  const handleAddReply = async (postId: string) => {
    if (!currentUser) return alert("Please log in to reply.");
    if (!replyText.trim()) return;

    await addDoc(collection(db, "communityPosts", postId, "replies"), {
      author:
        currentUser.displayName ||
        currentUser.email?.split("@")[0] ||
        "Anonymous",
      content: replyText,
      timestamp: serverTimestamp(),
    });

    const postRef = doc(db, "communityPosts", postId);
    await updateDoc(postRef, { replies: increment(1) });

    setReplyText("");
    setActiveReplyPost(null);
  };

  const getRelativeTime = (timestamp: any) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "question":
        return "bg-blue-100 text-blue-800";
      case "tip":
        return "bg-green-100 text-green-800";
      case "success":
        return "bg-yellow-100 text-yellow-800";
      case "alert":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredPosts =
    activeFilter === "all"
      ? posts
      : posts.filter((p) => p.category === activeFilter);

  const isPostDisabled = isLoadingAuth || !currentUser;
  const postButtonText = isLoadingAuth
    ? "Loading..."
    : !currentUser
    ? "Login to Post"
    : "New Post";

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 bg-white rounded-xl shadow-sm border border-gray-200 mt-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Users className="w-6 h-6 text-green-600" />
          <h3 className="text-xl font-bold text-gray-800">Community Connect</h3>
        </div>
        <button
          onClick={() => setShowNewPost(true)}
          disabled={isPostDisabled}
          className={`flex items-center space-x-2 px-4 py-2 text-white rounded-lg transition-colors ${
            isPostDisabled
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isLoadingAuth ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          <span>{postButtonText}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        {["all", "question", "tip", "success", "alert"].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeFilter === filter
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {filter === "all"
              ? "All Posts"
              : filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* New Post Form */}
      {showNewPost && !isPostDisabled && (
        <div className="mb-6 bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-4">Create New Post</h4>
          <form onSubmit={handleSubmitPost} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={newPost.category}
                onChange={(e) =>
                  setNewPost({
                    ...newPost,
                    category: e.target.value as CommunityPost["category"],
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="question">Question</option>
                <option value="tip">Farming Tip</option>
                <option value="success">Success Story</option>
                <option value="alert">Alert/Warning</option>
              </select>
            </div>
            <input
              type="text"
              value={newPost.title}
              onChange={(e) =>
                setNewPost({ ...newPost, title: e.target.value })
              }
              placeholder="What's your question or topic?"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <textarea
              rows={4}
              value={newPost.content}
              onChange={(e) =>
                setNewPost({ ...newPost, content: e.target.value })
              }
              placeholder="Share your thoughts..."
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Post
              </button>
              <button
                type="button"
                onClick={() => setShowNewPost(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {post.author ? post.author[0].toUpperCase() : "A"}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">{post.author}</h4>
                  <p className="text-sm text-gray-600">
                    {getRelativeTime(post.timestamp)}
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(
                  post.category
                )}`}
              >
                {post.category}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {post.title}
            </h3>
            <p className="text-gray-700 mb-4">{post.content}</p>

            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <button
                onClick={() => handleLike(post.id)}
                className="flex items-center space-x-1 hover:text-green-600 transition-colors"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{post.likes}</span>
              </button>
              <button
                onClick={() =>
                  setActiveReplyPost(
                    activeReplyPost === post.id ? null : post.id
                  )
                }
                className="flex items-center space-x-1 hover:text-green-600 transition-colors"
              >
                <Reply className="w-4 h-4" />
                <span>{post.replies} replies</span>
              </button>
              <button
                onClick={() => setActiveReplyPost(post.id)}
                className="flex items-center space-x-1 hover:text-green-600 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Comment</span>
              </button>
            </div>

            {/* Replies Section */}
            {activeReplyPost === post.id && (
              <div className="mt-4 border-t pt-3">
                <h5 className="font-semibold mb-2 text-gray-800">Replies</h5>
                <div className="space-y-2 mb-3">
                  {replies[post.id]?.length ? (
                    replies[post.id].map((r) => (
                      <div
                        key={r.id}
                        className="bg-gray-50 p-3 rounded-lg border border-gray-200"
                      >
                        <p className="text-sm text-gray-800">
                          <span className="font-semibold">{r.author}:</span>{" "}
                          {r.content}
                        </p>
                        <p className="text-xs text-gray-500">
                          {getRelativeTime(r.timestamp)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">
                      No replies yet. Be the first!
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={() => handleAddReply(post.id)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
                  >
                    <Send className="w-4 h-4 mr-1" /> Send
                  </button>
                  <button
                    onClick={() => setActiveReplyPost(null)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filteredPosts.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            No posts found. Be the first to post!
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityConnect;

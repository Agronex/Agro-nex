import React, { useState, useEffect, useCallback } from "react";
import {
  MessageCircle,
  ThumbsUp,
  Reply,
  Users,
  Plus,
  Loader,
  Send,
  X,
  Trash2,
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
import { useDebouncedCallback } from "../utils/debounce";
import Button from "./Button";
import Card from "./Card";

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
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likeInProgress, setLikeInProgress] = useState<Set<string>>(new Set());
  const [replyInProgress, setReplyInProgress] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Fetch posts
  useEffect(() => {
    const q = query(collection(db, "communityPosts"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedPosts: CommunityPost[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<CommunityPost, "id">),
        }));
        setPosts(fetchedPosts);
      },
      (error) => {
        console.error("Error fetching community posts:", error);
      }
    );
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
      const unsub = onSnapshot(
        repliesQuery,
        (snapshot) => {
          const postReplies: ReplyType[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<ReplyType, "id">),
          }));
          setReplies((prev) => ({ ...prev, [post.id]: postReplies }));
        },
        (error) => {
          console.error("Error fetching replies for post:", error);
        }
      );
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

    setIsSubmitting(true);
    try {
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
      setSuccessMessage('Post created successfully!');
    } catch (error) {
      console.error("Error creating post:", error);
      setErrorMessage('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deleteDoc(doc(db, "communityPosts", postId));
      setDeleteConfirm(null);
      setSuccessMessage('Post deleted successfully!');
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) {
      showError("Please log in to like posts.");
      return;
    }
    
    if (likeInProgress.has(postId)) return;

    setLikeInProgress(prev => new Set(prev).add(postId));
    try {
      const postRef = doc(db, "communityPosts", postId);
      await updateDoc(postRef, { likes: increment(1) });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to like post";
      showError("Error: " + errorMsg);
    } finally {
      setLikeInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  const showError = (message: string) => {
    setErrorMessage(message);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
  };

  // Debounced reply submission
  const debouncedHandleAddReply = useDebouncedCallback(
    (postId: string) => {
      if (!currentUser) {
        showError("Please log in to reply.");
        return;
      }
      if (!replyText.trim()) return;
      if (replyInProgress.has(postId)) return;

      handleAddReplyImpl(postId);
    },
    300
  );

  const handleAddReplyImpl = async (postId: string) => {
    setReplyInProgress(prev => new Set(prev).add(postId));
    try {
      await addDoc(collection(db, "communityPosts", postId, "replies"), {
        author:
          currentUser?.displayName ||
          currentUser?.email?.split("@")[0] ||
          "Anonymous",
        content: replyText,
        timestamp: serverTimestamp(),
      });

      const postRef = doc(db, "communityPosts", postId);
      await updateDoc(postRef, { replies: increment(1) });

      setReplyText("");
      setActiveReplyPost(null);
      showSuccess("Reply posted successfully");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to post reply";
      showError("Error: " + errorMsg);
    } finally {
      setReplyInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
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
    <section className="w-full max-w-4xl mx-auto p-4 md:p-6 bg-white rounded-xl shadow-sm border border-gray-200 mt-0 overflow-hidden">
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <p className="text-green-800 font-medium">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-700"
          >
            ✕
          </button>
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <p className="text-red-800 font-medium">{errorMessage}</p>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Users className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-bold text-gray-800">Community Connect</h2>
        </div>
        <Button
          onClick={() => setShowNewPost(true)}
          disabled={isPostDisabled}
          variant="primary"
          size="md"
          className="flex items-center space-x-2"
        >
          {isLoadingAuth ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          <span>{postButtonText}</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        {["all", "question", "tip", "success", "alert"].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            aria-pressed={activeFilter === filter}
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
        <section className="mb-6 bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-4">Create New Post</h3>
          <form onSubmit={handleSubmitPost} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
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
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
              >
                <option value="question">Question</option>
                <option value="tip">Farming Tip</option>
                <option value="success">Success Story</option>
                <option value="alert">Alert/Warning</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Title
              </label>
              <input
                type="text"
                value={newPost.title}
                onChange={(e) =>
                  setNewPost({ ...newPost, title: e.target.value })
                }
                placeholder="What's your question or topic?"
                required
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Description
              </label>
              <textarea
                rows={4}
                maxLength={500}
                value={newPost.content}
                onChange={(e) =>
                  setNewPost({ ...newPost, content: e.target.value })
                }
                placeholder="Share your thoughts..."
                required
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                {newPost.content.length}/500 characters
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                type="submit"
                disabled={isSubmitting || newPost.content.length > 500}
                variant="primary"
                size="md"
                loading={isSubmitting}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post'
                )}
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowNewPost(false)}
                variant="secondary"
                size="md"
              >
                Cancel
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.map((post) => (
          <article
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
                  <p className="text-sm text-gray-700">
                    {getRelativeTime(post.timestamp)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(
                    post.category
                  )}`}
                >
                  {post.category}
                </span>
                {currentUser?.displayName === post.author && (
                  <button
                    onClick={() => setDeleteConfirm(post.id)}
                    className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    aria-label="Delete post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {post.title}
              </h3>
              <p className="text-gray-800 mb-4">{post.content}</p>
            </section>

            <div className="flex items-center space-x-4 text-sm text-gray-700">
              <button
                onClick={() => handleLike(post.id)}
                disabled={likeInProgress.has(post.id)}
                className="flex items-center space-x-1 hover:text-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded min-h-10 min-w-12"
                aria-label={`Like this post, currently ${post.likes} likes`}
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
                className="flex items-center space-x-1 hover:text-green-600 transition-colors px-3 py-2 rounded min-h-10 min-w-12"
                aria-label={`View ${post.replies} replies`}
              >
                <Reply className="w-4 h-4" />
                <span>{post.replies} replies</span>
              </button>
              <button
                onClick={() => setActiveReplyPost(post.id)}
                className="flex items-center space-x-1 hover:text-green-600 transition-colors px-3 py-2 rounded min-h-10 min-w-12"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Comment</span>
              </button>
            </div>

            {/* Replies Section */}
            {activeReplyPost === post.id && (
              <section className="mt-4 border-t pt-3">
                <h4 className="font-semibold mb-2 text-gray-800">Replies</h4>
                <div className="space-y-2 mb-3">
                  {replies[post.id]?.length ? (
                    replies[post.id].map((r) => (
                      <article
                        key={r.id}
                        className="bg-gray-50 p-3 rounded-lg border border-gray-200"
                      >
                        <p className="text-sm text-gray-800">
                          <span className="font-semibold">{r.author}:</span>{" "}
                          {r.content}
                        </p>
                        <p className="text-xs text-gray-700">
                          {getRelativeTime(r.timestamp)}
                        </p>
                      </article>
                    ))
                  ) : (
                    <p className="text-sm text-gray-700 animate-fadeIn">
                      No replies yet. Be the first!
                    </p>
                  )}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); debouncedHandleAddReply(post.id); }} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    disabled={replyInProgress.has(post.id)}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    aria-label="Reply text input"
                  />
                  <Button
                    type="submit"
                    disabled={replyInProgress.has(post.id)}
                    variant="primary"
                    size="sm"
                    loading={replyInProgress.has(post.id)}
                    className="flex items-center"
                  >
                    {replyInProgress.has(post.id) ? (
                      <>
                        <Loader className="w-4 h-4 mr-1 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-1" /> Send
                      </>
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setActiveReplyPost(null)}
                    className="text-gray-500 hover:text-red-600 px-2 py-2 rounded min-h-10 min-w-10 flex items-center justify-center"
                    aria-label="Close replies section"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              </section>
            )}
          </article>
        ))}
        {filteredPosts.length === 0 && (
          <div className="text-center py-12 animate-fadeIn">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">No posts yet. Be the first to share!</p>
            <p className="text-gray-500">Connect with other farmers and share your experiences.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm shadow-lg">
            <p className="text-gray-800 font-medium mb-6 text-lg">Delete Post?</p>
            <p className="text-gray-600 mb-6">This post will be permanently deleted and cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setDeleteConfirm(null)}
                variant="ghost"
                size="md"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDeletePost(deleteConfirm)}
                variant="danger"
                size="md"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CommunityConnect;


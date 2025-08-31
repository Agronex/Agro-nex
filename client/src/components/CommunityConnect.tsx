import React, { useState } from 'react';
import { MessageCircle, ThumbsUp, Reply, Users, Plus } from 'lucide-react';
import { CommunityPost } from '../types';
import { mockCommunityPosts } from '../services/mockApi';
import { getRelativeTime } from '../utils/dateUtils';

const CommunityConnect: React.FC = () => {
  const [posts, setPosts] = useState<CommunityPost[]>(mockCommunityPosts);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'question' as 'question' | 'tip' | 'success' | 'alert'
  });
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const handleSubmitPost = (e: React.FormEvent) => {
    e.preventDefault();
    
    const post: CommunityPost = {
      id: Date.now().toString(),
      author: 'You',
      title: newPost.title,
      content: newPost.content,
      category: newPost.category,
      timestamp: new Date().toISOString(),
      likes: 0,
      replies: 0
    };

    setPosts([post, ...posts]);
    setNewPost({ title: '', content: '', category: 'question' });
    setShowNewPost(false);
  };

  const handleLike = (postId: string) => {
    setPosts(posts.map(post => 
      post.id === postId ? { ...post, likes: post.likes + 1 } : post
    ));
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'question': return 'bg-blue-100 text-blue-800';
      case 'tip': return 'bg-green-100 text-green-800';
      case 'success': return 'bg-yellow-100 text-yellow-800';
      case 'alert': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'question': return '❓';
      case 'tip': return '💡';
      case 'success': return '🎉';
      case 'alert': return '⚠️';
      default: return '📝';
    }
  };

  const filteredPosts = activeFilter === 'all' 
    ? posts 
    : posts.filter(post => post.category === activeFilter);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Users className="w-6 h-6 text-green-600" />
          <h3 className="text-xl font-bold text-gray-800">Community Connect</h3>
        </div>
        <button
          onClick={() => setShowNewPost(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Post</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        {['all', 'question', 'tip', 'success', 'alert'].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeFilter === filter
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter === 'all' ? 'All Posts' : filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* New Post Form */}
      {showNewPost && (
        <div className="mb-6 bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-4">Create New Post</h4>
          <form onSubmit={handleSubmitPost} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={newPost.category}
                onChange={(e) => setNewPost({...newPost, category: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="question">Question</option>
                <option value="tip">Farming Tip</option>
                <option value="success">Success Story</option>
                <option value="alert">Alert/Warning</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                required
                value={newPost.title}
                onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="What's your question or topic?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                rows={4}
                required
                value={newPost.content}
                onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Share your thoughts, questions, or experiences..."
              />
            </div>
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
          <div key={post.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {post.author[0]}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">{post.author}</h4>
                  <p className="text-sm text-gray-600">{getRelativeTime(post.timestamp)}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(post.category)}`}>
                {getCategoryIcon(post.category)} {post.category}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mb-2">{post.title}</h3>
            <p className="text-gray-700 mb-4">{post.content}</p>

            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <button
                onClick={() => handleLike(post.id)}
                className="flex items-center space-x-1 hover:text-green-600 transition-colors"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{post.likes}</span>
              </button>
              <button className="flex items-center space-x-1 hover:text-green-600 transition-colors">
                <Reply className="w-4 h-4" />
                <span>{post.replies} replies</span>
              </button>
              <button className="flex items-center space-x-1 hover:text-green-600 transition-colors">
                <MessageCircle className="w-4 h-4" />
                <span>Comment</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Expert Connect Section */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 border border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
          <Users className="w-5 h-5 mr-2 text-green-600" />
          Connect with Experts
        </h4>
        <p className="text-gray-700 text-sm mb-4">
          Need professional advice? Connect with agricultural experts and extension officers in your area.
        </p>
        <div className="flex space-x-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
            Find Local Experts
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
            Schedule Consultation
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommunityConnect;
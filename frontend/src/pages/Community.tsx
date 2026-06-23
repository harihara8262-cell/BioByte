import React, { useEffect, useState } from "react";
import { Users, MessageSquare, ThumbsUp, Star, PenTool, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ForumPost {
  id: number;
  author: string;
  avatar: string;
  role: string;
  content: string;
  likes: number;
  comments_count: number;
  rating: number;
  timestamp: string;
  isLiked?: boolean;
}

export default function Community() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "expert">("all");

  // Post form state
  const [newContent, setNewContent] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [posting, setPosting] = useState(false);

  const fetchPosts = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/community");
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error("Failed to fetch community posts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleLike = (id: number) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const isLiked = !p.isLiked;
          return {
            ...p,
            likes: isLiked ? p.likes + 1 : p.likes - 1,
            isLiked
          };
        }
        return p;
      })
    );
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setPosting(true);

    setTimeout(() => {
      const newPost: ForumPost = {
        id: posts.length + 100,
        author: "Dr. Avery Vance", // Current user
        avatar: "A",
        role: "Lead Greenkeeper (You)",
        content: newContent,
        likes: 0,
        comments_count: 0,
        rating: newRating,
        timestamp: "Just now",
        isLiked: false
      };

      setPosts([newPost, ...posts]);
      setNewContent("");
      setNewRating(5);
      setPosting(false);
    }, 800);
  };

  const filteredPosts = posts.filter((p) => {
    if (filter === "expert") {
      return p.role.toLowerCase().includes("botanist") || p.role.toLowerCase().includes("specialist");
    }
    return true;
  });

  return (
    <div className="flex-1 min-h-screen overflow-y-auto px-8 py-10 relative">
      <div className="max-w-4xl mx-auto flex flex-col gap-8 font-sans">
        
        {/* Title */}
        <div className="flex flex-col gap-1.5 border-b border-bio-card-border/20 pb-5">
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-bio-emerald" />
            Community Network
          </h2>
          <p className="text-sm text-slate-400 font-light">
            Share ratings, discuss treatments, and consult expert advice on plant diagnostics.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Feed Column */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            {/* Toggle tabs */}
            <div className="flex border-b border-bio-card-border/10 pb-1 gap-2 text-xs">
              <button
                onClick={() => setFilter("all")}
                className={`pb-2.5 px-4 font-bold border-b-2 transition-all ${
                  filter === "all" ? "border-bio-emerald text-bio-light-emerald" : "border-transparent text-slate-500 hover:text-slate-350"
                }`}
              >
                All Discussions
              </button>
              <button
                onClick={() => setFilter("expert")}
                className={`pb-2.5 px-4 font-bold border-b-2 transition-all ${
                  filter === "expert" ? "border-bio-emerald text-bio-light-emerald" : "border-transparent text-slate-500 hover:text-slate-350"
                }`}
              >
                Expert Advice Only
              </button>
            </div>

            {/* Loading */}
            {loading && (
              <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-bio-emerald animate-spin" />
                <span className="text-xs text-slate-400">Loading feed streams...</span>
              </div>
            )}

            {/* Posts Feed list */}
            {!loading && (
              <div className="flex flex-col gap-4">
                <AnimatePresence>
                  {filteredPosts.map((post) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="glass-panel p-5 rounded-2xl border-bio-card-border/10 flex flex-col gap-4 relative overflow-hidden group"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-bio-dark-green to-bio-forest border border-bio-emerald/20 flex items-center justify-center font-black text-bio-light-emerald text-sm">
                            {post.avatar}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white leading-tight">{post.author}</h4>
                            <span className="text-[9px] uppercase tracking-wider text-bio-light-emerald font-semibold mt-0.5 block">
                              {post.role}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] text-slate-500 font-light">{post.timestamp}</span>
                      </div>

                      {/* Content */}
                      <p className="text-xs text-slate-300 font-light leading-relaxed">
                        {post.content}
                      </p>

                      {/* Bottom action bar */}
                      <div className="border-t border-bio-card-border/10 pt-3.5 flex justify-between items-center text-[10px] text-slate-500">
                        {/* Rating (star indicator) */}
                        <div className="flex items-center gap-1 bg-bio-emerald/5 px-2 py-1 rounded-lg border border-bio-emerald/10">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span className="font-bold text-slate-350">{post.rating.toFixed(1)} / 5.0</span>
                        </div>

                        <div className="flex gap-4">
                          {/* Like button */}
                          <button
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center gap-1.5 transition-colors ${
                              post.isLiked ? "text-bio-light-emerald" : "hover:text-slate-300"
                            }`}
                          >
                            <ThumbsUp className={`w-3.5 h-3.5 ${post.isLiked ? "fill-bio-emerald text-bio-emerald" : ""}`} />
                            <span>{post.likes}</span>
                          </button>

                          {/* Comments */}
                          <div className="flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{post.comments_count}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Right Column: Share Experience Form */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="glass-panel p-6 rounded-3xl flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-bio-emerald/5 rounded-full blur-2xl pointer-events-none" />
              
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-bio-emerald" />
                  Post Experience
                </h3>
                <p className="text-[10px] text-slate-500 font-light mt-0.5">Share foliage findings or rate remedies</p>
              </div>

              <form onSubmit={handleCreatePost} className="flex flex-col gap-4 mt-2">
                <textarea
                  required
                  placeholder="Share a disease diagnostic or care advice..."
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="glass-input p-3.5 rounded-xl text-xs resize-none w-full font-light"
                />

                {/* Rating select slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-slate-400 uppercase tracking-wider">Treatment Rating</span>
                    <span className="font-extrabold text-bio-light-emerald">{newRating} / 5</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={newRating}
                    onChange={(e) => setNewRating(parseInt(e.target.value))}
                    className="w-full accent-bio-emerald h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={posting}
                  className="w-full py-3 bg-gradient-to-r from-bio-emerald to-emerald-600 text-bio-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:scale-[1.01] transition-all shadow-neon-emerald"
                >
                  {posting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-bio-black" />
                      <span>Post to Forum</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { login, fetchRootTopics, fetchTopicBySlug } from './services/api';
import { RichContent } from './components/RichContent';
import { Topic, AuthResponse, User, Block, TopicDetailResponse } from './types';

// --- Contexts ---

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextType>({ isDark: false, toggleTheme: () => {} });

interface AuthContextType {
  user: User | null;
  token: string | null;
  loginUser: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}
const AuthContext = createContext<AuthContextType>({ user: null, token: null, loginUser: async () => {}, logout: () => {} });

// --- Components ---

const Navbar = () => {
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const { user, logout } = useContext(AuthContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-gray-200 dark:border-dark-border">
      <div className="w-[95%] xl:w-[90%] max-w-[2000px] mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:scale-105 transition-transform">
                <span className="material-symbols-rounded">school</span>
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-gray-900 dark:text-white">BrainLoom</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Explore</Link>
            <Link to="/" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Products</Link>
            <Link to="/" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Library</Link>
            <Link to="/" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">About</Link>
            
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <span className="material-symbols-rounded text-[20px]">{isDark ? 'light_mode' : 'dark_mode'}</span>
            </button>
            
            {user ? (
              <div className="flex items-center gap-3 pl-2">
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.role}</p>
                </div>
                <button 
                   onClick={logout}
                   className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                   title="Logout"
                >
                  <span className="material-symbols-rounded">logout</span>
                </button>
              </div>
            ) : (
              <Link to="/login" className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold shadow-md shadow-primary-500/20 transition-all">
                Login
              </Link>
            )}
          </div>
          
          <div className="md:hidden flex items-center">
             <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-600 dark:text-gray-300">
               <span className="material-symbols-rounded">menu</span>
             </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface px-4 py-4 flex flex-col gap-4">
             <Link to="/" onClick={() => setIsMenuOpen(false)} className="block py-2 text-base font-medium text-gray-700 dark:text-gray-200">Explore</Link>
             <Link to="/" onClick={() => setIsMenuOpen(false)} className="block py-2 text-base font-medium text-gray-700 dark:text-gray-200">Products</Link>
             <Link to="/" onClick={() => setIsMenuOpen(false)} className="block py-2 text-base font-medium text-gray-700 dark:text-gray-200">Library</Link>
             <Link to="/" onClick={() => setIsMenuOpen(false)} className="block py-2 text-base font-medium text-gray-700 dark:text-gray-200">About</Link>
             <button onClick={() => { toggleTheme(); setIsMenuOpen(false); }} className="flex items-center gap-2 py-2 text-base font-medium text-gray-700 dark:text-gray-200">
               <span className="material-symbols-rounded">{isDark ? 'light_mode' : 'dark_mode'}</span>
               {isDark ? 'Light Mode' : 'Dark Mode'}
             </button>
             {user ? (
                <button onClick={logout} className="flex items-center gap-2 py-2 text-red-500 font-medium">Logout</button>
             ) : (
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block py-2 text-primary-600 font-bold">Login</Link>
             )}
        </div>
      )}
    </nav>
  );
};

const TopicCard: React.FC<{ topic: Topic }> = ({ topic }) => {
  const gradients = [
    'from-blue-500 to-cyan-400',
    'from-purple-500 to-pink-400',
    'from-emerald-500 to-teal-400',
    'from-orange-500 to-amber-400'
  ];
  const gradient = gradients[topic.id % gradients.length];

  return (
    <Link to={`/topic/${topic.slug}`} className="group relative flex flex-col h-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className={`h-32 w-full bg-gradient-to-br ${gradient} opacity-90 group-hover:opacity-100 transition-opacity`}>
         <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
      </div>
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-display">{topic.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 flex-1 whitespace-pre-line">
          {topic.description || "Start your journey into this topic."}
        </p>
        <div className="flex items-center text-primary-600 dark:text-primary-400 text-sm font-semibold mt-auto group-hover:gap-2 transition-all">
          Start Learning <span className="material-symbols-rounded text-[18px]">arrow_forward</span>
        </div>
      </div>
    </Link>
  );
};

const Home = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchRootTopics()
      .then(res => {
        setTopics(res.topics);
        setFilteredTopics(res.topics);
      })
      .catch(() => setError('Failed to load topics'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredTopics(topics);
    } else {
      const lower = search.toLowerCase();
      setFilteredTopics(topics.filter(t => 
        t.title.toLowerCase().includes(lower) || 
        (t.description && t.description.toLowerCase().includes(lower))
      ));
    }
  }, [search, topics]);

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* Hero Section */}
      <div className="relative bg-white dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        
        <div className="w-[95%] xl:w-[90%] max-w-[2000px] mx-auto px-4 py-20 sm:px-6 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tight mb-6 font-display">
            Expand Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600">Knowledge</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed mb-8">
             Explore our curated collection of expert-led topics. Master new skills in programming, science, and more with our interactive learning platform.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-xl mx-auto mb-8 relative">
            <input
              type="text"
              placeholder="Search topics (e.g., Python, Security)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-full border border-gray-200 dark:border-dark-border bg-white/50 dark:bg-dark-surface/50 backdrop-blur-sm shadow-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white"
            />
            <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          </div>

          <div className="flex justify-center gap-4">
            <button className="px-6 py-3 rounded-full bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-all shadow-lg shadow-primary-500/30">
              Get Started
            </button>
            <button className="px-6 py-3 rounded-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white font-semibold transition-all">
              View Catalog
            </button>
          </div>
        </div>
      </div>

      {/* Topics Section */}
      <div className="w-[95%] xl:w-[90%] max-w-[2000px] mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-rounded text-primary-500">category</span>
            Featured Topics
          </h2>
          <a href="#" className="text-primary-600 hover:underline text-sm font-medium">View All</a>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="h-64 bg-gray-200 dark:bg-dark-surface rounded-2xl animate-pulse"></div>)}
          </div>
        ) : error ? (
           <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>
        ) : filteredTopics.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-dark-border">
            <span className="material-symbols-rounded text-4xl mb-2 opacity-50">search_off</span>
            <p>No topics found matching "{search}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredTopics.map(topic => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="bg-gray-50 dark:bg-dark-surface py-20 border-y border-gray-200 dark:border-dark-border">
         <div className="w-[95%] xl:w-[90%] max-w-[2000px] mx-auto px-4 sm:px-6">
           <div className="text-center mb-16">
             <h2 className="text-3xl font-bold text-gray-900 dark:text-white font-display mb-4">Why Choose BrainLoom?</h2>
             <p className="text-gray-500 dark:text-gray-400">Everything you need to master your next skill.</p>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="bg-white dark:bg-dark-bg p-8 rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm hover:shadow-md transition-shadow">
               <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-6">
                 <span className="material-symbols-rounded text-2xl">menu_book</span>
               </div>
               <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Rich Content</h3>
               <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                 Interactive code blocks, images, and detailed notes help you retain information better.
               </p>
             </div>
             
             <div className="bg-white dark:bg-dark-bg p-8 rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm hover:shadow-md transition-shadow">
               <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center mb-6">
                 <span className="material-symbols-rounded text-2xl">account_tree</span>
               </div>
               <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Structured Learning</h3>
               <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                 Organized topics and subtopics guide you through a logical learning path.
               </p>
             </div>
             
             <div className="bg-white dark:bg-dark-bg p-8 rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm hover:shadow-md transition-shadow">
               <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center mb-6">
                 <span className="material-symbols-rounded text-2xl">speed</span>
               </div>
               <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Fast & Responsive</h3>
               <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                 Experience lightning fast navigation and a seamless experience on any device.
               </p>
             </div>
           </div>
         </div>
      </div>
      
      {/* Footer CTA */}
      <div className="w-[95%] xl:w-[90%] max-w-[2000px] mx-auto px-4 py-20 text-center">
         <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Ready to start learning?</h2>
         <Link to="/" className="text-primary-600 hover:text-primary-700 font-semibold flex items-center justify-center gap-2">
            Browse All Topics <span className="material-symbols-rounded">arrow_forward</span>
         </Link>
      </div>
    </div>
  );
};

// Reusable content for Sidebar to allow usage in both desktop sticky column and mobile drawer
const SidebarContent = ({ items, topic, parentSlug, onItemClick }: { items: Topic[], topic: Topic, parentSlug?: string, onItemClick?: () => void }) => {
  return (
    <div className="flex flex-col gap-1">
       {items.sort((a,b) => a.order_no - b.order_no).map(child => {
         const linkPath = `/topic/${topic.full_path ? topic.full_path + '/' + child.slug : parentSlug ? parentSlug + '/' + child.slug : child.slug}`;
         
         return (
           <Link 
             key={child.id}
             to={linkPath}
             onClick={onItemClick}
             className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
           >
             <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0"></div>
             <span className="truncate">{child.title}</span>
           </Link>
         )
       })}
    </div>
  );
}

const TopicViewer = () => {
  const { "*": slug } = useParams(); // Capture wildcard slug
  const [data, setData] = useState<TopicDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchTopicBySlug(slug)
      .then(setData)
      .catch(err => {
        console.error(err);
        setError('Topic not found or failed to load.');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  // Close sidebar when navigating to a new topic (via sidebar links)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [slug]);

  if (loading) return <div className="w-[95%] xl:w-[90%] max-w-[2000px] mx-auto p-8"><div className="w-2/3 h-10 bg-gray-200 dark:bg-dark-surface rounded animate-pulse mb-6"></div><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="w-full h-32 bg-gray-200 dark:bg-dark-surface rounded animate-pulse"></div>)}</div></div>;
  
  if (error || !data) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <span className="material-symbols-rounded text-6xl text-gray-300">sentiment_dissatisfied</span>
      <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">{error || "Topic Not Found"}</h2>
      <Link to="/" className="text-primary-600 hover:underline">Go Home</Link>
    </div>
  );

  const { topic, blocks, children } = data;
  const sortedBlocks = blocks.sort((a, b) => a.block_order - b.block_order);

  // If topic has children but no content blocks (Root/Folder topic), display grid of children
  const isFolder = sortedBlocks.length === 0 && children && children.length > 0;
  
  // Calculate if sidebar should be shown
  const showSidebar = children && children.length > 0;
  const sidebarItems = children || [];

  return (
    <div className="w-[95%] xl:w-[90%] max-w-[2000px] mx-auto px-4 sm:px-6 py-8 min-h-[80vh]">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm text-gray-500 mb-8 overflow-x-auto whitespace-nowrap pb-2">
         <Link to="/" className="hover:text-primary-600 transition-colors">Topics</Link>
         {slug?.split('/').map((segment, idx, arr) => {
            const path = arr.slice(0, idx + 1).join('/');
            const isLast = idx === arr.length - 1;
            const display = segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return (
              <React.Fragment key={path}>
                <span className="mx-2 text-gray-300">/</span>
                {isLast ? (
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{topic.title}</span>
                ) : (
                  <Link to={`/topic/${path}`} className="hover:text-primary-600 transition-colors">{display}</Link>
                )}
              </React.Fragment>
            );
         })}
      </nav>

      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-1 min-w-0">
          <div className="mb-8">
            <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4 font-display">{topic.title}</h1>
            {topic.description && (
               <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed border-l-4 border-gray-200 dark:border-gray-700 pl-4 whitespace-pre-line">
                 {topic.description}
               </p>
            )}
          </div>

          {isFolder ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {children.map(child => (
                   <Link 
                    key={child.id} 
                    to={`/topic/${topic.full_path ? topic.full_path + '/' + child.slug : slug + '/' + child.slug}`}
                    className="p-6 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl hover:border-primary-500 dark:hover:border-primary-500 transition-colors group"
                   >
                     <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors mb-2">{child.title}</h3>
                     <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{child.description}</p>
                   </Link>
                ))}
             </div>
          ) : (
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm border border-gray-200 dark:border-dark-border p-6 md:p-10 animate-fade-in min-h-[500px]">
              {sortedBlocks.map(block => (
                 <div key={block.id}>
                    {block.components?.map((comp, i) => {
                      if (!comp?.json?.content) return null;
                      return <RichContent key={i} htmlContent={comp.json.content} />;
                    })}
                 </div>
              ))}
              {sortedBlocks.length === 0 && <p className="text-gray-400 italic">No content available for this topic yet.</p>}
            </div>
          )}
          
          {/* Navigation Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-dark-border flex justify-between">
             <button onClick={() => window.history.back()} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">
               <span className="material-symbols-rounded">arrow_back</span> Back
             </button>
             {/* Next logic could be implemented if we knew the next sibling */}
          </div>
        </div>

        {/* Desktop Sidebar: Visible only on lg screens */}
        {showSidebar && (
           <div className="hidden lg:block w-80 shrink-0 lg:order-last">
              <div className="sticky top-24 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl p-5 shadow-sm">
                 <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="material-symbols-rounded text-base">toc</span>
                    In this Module
                 </h3>
                 <SidebarContent items={sidebarItems} topic={topic} parentSlug={slug} />
              </div>
           </div>
        )}
      </div>

      {/* Mobile Sidebar Controls */}
      {showSidebar && (
        <>
          {/* Floating Action Button for Mobile */}
          <button 
             onClick={() => setIsSidebarOpen(true)}
             className="lg:hidden fixed bottom-6 right-6 z-40 bg-primary-600 hover:bg-primary-700 text-white p-4 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
             title="Open Module Menu"
          >
             <span className="material-symbols-rounded text-2xl">menu_book</span>
          </button>

          {/* Mobile Drawer (Overlay) */}
          {isSidebarOpen && (
             <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
                {/* Backdrop */}
                <div 
                   className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" 
                   onClick={() => setIsSidebarOpen(false)}
                ></div>
                
                {/* Sidebar Panel */}
                <div className="relative w-80 h-full bg-white dark:bg-dark-surface shadow-2xl p-6 overflow-y-auto animate-fade-in border-l border-gray-200 dark:border-dark-border">
                   <div className="flex justify-between items-center mb-8">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                         <span className="material-symbols-rounded text-primary-600">toc</span>
                         In This Module
                      </h3>
                      <button 
                         onClick={() => setIsSidebarOpen(false)} 
                         className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                      >
                         <span className="material-symbols-rounded">close</span>
                      </button>
                   </div>
                   <SidebarContent items={sidebarItems} topic={topic} parentSlug={slug} />
                </div>
             </div>
          )}
        </>
      )}
    </div>
  );
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser, user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await loginUser(email, password);
      navigate('/');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-dark-surface rounded-2xl shadow-xl border border-gray-200 dark:border-dark-border p-8">
        <div className="text-center mb-8">
           <div className="w-12 h-12 bg-primary-600 rounded-xl mx-auto flex items-center justify-center text-white mb-4 shadow-lg shadow-primary-500/30">
             <span className="material-symbols-rounded text-2xl">school</span>
           </div>
           <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</h2>
           <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Sign in to access your account</p>
        </div>
        
        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-300 text-sm">
            <span className="material-symbols-rounded text-sm">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
           <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
             <input 
               type="email" 
               required
               value={email}
               onChange={(e) => setEmail(e.target.value)}
               className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-[#1a202c] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
               placeholder="name@company.com"
             />
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
             <input 
               type="password" 
               required
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-[#1a202c] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
               placeholder="••••••••"
             />
           </div>
           
           <button 
             type="submit" 
             disabled={loading}
             className="w-full py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-md shadow-primary-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center"
           >
             {loading ? <span className="material-symbols-rounded animate-spin">progress_activity</span> : 'Sign In'}
           </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
           Protected by BrainLoom Security
        </div>
      </div>
    </div>
  );
};

const AppContent = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/topic/*" element={<TopicViewer />} />
      </Routes>
    </div>
  );
};

export default function App() {
  // Theme State
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  // Auth State
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  const loginUser = async (email: string, pass: string) => {
    const data = await login(email, pass);
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <AuthContext.Provider value={{ user, token, loginUser, logout }}>
        <HashRouter>
          <AppContent />
        </HashRouter>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}
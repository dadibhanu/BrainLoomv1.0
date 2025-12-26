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
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-md border-b border-gray-200 dark:border-dark-border transition-colors duration-300">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-lg bg-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:scale-105 transition-transform">
                <span className="material-symbols-rounded">school</span>
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-gray-900 dark:text-white">BrainLoom</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Explore</Link>
            <Link to="/" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Library</Link>
            <Link to="/" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Community</Link>
            
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              aria-label="Toggle Theme"
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
          
          <div className="md:hidden flex items-center gap-2">
             <button 
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400"
            >
              <span className="material-symbols-rounded text-[20px]">{isDark ? 'light_mode' : 'dark_mode'}</span>
            </button>
             <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-600 dark:text-gray-300">
               <span className="material-symbols-rounded">menu</span>
             </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface px-4 py-4 flex flex-col gap-4 animate-fade-in shadow-xl">
             <Link to="/" onClick={() => setIsMenuOpen(false)} className="block py-2 text-base font-medium text-gray-700 dark:text-gray-200">Explore</Link>
             <Link to="/" onClick={() => setIsMenuOpen(false)} className="block py-2 text-base font-medium text-gray-700 dark:text-gray-200">Library</Link>
             <Link to="/" onClick={() => setIsMenuOpen(false)} className="block py-2 text-base font-medium text-gray-700 dark:text-gray-200">Community</Link>
             {user ? (
                <button onClick={logout} className="flex items-center gap-2 py-2 text-red-500 font-medium">Logout ({user.name})</button>
             ) : (
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block py-2 text-primary-600 font-bold">Login</Link>
             )}
        </div>
      )}
    </nav>
  );
};

const Footer = () => (
  <footer className="bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border mt-auto">
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center">
              <span className="material-symbols-rounded text-xl">school</span>
            </div>
            <span className="font-display font-bold text-xl text-gray-900 dark:text-white">BrainLoom</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
            Empowering learners with interactive, structured content. Build your future, one topic at a time.
          </p>
        </div>
        
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white mb-4">Platform</h4>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li><Link to="/" className="hover:text-primary-600">Browse Topics</Link></li>
            <li><Link to="/" className="hover:text-primary-600">Features</Link></li>
            <li><Link to="/" className="hover:text-primary-600">Pricing</Link></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white mb-4">Resources</h4>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li><Link to="/" className="hover:text-primary-600">Documentation</Link></li>
            <li><Link to="/" className="hover:text-primary-600">API Reference</Link></li>
            <li><Link to="/" className="hover:text-primary-600">Community</Link></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white mb-4">Legal</h4>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li><Link to="/" className="hover:text-primary-600">Privacy Policy</Link></li>
            <li><Link to="/" className="hover:text-primary-600">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-100 dark:border-gray-800 mt-12 pt-8 text-center text-sm text-gray-500 dark:text-gray-500">
        © {new Date().getFullYear()} BrainLoom Inc. All rights reserved.
      </div>
    </div>
  </footer>
);

const TopicCard: React.FC<{ topic: Topic }> = ({ topic }) => {
  const gradients = [
    'from-blue-600 to-cyan-500',
    'from-purple-600 to-pink-500',
    'from-emerald-600 to-teal-500',
    'from-orange-500 to-amber-500'
  ];
  const gradient = gradients[topic.id % gradients.length];

  return (
    <Link to={`/topic/${topic.slug}`} className="group relative flex flex-col h-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className={`h-36 w-full bg-gradient-to-br ${gradient} relative overflow-hidden`}>
         <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
         <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
      </div>
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-display">{topic.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 flex-1 whitespace-pre-line leading-relaxed">
          {topic.description || "Start your journey into this topic."}
        </p>
        <div className="flex items-center text-primary-600 dark:text-primary-400 text-sm font-semibold mt-auto group-hover:translate-x-1 transition-transform">
          Start Learning <span className="material-symbols-rounded text-[18px] ml-1">arrow_forward</span>
        </div>
      </div>
    </Link>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: string, title: string, description: string }) => (
  <div className="bg-white dark:bg-dark-bg p-8 rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm hover:shadow-md transition-all">
    <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-xl flex items-center justify-center mb-6">
      <span className="material-symbols-rounded text-2xl">{icon}</span>
    </div>
    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 font-display">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
      {description}
    </p>
  </div>
);

const StatItem = ({ count, label }: { count: string, label: string }) => (
  <div className="flex flex-col items-center justify-center p-4">
    <span className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-1 font-display">{count}</span>
    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{label}</span>
  </div>
);

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
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-white dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[500px] h-[500px] bg-primary-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl"></div>
        
        <div className="max-w-[1920px] mx-auto px-4 py-24 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs font-semibold uppercase tracking-wider mb-8">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
            New Topics Available
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tight mb-6 font-display">
            Expand Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600">Knowledge</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed mb-10">
             Explore our curated collection of expert-led topics. Master new skills in programming, science, and more with our interactive learning platform.
          </p>
          
          <div className="max-w-xl mx-auto mb-10 relative">
            <input
              type="text"
              placeholder="Search topics (e.g., Python, Security)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-full border border-gray-200 dark:border-dark-border bg-white/50 dark:bg-dark-surface/50 backdrop-blur-sm shadow-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white text-lg placeholder:text-gray-400"
            />
            <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-2xl">search</span>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-gray-100 dark:divide-gray-800/50">
            <StatItem count="10k+" label="Active Learners" />
            <StatItem count="500+" label="Topics Covered" />
            <StatItem count="100+" label="Expert Mentors" />
            <StatItem count="4.9" label="User Rating" />
          </div>
        </div>
      </div>

      {/* Topics Section */}
      <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 font-display">
            Featured Topics
          </h2>
          <button className="text-primary-600 font-medium hover:underline text-sm flex items-center gap-1">
            View All <span className="material-symbols-rounded text-base">arrow_forward</span>
          </button>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1,2,3,4].map(i => <div key={i} className="h-64 bg-gray-100 dark:bg-dark-surface rounded-xl animate-pulse"></div>)}
          </div>
        ) : error ? (
           <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>
        ) : filteredTopics.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 dark:bg-dark-surface/50 rounded-2xl border border-dashed border-gray-200 dark:border-dark-border">
            <span className="material-symbols-rounded text-5xl mb-4 text-gray-300 dark:text-gray-600">search_off</span>
            <p className="text-gray-500 dark:text-gray-400 text-lg">No topics found matching "{search}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredTopics.map(topic => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        )}
      </div>

      {/* Why Choose Us Section */}
      <div className="bg-gray-50 dark:bg-dark-surface py-24 border-y border-gray-200 dark:border-dark-border">
         <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
               <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 font-display">Why Learn with BrainLoom?</h2>
               <p className="text-gray-600 dark:text-gray-400 text-lg">
                 We provide the tools and structure you need to master complex topics efficiently.
               </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <FeatureCard 
                 icon="code_blocks" 
                 title="Interactive Content" 
                 description="Don't just read. Interact with code blocks, visualize data with dynamic charts, and take notes directly on the page."
               />
               <FeatureCard 
                 icon="account_tree" 
                 title="Structured Learning" 
                 description="Our topics are organized logically into hierarchies, ensuring you build a solid foundation before moving to advanced concepts."
               />
               <FeatureCard 
                 icon="groups" 
                 title="Community Driven" 
                 description="Join a growing community of learners. Share insights, ask questions, and contribute to the collective knowledge base."
               />
            </div>
         </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-24 bg-white dark:bg-dark-bg">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
           <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-12 text-center font-display">What Our Learners Say</h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { name: "Alex Chen", role: "Software Engineer", quote: "BrainLoom's structured approach to Python helped me transition from a support role to full-time development in just 3 months." },
                { name: "Sarah Jones", role: "Data Analyst", quote: "The interactive examples make complex algorithms so much easier to understand. It's my go-to reference for daily work." },
                { name: "Michael Ross", role: "Student", quote: "Finally, a platform that doesn't just dump information but organizes it in a way that actually makes sense for beginners." }
              ].map((t, i) => (
                 <div key={i} className="p-8 bg-gray-50 dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-dark-border relative">
                    <span className="material-symbols-rounded text-4xl text-primary-200 dark:text-primary-900 absolute top-6 right-6">format_quote</span>
                    <p className="text-gray-700 dark:text-gray-300 mb-6 relative z-10 leading-relaxed">"{t.quote}"</p>
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                          {t.name[0]}
                       </div>
                       <div>
                          <p className="font-bold text-gray-900 dark:text-white text-sm">{t.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t.role}</p>
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative py-24 bg-primary-900 overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
         <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-500/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
         
         <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
            <h2 className="text-4xl font-bold text-white mb-6 font-display">Ready to Start Your Journey?</h2>
            <p className="text-primary-100 text-xl mb-10 max-w-2xl mx-auto">
               Join thousands of learners mastering new skills today. Access our full library of topics for free.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <button className="px-8 py-4 bg-white text-primary-900 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors shadow-xl">
                  Get Started for Free
               </button>
               <button className="px-8 py-4 bg-primary-800 text-white border border-primary-700 rounded-full font-bold text-lg hover:bg-primary-700 transition-colors">
                  View Course Catalog
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};

// Sidebar Component
const Sidebar = ({ items, topic, parentSlug, isOpen, onClose }: { items: Topic[], topic: Topic, parentSlug?: string, isOpen: boolean, onClose: () => void }) => {
  if (!items || items.length === 0) return null;

  return (
    <>
      {/* Desktop Sidebar (Left side, sticky) */}
      <aside className="hidden lg:block w-72 shrink-0 border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg min-h-[calc(100vh-64px)]">
         <div className="sticky top-16 p-6 overflow-y-auto max-h-[calc(100vh-64px)]">
           <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">
             In this Module
           </h3>
           <nav className="flex flex-col space-y-1">
             {items.sort((a,b) => a.order_no - b.order_no).map(child => {
               const linkPath = `/topic/${topic.full_path ? topic.full_path + '/' + child.slug : parentSlug ? parentSlug + '/' + child.slug : child.slug}`;
               return (
                 <Link 
                   key={child.id}
                   to={linkPath}
                   className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                 >
                   <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-primary-500 transition-colors"></span>
                   <span className="truncate">{child.title}</span>
                 </Link>
               );
             })}
           </nav>
         </div>
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}></div>
          <div className="relative w-80 bg-white dark:bg-dark-surface h-full shadow-2xl p-6 overflow-y-auto animate-fade-in flex flex-col">
            <div className="flex justify-between items-center mb-8 border-b border-gray-100 dark:border-dark-border pb-4">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Module Contents</h3>
              <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <nav className="flex flex-col space-y-2">
               {items.sort((a,b) => a.order_no - b.order_no).map(child => {
                 const linkPath = `/topic/${topic.full_path ? topic.full_path + '/' + child.slug : parentSlug ? parentSlug + '/' + child.slug : child.slug}`;
                 return (
                   <Link 
                     key={child.id}
                     to={linkPath}
                     onClick={onClose}
                     className="block px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                   >
                     {child.title}
                   </Link>
                 );
               })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

const TopicViewer = () => {
  const { "*": slug } = useParams();
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

  if (loading) return (
    <div className="max-w-[1920px] mx-auto p-8 w-full">
      <div className="w-48 h-8 bg-gray-200 dark:bg-dark-surface rounded animate-pulse mb-8"></div>
      <div className="flex gap-8">
        <div className="hidden lg:block w-72 h-[600px] bg-gray-200 dark:bg-dark-surface rounded-xl animate-pulse"></div>
        <div className="flex-1 space-y-6">
          <div className="w-3/4 h-12 bg-gray-200 dark:bg-dark-surface rounded-lg animate-pulse"></div>
          <div className="w-full h-96 bg-gray-200 dark:bg-dark-surface rounded-xl animate-pulse"></div>
        </div>
      </div>
    </div>
  );
  
  if (error || !data) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-full">
        <span className="material-symbols-rounded text-6xl text-red-400">sentiment_dissatisfied</span>
      </div>
      <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">{error || "Topic Not Found"}</h2>
      <Link to="/" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">Return Home</Link>
    </div>
  );

  const { topic, blocks, children } = data;
  const sortedBlocks = blocks.sort((a, b) => a.block_order - b.block_order);
  const hasContent = sortedBlocks.length > 0;
  const hasSidebar = children && children.length > 0;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Mobile Top Bar for Sidebar Toggle & Breadcrumbs */}
      <div className="lg:hidden bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border px-4 py-3 flex items-center justify-between sticky top-16 z-30">
         <div className="flex items-center gap-2 overflow-hidden">
            <Link to="/" className="text-gray-500 hover:text-primary-600 transition-colors shrink-0">
               <span className="material-symbols-rounded text-xl">home</span>
            </Link>
            <span className="text-gray-300 text-sm">/</span>
            <span className="font-semibold text-gray-900 dark:text-white truncate text-sm">{topic.title}</span>
         </div>
         {hasSidebar && (
           <button 
             onClick={() => setIsSidebarOpen(true)}
             className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
           >
             <span className="material-symbols-rounded">menu_book</span>
             Menu
           </button>
         )}
      </div>

      <div className="flex flex-1 max-w-[1920px] mx-auto w-full">
        {/* Sidebar Component */}
        {hasSidebar && (
           <Sidebar 
             items={children} 
             topic={topic} 
             parentSlug={slug} // Pass current slug to help build paths
             isOpen={isSidebarOpen} 
             onClose={() => setIsSidebarOpen(false)} 
           />
        )}

        {/* Main Content Area */}
        <main className={`flex-1 min-w-0 px-4 sm:px-8 lg:px-12 py-10 transition-all ${hasSidebar ? 'lg:max-w-[80%]' : 'w-full'}`}>
           {/* Desktop Breadcrumbs */}
           <nav className="hidden lg:flex items-center text-sm text-gray-500 mb-8 overflow-x-auto whitespace-nowrap pb-2">
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

           <div className="mb-10">
             <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-tight mb-6 font-display">{topic.title}</h1>
             {topic.description && (
                <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed border-l-4 border-primary-500 pl-6 whitespace-pre-line">
                  {topic.description}
                </p>
             )}
           </div>

           <div className="prose prose-lg dark:prose-invert max-w-none w-full">
              {hasContent ? (
                <div className="space-y-8">
                  {sortedBlocks.map(block => (
                     <div key={block.id}>
                        {block.components?.map((comp, i) => {
                          if (!comp?.json?.content) return null;
                          return <RichContent key={i} htmlContent={comp.json.content} />;
                        })}
                     </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-dark-surface/50 rounded-2xl border border-gray-100 dark:border-dark-border">
                   <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-400">
                      <span className="material-symbols-rounded text-3xl">description</span>
                   </div>
                   <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Content Available</h3>
                   <p className="text-gray-500 dark:text-gray-400">This topic currently has no written content.</p>
                   {hasSidebar && (
                     <p className="text-sm text-gray-400 mt-2">Use the sidebar to navigate to sub-topics.</p>
                   )}
                </div>
              )}
           </div>

           <div className="mt-16 pt-8 border-t border-gray-200 dark:border-dark-border flex justify-between items-center">
              <button 
                onClick={() => window.history.back()} 
                className="group flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors">
                  <span className="material-symbols-rounded text-sm">arrow_back</span>
                </div>
                Go Back
              </button>
              {/* Future: Add 'Next Topic' button here logic */}
           </div>
        </main>
      </div>
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
      <Footer />
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
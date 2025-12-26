import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { login, fetchRootTopics, fetchTopicBySlug, createTopic, deleteTopic, reorderTopics, saveTopicContent } from './services/api';
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

// --- Admin Modals ---

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, title, message, onConfirm, onCancel, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-dark-surface w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-dark-border">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            {isLoading && <span className="material-symbols-rounded animate-spin text-sm">progress_activity</span>}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

interface ContentEditorModalProps {
  isOpen: boolean;
  topicId: number;
  initialContent: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ContentEditorModal: React.FC<ContentEditorModalProps> = ({ isOpen, topicId, initialContent, onClose, onSuccess }) => {
  const [content, setContent] = useState(initialContent);
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync content when opening
  useEffect(() => {
    if (isOpen) setContent(initialContent || '');
  }, [isOpen, initialContent]);

  // Handle window resize to auto-adjust view mode for mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setViewMode('edit');
      else setViewMode('split');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveTopicContent(topicId, content);
      onSuccess();
      onClose();
    } catch (error) {
      alert('Failed to save content');
    } finally {
      setLoading(false);
    }
  };

  const insertAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const previousContent = content;
    const newContent = previousContent.substring(0, start) + textToInsert + previousContent.substring(end);
    
    setContent(newContent);
    
    // Restore focus and move cursor
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
    }, 0);
  };

  const ToolbarButton = ({ icon, label, insert }: { icon: string, label: string, insert: string }) => (
    <button 
      type="button"
      onClick={() => insertAtCursor(insert)}
      className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 min-w-[3rem] gap-1 group"
      title={label}
    >
      <span className="material-symbols-rounded text-xl group-hover:text-primary-600 dark:group-hover:text-primary-400">{icon}</span>
      <span className="text-[10px] font-medium hidden md:block">{label}</span>
    </button>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-dark-bg flex flex-col animate-fade-in">
      {/* Header */}
      <div className="h-16 px-6 border-b border-gray-200 dark:border-dark-border flex items-center justify-between bg-white dark:bg-dark-surface">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <span className="material-symbols-rounded">close</span>
          </button>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white hidden sm:block">Edit Content</h2>
        </div>
        
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 lg:hidden">
          <button 
            onClick={() => setViewMode('edit')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${viewMode === 'edit' ? 'bg-white dark:bg-dark-bg shadow text-primary-600' : 'text-gray-500'}`}
          >
            Editor
          </button>
          <button 
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${viewMode === 'preview' ? 'bg-white dark:bg-dark-bg shadow text-primary-600' : 'text-gray-500'}`}
          >
            Preview
          </button>
        </div>

        <button 
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-70 flex items-center gap-2 font-medium shadow-lg shadow-primary-500/20"
        >
          {loading ? <span className="material-symbols-rounded animate-spin">progress_activity</span> : <span className="material-symbols-rounded">save</span>}
          Save Changes
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface/50 overflow-x-auto flex gap-1 items-center no-scrollbar">
        <ToolbarButton icon="title" label="H1" insert={"<h1>Heading 1</h1>\n"} />
        <ToolbarButton icon="header" label="H2" insert={"<h2>Heading 2</h2>\n"} />
        <ToolbarButton icon="format_paragraph" label="Para" insert={"<p>Paragraph text...</p>\n"} />
        <div className="w-px h-8 bg-gray-300 dark:bg-gray-700 mx-1"></div>
        <ToolbarButton icon="format_bold" label="Bold" insert={"<b>Bold text</b>"} />
        <ToolbarButton icon="format_list_bulleted" label="List" insert={"<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>\n"} />
        <div className="w-px h-8 bg-gray-300 dark:bg-gray-700 mx-1"></div>
        <ToolbarButton icon="code_blocks" label="Code" insert={"<code language=\"javascript\">\nconsole.log('Hello');\n</code>\n"} />
        <ToolbarButton icon="tab" label="Code Tab" insert={"<code-collection>\n  <code language=\"python\">\nprint('Hello')\n  </code>\n  <code language=\"javascript\">\nconsole.log('Hello')\n  </code>\n</code-collection>\n"} />
        <div className="w-px h-8 bg-gray-300 dark:bg-gray-700 mx-1"></div>
        <ToolbarButton icon="info" label="Note" insert={"<note type=\"info\">Information note...</note>\n"} />
        <ToolbarButton icon="warning" label="Warning" insert={"<note type=\"warning\">Warning note...</note>\n"} />
        <ToolbarButton icon="check_circle" label="Success" insert={"<note type=\"success\">Success note...</note>\n"} />
        <div className="w-px h-8 bg-gray-300 dark:bg-gray-700 mx-1"></div>
        <ToolbarButton icon="image" label="Image" insert={"<img src=\"https://...\" />\n"} />
        <ToolbarButton icon="view_carousel" label="Carousel" insert={"<carousel>\n  <img src=\"https://...\" />\n  <img src=\"https://...\" />\n</carousel>\n"} />
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Input Pane */}
        <div className={`flex-1 flex flex-col border-r border-gray-200 dark:border-dark-border transition-all ${viewMode === 'preview' ? 'hidden' : 'block'}`}>
          <div className="bg-[#1e1e1e] text-gray-400 text-xs px-4 py-1 font-mono uppercase tracking-wider flex justify-between">
            <span>Source Code (HTML/XML)</span>
            <span>{content.length} chars</span>
          </div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 w-full bg-[#1e1e1e] text-gray-200 font-mono text-sm p-6 outline-none resize-none leading-relaxed"
            placeholder="Start typing your rich content here..."
            spellCheck={false}
          />
        </div>

        {/* Preview Pane */}
        <div className={`flex-1 bg-gray-50 dark:bg-dark-bg overflow-y-auto transition-all ${viewMode === 'edit' ? 'hidden' : 'block'}`}>
          <div className="sticky top-0 bg-white/90 dark:bg-dark-surface/90 backdrop-blur border-b border-gray-200 dark:border-dark-border px-6 py-2 z-10 flex justify-between items-center">
             <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Live Preview</span>
          </div>
          <div className="p-8 max-w-4xl mx-auto prose prose-lg dark:prose-invert">
             <RichContent htmlContent={content} />
          </div>
        </div>
      </div>
    </div>
  );
};

interface TopicFormProps {
  parentId: number | null;
  currentOrder: number;
  onClose: () => void;
  onSuccess: () => void;
}

const TopicFormModal: React.FC<TopicFormProps> = ({ parentId, currentOrder, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-generate slug from title
  useEffect(() => {
    setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
  }, [title]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await createTopic({
        title,
        slug,
        description,
        parent_id: parentId,
        order_no: currentOrder
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create topic');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-dark-surface w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-dark-border">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {parentId ? 'Add Subtopic' : 'Add New Topic'}
        </h3>
        
        {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input 
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-gray-50 dark:bg-dark-bg dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug</label>
            <input 
              required
              value={slug}
              onChange={e => setSlug(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-gray-50 dark:bg-dark-bg dark:text-white focus:ring-2 focus:ring-primary-500 outline-none font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea 
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-gray-50 dark:bg-dark-bg dark:text-white focus:ring-2 focus:ring-primary-500 outline-none resize-none"
            />
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">Cancel</button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-70 flex items-center gap-2"
            >
              {loading && <span className="material-symbols-rounded animate-spin text-sm">progress_activity</span>}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

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
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-end gap-1">
                     {user.role === 'admin' && <span className="material-symbols-rounded text-[10px] text-primary-500">verified_user</span>}
                     {user.role}
                  </p>
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
            Empowering learners with interactive, structured content.
          </p>
        </div>
        
        {/* Simplified footer columns */}
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white mb-4">Platform</h4>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li><Link to="/" className="hover:text-primary-600">Browse Topics</Link></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white mb-4">Resources</h4>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li><Link to="/" className="hover:text-primary-600">Documentation</Link></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white mb-4">Legal</h4>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li><Link to="/" className="hover:text-primary-600">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-100 dark:border-gray-800 mt-12 pt-8 text-center text-sm text-gray-500 dark:text-gray-500">
        © {new Date().getFullYear()} BrainLoom Inc.
      </div>
    </div>
  </footer>
);

const TopicCard: React.FC<{ 
  topic: Topic; 
  draggable?: boolean; 
  onDragStart?: (e: React.DragEvent, id: number) => void; 
  onDragOver?: (e: React.DragEvent, id: number) => void;
  onDrop?: (e: React.DragEvent, id: number) => void;
  isAdmin?: boolean;
  onDelete?: (id: number) => void;
}> = ({ topic, draggable, onDragStart, onDragOver, onDrop, isAdmin, onDelete }) => {
  const gradients = [
    'from-blue-600 to-cyan-500',
    'from-purple-600 to-pink-500',
    'from-emerald-600 to-teal-500',
    'from-orange-500 to-amber-500'
  ];
  const gradient = gradients[topic.id % gradients.length];

  return (
    <div 
      draggable={draggable}
      onDragStart={(e) => onDragStart && onDragStart(e, topic.id)}
      onDragOver={(e) => onDragOver && onDragOver(e, topic.id)}
      onDrop={(e) => onDrop && onDrop(e, topic.id)}
      className={`group relative flex flex-col h-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden transition-all duration-300 ${draggable ? 'cursor-grab active:cursor-grabbing hover:shadow-2xl hover:scale-[1.02]' : 'hover:shadow-xl hover:-translate-y-1'}`}
    >
      <Link to={`/topic/${topic.slug}`} className="block flex-1 flex flex-col h-full">
        <div className={`h-36 w-full bg-gradient-to-br ${gradient} relative overflow-hidden`}>
           <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
        </div>
        <div className="p-6 flex flex-col flex-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-display">{topic.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 flex-1 whitespace-pre-line leading-relaxed">
            {topic.description || "Start your journey into this topic."}
          </p>
          <div className="flex items-center text-primary-600 dark:text-primary-400 text-sm font-semibold mt-auto">
            Start Learning <span className="material-symbols-rounded text-[18px] ml-1">arrow_forward</span>
          </div>
        </div>
      </Link>
      
      {isAdmin && (
        <button 
          type="button"
          onClick={(e) => {
             e.preventDefault();
             e.stopPropagation();
             onDelete?.(topic.id);
          }}
          className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-black/50 backdrop-blur-md rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm opacity-100 lg:opacity-0 lg:group-hover:opacity-100 z-20"
          title="Delete Topic"
        >
          <span className="material-symbols-rounded text-sm">delete</span>
        </button>
      )}
    </div>
  );
};

// ... FeatureCard and StatItem components remain same ...
const FeatureCard = ({ icon, title, description }: { icon: string, title: string, description: string }) => (
  <div className="bg-white dark:bg-dark-bg p-8 rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm hover:shadow-md transition-all">
    <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-xl flex items-center justify-center mb-6">
      <span className="material-symbols-rounded text-2xl">{icon}</span>
    </div>
    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 font-display">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">{description}</p>
  </div>
);

const StatItem = ({ count, label }: { count: string, label: string }) => (
  <div className="flex flex-col items-center justify-center p-4">
    <span className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-1 font-display">{count}</span>
    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{label}</span>
  </div>
);

const Home = () => {
  const { user } = useContext(AuthContext);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  
  // Admin States
  const [isReordering, setIsReordering] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
  const [deleting, setDeleting] = useState(false);

  const isAdmin = user?.role === 'admin';

  const loadTopics = () => {
    setLoading(true);
    fetchRootTopics()
      .then(res => {
        const sorted = res.topics.sort((a,b) => a.order_no - b.order_no);
        setTopics(sorted);
        setFilteredTopics(sorted);
      })
      .catch(() => setError('Failed to load topics'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTopics();
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

  // Drag and Drop Logic for Home (Root Topics)
  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === id) return;

    // Simple swap visual logic
    const items = [...filteredTopics];
    const draggedIdx = items.findIndex(t => t.id === draggedItem);
    const targetIdx = items.findIndex(t => t.id === id);
    
    if (draggedIdx === -1 || targetIdx === -1) return;

    const [reorderedItem] = items.splice(draggedIdx, 1);
    items.splice(targetIdx, 0, reorderedItem);
    setFilteredTopics(items);
  };

  const handleDrop = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    setDraggedItem(null);
  };

  const saveOrder = async () => {
    if (!isAdmin) return;
    try {
      const reorderPayload = filteredTopics.map((t, index) => ({ id: t.id, order_no: index }));
      await reorderTopics('root', reorderPayload);
      setIsReordering(false);
      setTopics(filteredTopics); // Sync main state
      alert('Order saved successfully');
    } catch (err) {
      alert('Failed to save order');
      loadTopics(); // Revert
    }
  };

  const requestDelete = (id: number) => {
    setDeleteConfirmation({ isOpen: true, id });
  }

  const confirmDelete = async () => {
    if (!isAdmin || deleteConfirmation.id === null) return;
    setDeleting(true);
    try {
      await deleteTopic(deleteConfirmation.id);
      setTopics(topics.filter(t => t.id !== deleteConfirmation.id));
      setFilteredTopics(filteredTopics.filter(t => t.id !== deleteConfirmation.id));
      setDeleteConfirmation({ isOpen: false, id: null });
    } catch (err) {
      alert('Failed to delete topic');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <ConfirmationModal 
        isOpen={deleteConfirmation.isOpen}
        title="Delete Topic"
        message="Are you sure you want to delete this topic? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, id: null })}
        isLoading={deleting}
      />

      {showAddModal && (
        <TopicFormModal 
          parentId={null} 
          currentOrder={topics.length} 
          onClose={() => setShowAddModal(false)}
          onSuccess={loadTopics}
        />
      )}

      {/* Hero Section */}
      <div className="relative bg-white dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[500px] h-[500px] bg-primary-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl"></div>
        
        <div className="max-w-[1920px] mx-auto px-4 py-24 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tight mb-6 font-display">
            Expand Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600">Knowledge</span>
          </h1>
          
          <div className="max-w-xl mx-auto mb-10 relative">
            <input
              type="text"
              placeholder="Search topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-full border border-gray-200 dark:border-dark-border bg-white/50 dark:bg-dark-surface/50 backdrop-blur-sm shadow-xl focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white text-lg"
            />
            <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-2xl">search</span>
          </div>
        </div>
      </div>

      {/* Admin Toolbar */}
      {isAdmin && (
        <div className="bg-gray-100 dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border py-3">
          <div className="max-w-[1920px] mx-auto px-4 flex items-center justify-end gap-3">
             <span className="text-xs font-bold uppercase text-gray-500 mr-2">Admin Controls</span>
             {isReordering ? (
               <button onClick={saveOrder} className="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors">
                 Save Order
               </button>
             ) : (
               <button onClick={() => setIsReordering(true)} className="px-4 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                 Reorder Topics
               </button>
             )}
             <button onClick={() => setShowAddModal(true)} className="px-4 py-1.5 bg-primary-600 text-white rounded text-sm font-medium hover:bg-primary-700 transition-colors flex items-center gap-1">
               <span className="material-symbols-rounded text-sm">add</span> Add Topic
             </button>
          </div>
        </div>
      )}

      {/* Topics Section */}
      <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1,2,3,4].map(i => <div key={i} className="h-64 bg-gray-100 dark:bg-dark-surface rounded-xl animate-pulse"></div>)}
          </div>
        ) : filteredTopics.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 dark:bg-dark-surface/50 rounded-2xl border border-dashed border-gray-200 dark:border-dark-border">
            <span className="material-symbols-rounded text-5xl mb-4 text-gray-300 dark:text-gray-600">search_off</span>
            <p className="text-gray-500 dark:text-gray-400 text-lg">No topics found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 transition-all">
            {filteredTopics.map(topic => (
              <TopicCard 
                key={topic.id} 
                topic={topic} 
                draggable={isReordering}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isAdmin={isAdmin}
                onDelete={requestDelete}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Footer is handled by layout */}
    </div>
  );
};

// Sidebar Component
const Sidebar = ({ items, topic, parentSlug, isOpen, onClose, onRefresh }: { items: Topic[], topic: Topic, parentSlug?: string, isOpen: boolean, onClose: () => void, onRefresh?: () => void }) => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';
  const [localItems, setLocalItems] = useState<Topic[]>(items || []);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddSubModal, setShowAddSubModal] = useState(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [deleteConf, setDeleteConf] = useState<{isOpen: boolean, id: number | null}>({isOpen: false, id: null});
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if(items) setLocalItems(items.sort((a, b) => a.order_no - b.order_no));
  }, [items]);

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    if (draggedId === null || draggedId === id) return;

    const newList = [...localItems];
    const dragIdx = newList.findIndex(i => i.id === draggedId);
    const dropIdx = newList.findIndex(i => i.id === id);

    if (dragIdx !== -1 && dropIdx !== -1) {
       const [moved] = newList.splice(dragIdx, 1);
       newList.splice(dropIdx, 0, moved);
       setLocalItems(newList);
    }
  };

  const saveOrder = async () => {
    try {
      const payload = localItems.map((item, idx) => ({ id: item.id, order_no: idx }));
      await reorderTopics(topic.id, payload);
      setIsEditMode(false);
      onRefresh?.(); // Reload parent data
    } catch (e) {
      alert('Failed to save order');
    }
  };

  const confirmDeleteSubtopic = async () => {
     if(!deleteConf.id) return;
     setDeleting(true);
     try {
       await deleteTopic(deleteConf.id);
       setLocalItems(localItems.filter(i => i.id !== deleteConf.id));
       setDeleteConf({isOpen: false, id: null});
       onRefresh?.();
     } catch(e) { 
        alert('Delete failed'); 
     } finally {
        setDeleting(false);
     }
  };

  if (!localItems || (localItems.length === 0 && !isAdmin)) return null;

  return (
    <>
      <ConfirmationModal 
        isOpen={deleteConf.isOpen}
        title="Delete Subtopic"
        message="Are you sure you want to delete this subtopic?"
        onCancel={() => setDeleteConf({isOpen: false, id: null})}
        onConfirm={confirmDeleteSubtopic}
        isLoading={deleting}
      />

      {showAddSubModal && (
         <TopicFormModal 
            parentId={topic.id} 
            currentOrder={localItems.length} 
            onClose={() => setShowAddSubModal(false)}
            onSuccess={() => { onRefresh?.(); }}
         />
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 shrink-0 border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg min-h-[calc(100vh-64px)]">
         <div className="sticky top-16 p-6 overflow-y-auto max-h-[calc(100vh-64px)]">
           <div className="flex items-center justify-between mb-6">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
               In this Module
             </h3>
             {isAdmin && (
               <div className="flex gap-1">
                 {isEditMode ? (
                   <button onClick={saveOrder} className="text-xs text-green-600 hover:text-green-700 font-bold">SAVE</button>
                 ) : (
                   <button onClick={() => setIsEditMode(true)} className="text-xs text-primary-600 hover:text-primary-700">EDIT</button>
                 )}
                 <button onClick={() => setShowAddSubModal(true)} className="text-xs text-primary-600 hover:text-primary-700 ml-2">
                    <span className="material-symbols-rounded text-sm align-middle">add</span>
                 </button>
               </div>
             )}
           </div>
           
           <nav className="flex flex-col space-y-1">
             {localItems.map(child => {
               const linkPath = `/topic/${topic.full_path ? topic.full_path + '/' + child.slug : parentSlug ? parentSlug + '/' + child.slug : child.slug}`;
               return (
                 <div 
                   key={child.id}
                   draggable={isEditMode}
                   onDragStart={(e) => handleDragStart(e, child.id)}
                   onDragOver={(e) => handleDragOver(e, child.id)}
                   className={`relative group flex items-center justify-between ${isEditMode ? 'cursor-move border border-dashed border-gray-200 p-1 mb-1 rounded bg-gray-50' : ''}`}
                 >
                   <Link 
                     to={linkPath}
                     className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 hover:text-primary-600 dark:hover:text-primary-400 transition-colors ${isEditMode ? 'pointer-events-none' : ''}`}
                   >
                     <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-primary-500 transition-colors"></span>
                     <span className="truncate">{child.title}</span>
                   </Link>
                   {isEditMode && (
                     <button 
                       type="button"
                       onClick={(e) => {
                         e.stopPropagation();
                         e.preventDefault();
                         setDeleteConf({isOpen: true, id: child.id});
                       }}
                       className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                     >
                       <span className="material-symbols-rounded text-sm">close</span>
                     </button>
                   )}
                 </div>
               );
             })}
           </nav>
         </div>
      </aside>

      {/* Mobile Sidebar logic (omitted complex reorder for mobile for brevity, keeping nav) */}
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
               {localItems.map(child => {
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
            {isAdmin && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => setShowAddSubModal(true)} className="w-full py-2 bg-primary-600 text-white rounded-lg">
                  Add Subtopic
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const TopicViewer = () => {
  const { "*": slug } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';
  const [data, setData] = useState<TopicDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadTopicData = () => {
    if (!slug) return;
    setLoading(true);
    fetchTopicBySlug(slug)
      .then(setData)
      .catch(err => {
        console.error(err);
        setError('Topic not found or failed to load.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTopicData();
  }, [slug]);

  const confirmDeletePage = async () => {
     if (!data) return;
     setDeleting(true);
     try {
       await deleteTopic(data.topic.id);
       // Navigate up one level if possible, else home
       const segments = slug?.split('/') || [];
       if (segments.length > 1) {
         segments.pop();
         navigate(`/topic/${segments.join('/')}`);
       } else {
         navigate('/');
       }
     } catch (e) {
       alert("Failed to delete topic");
     } finally {
        setDeleting(false);
        setShowDeleteModal(false);
     }
  };

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
  // Always show sidebar if admin to allow adding subtopics
  const hasSidebar = (children && children.length > 0) || isAdmin;

  // Prepare initial content for editor
  const editorInitialContent = sortedBlocks.length > 0 
    ? sortedBlocks[0].components?.[0]?.json?.content || '' 
    : '';

  return (
    <div className="flex flex-col min-h-screen">
      <ConfirmationModal 
        isOpen={showDeleteModal}
        title="Delete Page"
        message="Are you sure you want to delete this page and all its contents? This cannot be undone."
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={confirmDeletePage}
        isLoading={deleting}
      />

      {showEditor && (
        <ContentEditorModal
          isOpen={showEditor}
          topicId={topic.id}
          initialContent={editorInitialContent}
          onClose={() => setShowEditor(false)}
          onSuccess={loadTopicData}
        />
      )}

      {/* Mobile Top Bar */}
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
        {hasSidebar && (
           <Sidebar 
             items={children} 
             topic={topic} 
             parentSlug={slug} 
             isOpen={isSidebarOpen} 
             onClose={() => setIsSidebarOpen(false)}
             onRefresh={loadTopicData}
           />
        )}

        <main className={`flex-1 min-w-0 px-4 sm:px-8 lg:px-12 py-10 transition-all ${hasSidebar ? 'lg:max-w-[80%]' : 'w-full'}`}>
           <div className="flex justify-between items-start mb-6">
             {/* Desktop Breadcrumbs */}
             <nav className="hidden lg:flex items-center text-sm text-gray-500 overflow-x-auto whitespace-nowrap pb-2">
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

             {isAdmin && (
               <div className="flex items-center gap-2">
                 <button 
                   onClick={() => setShowEditor(true)}
                   className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium transition-colors shadow-sm"
                 >
                   <span className="material-symbols-rounded text-base">edit_note</span>
                   <span className="hidden sm:inline">Edit Content</span>
                 </button>
                 <button 
                   type="button"
                   onClick={() => setShowDeleteModal(true)}
                   className="flex items-center gap-2 px-3 py-1.5 text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 text-sm font-medium transition-colors"
                 >
                   <span className="material-symbols-rounded text-base">delete</span> 
                   <span className="hidden sm:inline">Delete Page</span>
                 </button>
               </div>
             )}
           </div>

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
           </div>
        </main>
      </div>
    </div>
  );
};

// ... Login Component remains same ...
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
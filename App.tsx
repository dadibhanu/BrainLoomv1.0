
import React, { useState, useEffect, createContext, useContext, useRef, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { login, fetchRootTopics, fetchTopicBySlug, createTopic, deleteTopic, reorderTopics, saveTopicContent, uploadMedia } from './services/api';
import { RichContent } from './components/RichContent';
import { Topic, User, Block, TopicDetailResponse, EditorBlock, BlockType } from './types';
import { 
  Toolbar, BlockActions, TextBlock, CodeBlock, MultiCodeBlock, NoteBlock, ImageBlock, CarouselBlock 
} from './components/EditorElements';

// --- AI Setup ---
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Contexts ---
interface ThemeContextType { isDark: boolean; toggleTheme: () => void; }
const ThemeContext = createContext<ThemeContextType>({ isDark: false, toggleTheme: () => {} });

interface AuthContextType { user: User | null; token: string | null; loginUser: (email: string, pass: string) => Promise<void>; logout: () => void; isAdmin: boolean; }
const AuthContext = createContext<AuthContextType>({ user: null, token: null, loginUser: async () => {}, logout: () => {}, isAdmin: false });

// --- Layout Components ---

const Navbar = () => {
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const { user, logout, isAdmin } = useContext(AuthContext);
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-md border-b border-gray-200 dark:border-dark-border transition-colors duration-300">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-lg bg-primary-600 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <span className="material-symbols-rounded">school</span>
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-gray-900 dark:text-white">BrainLoom</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-6">
               <Link to="/" className={`text-sm font-semibold hover:text-primary-600 transition-colors ${location.pathname === '/' ? 'text-primary-600' : 'text-gray-500'}`}>Explore</Link>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            {isAdmin && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-full border border-primary-100 dark:border-primary-800">
                <span className="material-symbols-rounded text-base">security</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Admin</span>
              </div>
            )}
            
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400">
              <span className="material-symbols-rounded text-[20px]">{isDark ? 'light_mode' : 'dark_mode'}</span>
            </button>
            
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                   <div className="text-xs font-bold text-gray-900 dark:text-white">{user.name}</div>
                   <div className="text-[10px] text-gray-400 uppercase tracking-tighter">Authorized</div>
                </div>
                <button onClick={logout} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors border border-gray-200 dark:border-dark-border" title="Logout">
                  <span className="material-symbols-rounded">logout</span>
                </button>
              </div>
            ) : (
              <Link to="/login" className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition-all shadow-md shadow-primary-500/20">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

const TopicCard: React.FC<{ topic: Topic }> = ({ topic }) => (
  <Link to={`/topic/${topic.slug}`} className="group flex flex-col bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl overflow-hidden hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 h-full">
    <div className="h-44 bg-gradient-to-br from-primary-600 to-indigo-700 relative overflow-hidden">
       <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500"></div>
       <div className="absolute inset-0 flex items-center justify-center">
          <span className="material-symbols-rounded text-white/20 text-7xl group-hover:scale-110 transition-transform duration-700">auto_stories</span>
       </div>
    </div>
    <div className="p-6 flex flex-col flex-1">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-display leading-tight">{topic.title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed h-10 mb-6">{topic.description || 'Embark on this professional learning track curated for expertise.'}</p>
      <div className="mt-auto flex items-center justify-between text-primary-600 dark:text-primary-400 text-[10px] font-black uppercase tracking-widest border-t border-gray-50 dark:border-gray-800 pt-4">
        Open Module <span className="material-symbols-rounded text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
      </div>
    </div>
  </Link>
);

// --- Content Parsing Logic ---

const blocksToHtml = (blocks: EditorBlock[]): string => {
  return blocks.map(block => {
    switch (block.type) {
      case 'heading': return `<h2>${block.content}</h2>`;
      case 'text': return `<p>${block.content}</p>`;
      case 'code': return `<code language="${block.metadata?.language || 'javascript'}">${block.content}</code>`;
      case 'multi-code': 
        const snippets = block.metadata?.snippets?.map(s => `<snippet label="${s.label}" language="${s.language}">${s.content}</snippet>`).join('') || '';
        return `<multicode>${snippets}</multicode>`;
      case 'note': return `<note type="${block.metadata?.level || 'info'}">${block.content}</note>`;
      case 'image': return `<img src="${block.content}" alt="Topic Image" />`;
      case 'carousel': 
        const imgs = block.metadata?.images?.map(img => `<img src="${img.url}" alt="${img.caption || ''}" />`).join('') || '';
        return `<carousel>${imgs}</carousel>`;
      default: return '';
    }
  }).join('\n');
};

const htmlToBlocks = (html: string): EditorBlock[] => {
  const blocks: EditorBlock[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const processNode = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const id = Math.random().toString(36).substr(2, 9);
      
      if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
        blocks.push({ id, type: 'heading', content: el.innerHTML });
      } else if (tag === 'p') {
        blocks.push({ id, type: 'text', content: el.innerHTML });
      } else if (tag === 'code') {
        blocks.push({ id, type: 'code', content: el.textContent || '', metadata: { language: el.getAttribute('language') || 'javascript' } });
      } else if (tag === 'multicode') {
        const snippets = Array.from(el.querySelectorAll('snippet')).map(s => ({
          id: Math.random().toString(36).substr(2, 9),
          label: s.getAttribute('label') || 'Snippet',
          language: s.getAttribute('language') || 'javascript',
          content: s.textContent || ''
        }));
        blocks.push({ id, type: 'multi-code', content: '', metadata: { snippets } });
      } else if (tag === 'note') {
        blocks.push({ id, type: 'note', content: el.innerHTML, metadata: { level: (el.getAttribute('type') as any) || 'info' } });
      } else if (tag === 'img') {
        blocks.push({ id, type: 'image', content: el.getAttribute('src') || '' });
      } else if (tag === 'carousel') {
        const images = Array.from(el.querySelectorAll('img')).map((img, idx) => ({
          id: Math.random().toString(36).substr(2, 9),
          url: img.getAttribute('src') || '',
          caption: img.getAttribute('alt') || ''
        }));
        blocks.push({ id, type: 'carousel', content: '', metadata: { images } });
      } else {
        Array.from(el.childNodes).forEach(processNode);
      }
    }
  };

  Array.from(doc.body.childNodes).forEach(processNode);
  return blocks.length > 0 ? blocks : [{ id: 'init', type: 'text', content: html }];
};

// --- Page Components ---

const Home = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRootTopics().then(res => setTopics(res.topics)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-fade-in">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-16 mb-24">
        <div className="max-w-2xl text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-[10px] font-black uppercase tracking-widest mb-6 border border-primary-100 dark:border-primary-800">
            <span className="material-symbols-rounded text-sm">auto_awesome</span>
            Intelligence Driven Education
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tight mb-8 font-display leading-[1.1]">
            Unlock Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-500">Professional</span> Potential
          </h1>
          <p className="text-xl text-gray-500 dark:text-gray-400 leading-relaxed mb-10">
            BrainLoom provides structured, rich-media learning paths designed to take you from fundamentals to mastery.
          </p>
          <div className="flex flex-wrap justify-center lg:justify-start gap-4">
            <Link to="/" className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl shadow-xl shadow-primary-500/20 transition-all hover:scale-105 active:scale-95">
              Get Started Free
            </Link>
          </div>
        </div>
        <div className="w-full lg:w-1/2 relative">
           <div className="aspect-square bg-gradient-to-tr from-primary-100 to-indigo-100 dark:from-primary-900/10 dark:to-indigo-900/10 rounded-[4rem] flex items-center justify-center relative overflow-hidden border border-white dark:border-gray-800 shadow-2xl">
              <span className="material-symbols-rounded text-[200px] text-primary-600/10 animate-pulse">architecture</span>
              <div className="absolute inset-0 bg-white/40 dark:bg-dark-bg/20 backdrop-blur-3xl"></div>
              <div className="relative grid grid-cols-2 gap-6 p-12">
                 {[1,2,3,4].map(i => (
                   <div key={i} className={`h-40 rounded-3xl shadow-xl animate-fade-in ${i % 2 === 0 ? 'bg-primary-600 text-white' : 'bg-white dark:bg-dark-surface'}`} style={{ animationDelay: `${i * 0.1}s` }}></div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      <div className="mb-12">
         <h2 className="text-3xl font-black text-gray-900 dark:text-white font-display mb-2">Featured Tracks</h2>
         <p className="text-gray-500 dark:text-gray-400">Curated modules hand-picked for high-performance skills.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1,2,3,4].map(i => <div key={i} className="h-64 bg-gray-100 dark:bg-dark-surface rounded-2xl animate-pulse"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {topics.map(topic => <TopicCard key={topic.id} topic={topic} />)}
        </div>
      )}
    </div>
  );
};

const TopicViewer = () => {
  const { "*": slug } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useContext(AuthContext);
  const [data, setData] = useState<TopicDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [isEditMode, setIsEditMode] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [editorBlocks, setEditorBlocks] = useState<EditorBlock[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const loadTopic = () => {
    if (!slug) return;
    setLoading(true);
    fetchTopicBySlug(slug)
      .then(res => {
        setData(res);
        if (res.blocks.length > 0) {
          setEditorBlocks(htmlToBlocks(res.blocks[0].components[0]?.json.content || ''));
        } else {
          setEditorBlocks([]);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTopic(); }, [slug]);

  const handleDeleteTopic = async () => {
    if (!data || !confirm(`Are you sure you want to delete "${data.topic.title}" and all its content?`)) return;
    try {
      await deleteTopic(data.topic.id);
      navigate('/');
    } catch (e) {
      alert('Delete failed');
    }
  };

  const handleSave = async () => {
    if (!data) return;
    setIsSaving(true);
    try {
      const html = blocksToHtml(editorBlocks);
      await saveTopicContent(data.topic.id, html, data.blocks[0]?.id);
      setIsEditMode(false);
      loadTopic();
    } catch (e) {
      alert('Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBlock = (type: BlockType) => {
    const newBlock: EditorBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: '',
      metadata: type === 'code' 
        ? { language: 'javascript' } 
        : type === 'multi-code' 
        ? { snippets: [{ id: '1', label: 'Index', language: 'javascript', content: '' }] }
        : type === 'note' 
        ? { level: 'info' } 
        : type === 'carousel' 
        ? { images: [] } 
        : {}
    };
    setEditorBlocks(prev => [...prev, newBlock]);
  };

  const updateBlock = (updated: EditorBlock) => {
    setEditorBlocks(prev => prev.map(b => b.id === updated.id ? updated : b));
  };

  const deleteBlock = (id: string) => {
    setEditorBlocks(prev => prev.filter(b => b.id !== id));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newBlocks = [...editorBlocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newBlocks.length) return;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    setEditorBlocks(newBlocks);
  };

  const handleAiAssist = async () => {
    if (!data) return;
    setIsAiLoading(true);
    try {
      const ai = getAi();
      const prompt = `Write an educational module block about "${data.topic.title}". Return ONLY valid JSON: { "heading": "Title", "content": "Instructional text" }`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: "application/json" } });
      const result = JSON.parse(response.text || '{}');
      
      const newGenerated: EditorBlock[] = [];
      if (result.heading) newGenerated.push({ id: Math.random().toString(36).substr(2, 9), type: 'heading', content: result.heading });
      if (result.content) newGenerated.push({ id: Math.random().toString(36).substr(2, 9), type: 'text', content: result.content });
      
      setEditorBlocks(prev => [...prev, ...newGenerated]);
    } catch (e) {
      alert('AI assist failed.');
    } finally {
      setIsAiLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-primary-600 font-bold">Synchronizing Track...</div>;
  if (!data) return <div className="p-20 text-center text-red-500">Track not found.</div>;

  const { topic, children } = data;

  const NavigationList = ({ mobile = false }) => {
    const sortedChildren = children?.sort((a,b) => a.order_no - b.order_no) || [];
    if (sortedChildren.length === 0) return <div className="py-8 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Single Track Module</div>;
    
    return sortedChildren.map((child, idx) => (
      <Link 
        key={child.id}
        to={`/topic/${slug}/${child.slug}`}
        onClick={() => mobile && setIsMobileNavOpen(false)}
        className="flex items-center gap-4 p-4 rounded-2xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-dark-surface hover:text-primary-600 hover:shadow-lg transition-all group border border-transparent hover:border-gray-100 dark:hover:border-dark-border"
      >
        <span className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-dark-bg flex items-center justify-center text-[10px] font-black group-hover:bg-primary-600 group-hover:text-white transition-all">
          {idx + 1}
        </span>
        <span className="truncate flex-1">{child.title}</span>
      </Link>
    ));
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg transition-colors duration-300">
      {/* Header Area */}
      <div className="max-w-[1920px] mx-auto px-4 py-16 border-b border-gray-100 dark:border-dark-border mb-16">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-12">
          <div className="flex-1">
            <div className="flex items-center gap-3 text-xs font-black text-primary-600 dark:text-primary-400 uppercase tracking-[0.2em] mb-6">
              <Link to="/" className="hover:text-primary-700 transition-colors">Platform</Link>
              <span className="text-gray-300 dark:text-gray-700">/</span>
              <span>Curriculum</span>
            </div>
            <h1 className="text-4xl md:text-7xl font-black text-gray-900 dark:text-white font-display mb-6 leading-tight tracking-tight">{topic.title}</h1>
            <p className="text-xl text-gray-500 dark:text-gray-400 leading-relaxed max-w-4xl font-medium">{topic.description || 'Professional instruction designed for precision skill acquisition.'}</p>
          </div>
          {isAdmin && (
            <div className="flex gap-4 shrink-0">
              <button onClick={handleDeleteTopic} className="p-4 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all border border-red-100" title="Delete entire topic">
                <span className="material-symbols-rounded">delete_forever</span>
              </button>
              {isEditMode ? (
                <>
                  <button onClick={handleSave} disabled={isSaving} className="px-8 py-4 bg-green-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-green-500/20 flex items-center gap-2 hover:bg-green-700 transition-all">
                    {isSaving ? <span className="material-symbols-rounded animate-spin text-base">sync</span> : <span className="material-symbols-rounded text-base">publish</span>}
                    Publish
                  </button>
                  <button onClick={() => setIsEditMode(false)} className="px-8 py-4 bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-gray-300 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-gray-200 transition-all">
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditMode(true)} className="px-8 py-4 bg-primary-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-primary-500/20 flex items-center gap-2 hover:bg-primary-700 transition-all">
                  <span className="material-symbols-rounded text-base">edit_note</span>
                  Editor Mode
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-32">
        <div className="flex flex-col lg:flex-row gap-20">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {isEditMode ? (
              <div className="animate-fade-in relative">
                <Toolbar onAddBlock={handleAddBlock} onAiAssist={handleAiAssist} isAiLoading={isAiLoading} />
                
                <div className="space-y-6 pt-16">
                  {editorBlocks.map((block, idx) => (
                    <div key={block.id} className="relative group p-2 border border-transparent hover:border-primary-100 dark:hover:border-primary-900/20 rounded-2xl transition-all">
                      <BlockActions 
                        onDelete={() => deleteBlock(block.id)}
                        onMoveUp={() => moveBlock(idx, 'up')}
                        onMoveDown={() => moveBlock(idx, 'down')}
                        isFirst={idx === 0}
                        isLast={idx === editorBlocks.length - 1}
                      />
                      {block.type === 'heading' || block.type === 'text' ? <TextBlock block={block} onChange={updateBlock} /> : null}
                      {block.type === 'code' ? <CodeBlock block={block} onChange={updateBlock} /> : null}
                      {block.type === 'multi-code' ? <MultiCodeBlock block={block} onChange={updateBlock} /> : null}
                      {block.type === 'note' ? <NoteBlock block={block} onChange={updateBlock} /> : null}
                      {block.type === 'image' ? <ImageBlock block={block} onChange={updateBlock} /> : null}
                      {block.type === 'carousel' ? <CarouselBlock block={block} onChange={updateBlock} /> : null}
                    </div>
                  ))}
                  
                  {editorBlocks.length === 0 && (
                     <div className="text-center py-32 border-2 border-dashed border-gray-100 dark:border-dark-border rounded-[2.5rem] bg-gray-50/50 dark:bg-dark-surface/10">
                        <span className="material-symbols-rounded text-6xl text-gray-200 dark:text-gray-800 mb-6">edit_square</span>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Canvas is empty. Add blocks from the toolbar above.</p>
                     </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="animate-fade-in">
                {data.blocks.length > 0 ? (
                  data.blocks.map(b => (
                    <RichContent key={b.id} htmlContent={b.components[0]?.json.content || ''} />
                  ))
                ) : (
                  <div className="text-center py-32 bg-gray-50/50 dark:bg-dark-surface/20 rounded-[2.5rem] border border-gray-100 dark:border-dark-border">
                    <span className="material-symbols-rounded text-7xl text-gray-200 dark:text-gray-700 mb-6">auto_stories</span>
                    <p className="text-gray-500 font-bold text-lg">Instructional content is being prepared.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop Sidebar Area */}
          <aside className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-28">
              <div className="bg-gray-50 dark:bg-dark-surface/30 rounded-3xl p-8 border border-gray-100 dark:border-dark-border">
                <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-8">Navigation</h3>
                <nav className="space-y-2">
                  <NavigationList />
                </nav>
              </div>

              <div className="mt-8 p-8 rounded-3xl bg-gray-900 text-white shadow-2xl relative overflow-hidden group">
                 <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-600/20 rounded-full blur-3xl group-hover:bg-primary-600/40 transition-all duration-700"></div>
                 <span className="material-symbols-rounded text-primary-400 mb-6 text-3xl">verified_user</span>
                 <h4 className="text-xl font-bold mb-3 font-display">Get Certified</h4>
                 <p className="text-xs text-gray-400 leading-relaxed mb-8">Finish this module to unlock the professional certification exam.</p>
                 <button className="w-full py-4 bg-white text-gray-900 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-primary-500 hover:text-white transition-all shadow-lg">Begin Exam</button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile Track Navigator (Floating Button + Drawer) */}
      <div className="lg:hidden">
        {/* Floating FAB */}
        <button 
          onClick={() => setIsMobileNavOpen(true)}
          className="fixed bottom-8 right-8 z-[60] flex items-center gap-2 px-6 py-4 bg-primary-600 text-white rounded-2xl shadow-2xl shadow-primary-500/40 font-bold text-sm hover:scale-105 active:scale-95 transition-all"
        >
          <span className="material-symbols-rounded">menu_book</span>
          Outline
        </button>

        {/* Drawer Overlay */}
        {isMobileNavOpen && (
          <div 
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsMobileNavOpen(false)}
          />
        )}

        {/* Bottom Drawer */}
        <div className={`fixed bottom-0 inset-x-0 z-[80] bg-white dark:bg-dark-surface rounded-t-[2.5rem] shadow-2xl p-8 transform transition-transform duration-500 ease-out border-t border-gray-100 dark:border-dark-border ${isMobileNavOpen ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-8" />
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Module Outline</h3>
            <button 
              onClick={() => setIsMobileNavOpen(false)}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-dark-bg text-gray-500 flex items-center justify-center"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>
          <nav className="space-y-2 max-h-[60vh] overflow-y-auto pb-12 pr-2">
            <NavigationList mobile={true} />
          </nav>
        </div>
      </div>
    </div>
  );
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginUser(email, password);
      navigate('/');
    } catch {
      alert('Login failed. Check admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-6 bg-gray-50 dark:bg-dark-bg">
      <div className="w-full max-w-md bg-white dark:bg-dark-surface rounded-[2.5rem] shadow-2xl p-12 border border-gray-100 dark:border-dark-border">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-primary-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary-500/30">
            <span className="material-symbols-rounded text-4xl">vpn_key</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white font-display tracking-tight mb-2">Admin Panel</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Identify Yourself</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-2">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full h-16 px-6 rounded-2xl border border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-bg focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none" placeholder="admin@brainloom.space" />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-2">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full h-16 px-6 rounded-2xl border border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-bg focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} className="w-full h-16 bg-primary-600 hover:bg-primary-700 text-white font-black uppercase tracking-widest text-xs rounded-[1.25rem] shadow-xl shadow-primary-500/20 transition-all disabled:opacity-50">
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- App Root ---

export function App() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    const html = document.documentElement;
    if (isDark) { html.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { html.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [isDark]);

  const loginUser = async (email: string, pass: string) => {
    const data = await login(email, pass);
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  const logout = () => {
    setUser(null); setToken(null);
    localStorage.removeItem('token'); localStorage.removeItem('user');
  };

  const isAdmin = user?.role === 'admin' || user?.email.includes('admin');

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme: () => setIsDark(!isDark) }}>
      <AuthContext.Provider value={{ user, token, loginUser, logout, isAdmin }}>
        <HashRouter>
          <div className="flex flex-col min-h-screen font-sans">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/topic/*" element={<TopicViewer />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
            <footer className="py-12 border-t border-gray-100 dark:border-dark-border text-center">
               <div className="font-display font-black text-lg text-gray-900 dark:text-white mb-2">BrainLoom</div>
               <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">
                 Precision Education Architecture &copy; {new Date().getFullYear()}
               </div>
            </footer>
          </div>
        </HashRouter>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}

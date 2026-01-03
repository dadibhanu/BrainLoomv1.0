
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Link, useParams, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { login, fetchRootTopics, fetchTopicBySlug, deleteTopic, saveTopicContent, createTopic } from './services/api';
import { RichContent } from './components/RichContent';
import { Topic, User, TopicDetailResponse, EditorBlock, BlockType } from './types';
import { 
  Toolbar, BlockActions, TextBlock, CodeBlock, MultiCodeBlock, NoteBlock, ImageBlock, CarouselBlock 
} from './components/EditorElements';

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

interface ThemeContextType { isDark: boolean; toggleTheme: () => void; }
const ThemeContext = createContext<ThemeContextType>({ isDark: false, toggleTheme: () => {} });

interface AuthContextType { user: User | null; token: string | null; loginUser: (email: string, pass: string) => Promise<void>; logout: () => void; isAdmin: boolean; }
const AuthContext = createContext<AuthContextType>({ user: null, token: null, loginUser: async () => {}, logout: () => {}, isAdmin: false });

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
      case 'image': return `<img src="${block.content}" alt="Image" />`;
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
      const id = () => Math.random().toString(36).substr(2, 9);
      if (tag === 'h2') blocks.push({ id: id(), type: 'heading', content: el.innerHTML });
      else if (tag === 'p') blocks.push({ id: id(), type: 'text', content: el.innerHTML });
      else if (tag === 'code') blocks.push({ id: id(), type: 'code', content: el.textContent || '', metadata: { language: el.getAttribute('language') || 'javascript' } });
      else if (tag === 'multicode') {
        const snippets = Array.from(el.querySelectorAll('snippet')).map(s => ({ id: id(), label: s.getAttribute('label') || 'Snippet', language: s.getAttribute('language') || 'javascript', content: s.textContent || '' }));
        blocks.push({ id: id(), type: 'multi-code', content: '', metadata: { snippets } });
      } else if (tag === 'note') blocks.push({ id: id(), type: 'note', content: el.innerHTML, metadata: { level: (el.getAttribute('type') as any) || 'info' } });
      else if (tag === 'img' && !el.closest('carousel')) blocks.push({ id: id(), type: 'image', content: el.getAttribute('src') || '' });
      else if (tag === 'carousel') {
        const images = Array.from(el.querySelectorAll('img')).map(img => ({ id: id(), url: img.getAttribute('src') || '', caption: img.getAttribute('alt') || '' }));
        blocks.push({ id: id(), type: 'carousel', content: '', metadata: { images } });
      } else Array.from(el.childNodes).forEach(processNode);
    }
  };
  Array.from(doc.body.childNodes).forEach(processNode);
  return blocks.length > 0 ? blocks : [{ id: 'init', type: 'text', content: html }];
};

const Breadcrumbs = ({ slugPath }: { slugPath: string }) => {
  const segments = slugPath.split('/').filter(Boolean);
  let currentPath = '/topic';
  
  return (
    <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] mb-4 overflow-x-auto no-scrollbar whitespace-nowrap opacity-60">
      <Link to="/" className="text-gray-400 hover:text-primary-600 transition-colors">Platform</Link>
      <span className="text-gray-300">/</span>
      {segments.map((segment, idx) => {
        currentPath += `/${segment}`;
        const isLast = idx === segments.length - 1;
        const label = segment.replace(/-/g, ' ');
        
        return (
          <React.Fragment key={currentPath}>
            {isLast ? (
              <span className="text-primary-600 truncate max-w-[150px]">{label}</span>
            ) : (
              <>
                <Link to={currentPath} className="text-gray-400 hover:text-primary-600 transition-colors truncate max-w-[150px]">{label}</Link>
                <span className="text-gray-300">/</span>
              </>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

const TopicViewer = () => {
  const { "*": slug } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useContext(AuthContext);
  const [data, setData] = useState<TopicDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSubtopicModalOpen, setIsSubtopicModalOpen] = useState(false);
  const [editorBlocks, setEditorBlocks] = useState<EditorBlock[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const loadTopic = () => {
    if (!slug) return;
    setLoading(true);
    fetchTopicBySlug(slug).then(res => {
      setData(res);
      const initialBlocks = res.blocks.length > 0 
        ? htmlToBlocks(res.blocks[0].components[0]?.json.content || '') 
        : [{ id: 'init', type: 'text', content: '' }];
      setEditorBlocks(initialBlocks);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadTopic(); }, [slug]);

  const handleSave = async () => {
    if (!data) return;
    setIsSaving(true);
    try {
      const html = blocksToHtml(editorBlocks);
      const existingBlockId = data.blocks[0]?.id; 
      await saveTopicContent(data.topic.id, html, existingBlockId);
      setIsEditMode(false);
      loadTopic();
    } catch (e) {
      alert('Save failed');
    } finally { setIsSaving(false); }
  };

  const handleAiAssist = async () => {
    if (!data) return;
    setIsAiLoading(true);
    try {
      const ai = getAi();
      const prompt = `Write an educational module block about "${data.topic.title}". Return ONLY valid JSON: { "heading": "Title", "content": "Instructional text" }`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: "application/json" } });
      const result = JSON.parse(response.text || '{}');
      const id = () => Math.random().toString(36).substr(2, 9);
      setEditorBlocks(prev => [...prev, { id: id(), type: 'heading', content: result.heading }, { id: id(), type: 'text', content: result.content }]);
    } catch (e) { alert('AI assist failed.'); } finally { setIsAiLoading(false); }
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-primary-600 font-black tracking-widest uppercase text-xs">Synchronizing Knowledge...</div>;
  if (!data) return <div className="p-20 text-center text-red-500 font-bold">Track not found.</div>;

  const NavigationList = ({ mobile = false }) => {
    const sorted = data.children?.sort((a,b) => a.order_no - b.order_no) || [];
    if (sorted.length === 0) return <div className="py-8 text-center text-[9px] font-black text-gray-300 uppercase tracking-widest italic">Topic sequence complete</div>;
    return sorted.map((child, idx) => (
      <Link key={child.id} to={`/topic/${slug}/${child.slug}`} onClick={() => mobile && setIsMobileNavOpen(false)}
        className="flex items-center gap-4 p-4 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-dark-surface hover:text-primary-600 transition-all border border-transparent hover:border-gray-100 dark:hover:border-dark-border group">
        <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-bg flex items-center justify-center text-[10px] font-black group-hover:bg-primary-600 group-hover:text-white transition-all">{idx + 1}</span>
        <span className="truncate flex-1">{child.title}</span>
        <span className="material-symbols-rounded text-base opacity-0 group-hover:opacity-40">chevron_right</span>
      </Link>
    ));
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg transition-colors duration-300">
      <div className="max-w-[1920px] mx-auto px-4 py-12 border-b border-gray-100 dark:border-dark-border mb-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="flex-1">
            <Breadcrumbs slugPath={slug || ''} />
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white font-display leading-tight tracking-tight">{data.topic.title}</h1>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setIsSubtopicModalOpen(true)} className="px-4 py-3 bg-gray-50 dark:bg-white/5 text-gray-400 rounded-xl border border-gray-100 dark:border-white/10 hover:border-primary-500/50 hover:text-primary-600 transition-all flex items-center gap-2" title="New Subtopic">
                <span className="material-symbols-rounded text-lg">add_notes</span>
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Add Subtopic</span>
              </button>
              <button onClick={() => deleteTopic(data.topic.id).then(() => navigate('/'))} className="p-3 bg-red-50 text-red-500 rounded-xl border border-red-100 hover:bg-red-500 hover:text-white transition-all"><span className="material-symbols-rounded text-lg">delete</span></button>
              {isEditMode ? (
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={isSaving} className="px-6 py-3 bg-primary-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-xl hover:bg-primary-700 transition-all">{isSaving ? '...' : 'Save'}</button>
                  <button onClick={() => setIsEditMode(false)} className="px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-400 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-gray-200 transition-all">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setIsEditMode(true)} className="px-6 py-3 bg-primary-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-xl hover:bg-primary-700 transition-all">Edit Page</button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-32">
        <div className="flex flex-col lg:flex-row gap-16">
          <div className="flex-1 min-w-0">
            {isEditMode ? (
              <div className="max-w-4xl mx-auto animate-fade-in bg-white dark:bg-dark-bg p-8 rounded-3xl shadow-sm border border-gray-50 dark:border-white/5 min-h-[600px]">
                <Toolbar onAddBlock={(type) => setEditorBlocks([...editorBlocks, { id: Math.random().toString(36).substr(2, 9), type, content: '', metadata: type === 'multi-code' ? { snippets: [{ id: '1', label: 'Index', language: 'javascript', content: '' }] } : {} }])} onAiAssist={handleAiAssist} isAiLoading={isAiLoading} />
                <div className="space-y-0 relative">
                  {editorBlocks.map((block, idx) => (
                    <div key={block.id} className="group relative w-full">
                      <BlockActions 
                        onDelete={() => setEditorBlocks(editorBlocks.filter(b => b.id !== block.id))} 
                        onMoveUp={() => { if (idx === 0) return; const b = [...editorBlocks]; [b[idx], b[idx-1]] = [b[idx-1], b[idx]]; setEditorBlocks(b); }} 
                        onMoveDown={() => { if (idx === editorBlocks.length-1) return; const b = [...editorBlocks]; [b[idx], b[idx+1]] = [b[idx+1], b[idx]]; setEditorBlocks(b); }} 
                        isFirst={idx === 0} 
                        isLast={idx === editorBlocks.length-1} 
                      />
                      <div className="w-full">
                        {block.type === 'heading' || block.type === 'text' ? <TextBlock block={block} onChange={u => setEditorBlocks(editorBlocks.map(x => x.id === u.id ? u : x))} /> : null}
                        {block.type === 'code' ? <CodeBlock block={block} onChange={u => setEditorBlocks(editorBlocks.map(x => x.id === u.id ? u : x))} /> : null}
                        {block.type === 'multi-code' ? <MultiCodeBlock block={block} onChange={u => setEditorBlocks(editorBlocks.map(x => x.id === u.id ? u : x))} /> : null}
                        {block.type === 'note' ? <NoteBlock block={block} onChange={u => setEditorBlocks(editorBlocks.map(x => x.id === u.id ? u : x))} /> : null}
                        {block.type === 'image' ? <ImageBlock block={block} onChange={u => setEditorBlocks(editorBlocks.map(x => x.id === u.id ? u : x))} /> : null}
                        {block.type === 'carousel' ? <CarouselBlock block={block} onChange={u => setEditorBlocks(editorBlocks.map(x => x.id === u.id ? u : x))} /> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <RichContent htmlContent={data.blocks[0]?.components[0]?.json.content || ''} />
            )}
          </div>
          <aside className="hidden lg:block w-72 sticky top-28 h-fit space-y-6">
            <div className="bg-gray-50/50 dark:bg-white/5 rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Topic Hierarchy</h3>
              <nav className="space-y-1"><NavigationList /></nav>
              {isAdmin && (
                <button onClick={() => setIsSubtopicModalOpen(true)} className="w-full mt-6 py-3 border border-dashed border-gray-300 dark:border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-primary-600 hover:border-primary-500/50 transition-all">
                  + Add Sub-Topic
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>

      <CreateTopicModal 
        isOpen={isSubtopicModalOpen} 
        onClose={() => setIsSubtopicModalOpen(false)} 
        onSuccess={loadTopic} 
        parentId={data.topic.id}
        parentTitle={data.topic.title}
      />
    </div>
  );
};

const CreateTopicModal = ({ isOpen, onClose, onSuccess, parentId = null, parentTitle = null }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; parentId?: number | null; parentTitle?: string | null }) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (title) {
      setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  }, [title]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createTopic({
        title,
        slug,
        description,
        parent_id: parentId,
        order_no: 0
      });
      onSuccess();
      onClose();
      setTitle(''); setSlug(''); setDescription('');
    } catch (err) {
      alert('Failed to create topic');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-dark-surface rounded-3xl shadow-2xl p-10 border border-gray-100 dark:border-white/10 animate-fade-in">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black font-display tracking-tight">{parentId ? 'Add Subtopic' : 'New Track'}</h2>
            {parentTitle && <p className="text-[10px] font-black uppercase tracking-widest text-primary-500 mt-1">Under: {parentTitle}</p>}
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Title</label>
            <input className="w-full h-12 px-4 rounded-xl border border-gray-100 dark:border-white/10 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold" required value={title} onChange={e => setTitle(e.target.value)} placeholder="Topic Title..." />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Slug (URL Path)</label>
            <input className="w-full h-12 px-4 rounded-xl border border-gray-100 dark:border-white/10 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-primary-500 transition-all text-xs font-mono" required value={slug} onChange={e => setSlug(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
            <textarea className="w-full h-24 p-4 rounded-xl border border-gray-100 dark:border-white/10 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm resize-none" required value={description} onChange={e => setDescription(e.target.value)} placeholder="What will they learn?" />
          </div>
          <button type="submit" disabled={loading} className="w-full h-14 bg-primary-600 hover:bg-primary-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-xl shadow-primary-500/20 transition-all active:scale-95 disabled:opacity-50 mt-4">
            {loading ? '...' : 'Create Topic'}
          </button>
        </form>
      </div>
    </div>
  );
};

const Home = () => {
  const { isAdmin } = useContext(AuthContext);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = () => {
    setLoading(true);
    fetchRootTopics().then(res => setTopics(res.topics)).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
        <div>
          <h2 className="text-4xl font-black text-gray-900 dark:text-white font-display mb-2 tracking-tight">Knowledge tracks</h2>
          <p className="text-gray-500 font-medium">Professional learning modules for engineering excellence.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-xl shadow-primary-500/20 transition-all flex items-center gap-3"
          >
            <span className="material-symbols-rounded">add_circle</span>
            Add Track
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1,2,3,4].map(i => <div key={i} className="h-64 bg-gray-100 dark:bg-white/5 rounded-3xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {topics.map(t => (
            <Link key={t.id} to={`/topic/${t.slug}`} className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/5 rounded-3xl overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col group">
              <div className="h-40 bg-primary-600 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-indigo-700 opacity-90"></div>
                <span className="material-symbols-rounded text-white/20 text-7xl relative z-10 group-hover:scale-110 transition-transform duration-500">auto_stories</span>
              </div>
              <div className="p-8 flex-1 flex flex-col">
                <h3 className="text-xl font-bold mb-3 font-display tracking-tight">{t.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-8 leading-relaxed">{t.description}</p>
                <div className="mt-auto flex items-center justify-between text-primary-600 text-[9px] font-black uppercase tracking-widest border-t border-gray-50 dark:border-white/5 pt-6 group-hover:text-primary-400 transition-colors">
                  Open Learning Track <span className="material-symbols-rounded text-sm">arrow_forward</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateTopicModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={loadData} 
      />
    </div>
  );
};

const Navbar = () => {
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const { user, logout } = useContext(AuthContext);
  return (
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-md border-b border-gray-200 dark:border-white/5 px-6 h-16 flex items-center justify-between transition-colors">
      <Link to="/" className="flex items-center gap-3 font-display font-black text-xl tracking-tight">
        <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center shadow-lg"><span className="material-symbols-rounded text-base">school</span></div>
        BrainLoom
      </Link>
      <div className="flex items-center gap-2">
        <button onClick={toggleTheme} className="p-3 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" title="Toggle Theme"><span className="material-symbols-rounded">{isDark ? 'light_mode' : 'dark_mode'}</span></button>
        {user ? (
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <div className="text-[8px] font-black uppercase tracking-widest text-gray-400">Admin</div>
              <div className="text-xs font-bold">{user.name}</div>
            </div>
            <button onClick={logout} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors" title="Sign Out"><span className="material-symbols-rounded">logout</span></button>
          </div>
        ) : (
          <Link to="/login" className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg">Sign In</Link>
        )}
      </div>
    </nav>
  );
};

const LoginPage = () => {
  const { loginUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 dark:bg-dark-bg transition-colors">
      <div className="w-full max-w-sm">
        <form onSubmit={async e => { 
          e.preventDefault(); 
          setLoading(true);
          try { 
            await loginUser((e.currentTarget.elements[0] as HTMLInputElement).value, (e.currentTarget.elements[1] as HTMLInputElement).value); 
            navigate('/');
          } catch { 
            alert('Authentication failed. Check credentials.'); 
          } finally {
            setLoading(false);
          }
        }} className="bg-white dark:bg-dark-surface p-10 rounded-3xl shadow-2xl space-y-8 border border-gray-100 dark:border-white/5">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl"><span className="material-symbols-rounded text-3xl">vpn_key</span></div>
            <h1 className="text-2xl font-black font-display tracking-tight">Admin Portal</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">Identify to manage tracks</p>
          </div>
          <div className="space-y-4">
            <input className="w-full h-12 px-5 rounded-xl border border-gray-100 dark:border-white/10 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold" placeholder="Email Address" required type="email" />
            <input className="w-full h-12 px-5 rounded-xl border border-gray-100 dark:border-white/10 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold" type="password" placeholder="Access Token" required />
          </div>
          <button type="submit" disabled={loading} className="w-full h-12 bg-primary-600 hover:bg-primary-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-xl shadow-primary-500/20 transition-all active:scale-95 disabled:opacity-50">
            {loading ? '...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export function App() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [user, setUser] = useState<User | null>(() => { const saved = localStorage.getItem('user'); return saved ? JSON.parse(saved) : null; });
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  
  useEffect(() => { 
    document.documentElement.classList.toggle('dark', isDark); 
    localStorage.setItem('theme', isDark ? 'dark' : 'light'); 
  }, [isDark]);
  
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
    <ThemeContext.Provider value={{ isDark, toggleTheme: () => setIsDark(!isDark) }}>
      <AuthContext.Provider value={{ user, token, loginUser, logout, isAdmin: !!user }}>
        <HashRouter>
          <div className="flex flex-col min-h-screen font-sans">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/topic/*" element={<TopicViewer />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </HashRouter>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}

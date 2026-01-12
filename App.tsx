import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useParams, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { login, fetchRootTopics, fetchTopicBySlug, deleteTopic, saveTopicContent, createTopic } from './services/api';
import { RichContent } from './components/RichContent';
import { Topic, User, TopicDetailResponse, EditorBlock, BlockType } from './types';
import { 
  Toolbar, BlockActions, TextBlock, CodeBlock, MultiCodeBlock, NoteBlock, ImageBlock, CarouselBlock 
} from './components/EditorElements';

// --- Contexts ---
interface ThemeContextType { isDark: boolean; toggleTheme: () => void; }
const ThemeContext = createContext<ThemeContextType>({ isDark: false, toggleTheme: () => {} });

interface AuthContextType { 
  user: User | null; 
  token: string | null; 
  loginUser: (email: string, pass: string) => Promise<void>; 
  logout: () => void; 
  isAdmin: boolean; 
}
const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  token: null, 
  loginUser: async () => {}, 
  logout: () => {}, 
  isAdmin: false 
});

// --- Helpers ---
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
  return blocks.length > 0 ? blocks : [{ id: 'init', type: 'text' as BlockType, content: html }];
};

// --- Components ---

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
  const [isSubtopicModalOpen, setIsSubtopicModalOpen] = useState(false);
  const [editorBlocks, setEditorBlocks] = useState<EditorBlock[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const loadTopic = () => {
    if (!slug) return;
    setLoading(true);
    fetchTopicBySlug(slug).then(res => {
      setData(res);
      const initialBlocks: EditorBlock[] = res.blocks.length > 0 
        ? htmlToBlocks(res.blocks[0].components[0]?.json.content || '') 
        : [{ id: 'init', type: 'text' as BlockType, content: '' }];
      setEditorBlocks(initialBlocks);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadTopic(); setIsMobileMenuOpen(false); }, [slug]);

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

  if (loading) return <div className="p-20 text-center animate-pulse text-primary-600 font-black tracking-widest uppercase text-xs">Synchronizing Knowledge...</div>;
  if (!data) return <div className="p-20 text-center text-red-500 font-bold">Track not found.</div>;

  const NavigationList = () => {
    const sorted = data.children?.sort((a,b) => a.order_no - b.order_no) || [];
    if (sorted.length === 0) return <div className="py-8 text-center text-[9px] font-black text-gray-300 uppercase tracking-widest italic">Topic sequence complete</div>;
    return (
      <div className="space-y-1">
        {sorted.map((child, idx) => (
          <Link key={child.id} to={`/topic/${slug}/${child.slug}`}
            className="flex items-center gap-4 p-4 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-dark-surface hover:text-primary-600 transition-all border border-transparent hover:border-gray-100 dark:hover:border-dark-border group">
            <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-bg flex items-center justify-center text-[10px] font-black group-hover:bg-primary-600 group-hover:text-white transition-all">{idx + 1}</span>
            <span className="truncate flex-1">{child.title}</span>
            <span className="material-symbols-rounded text-base opacity-0 group-hover:opacity-40">chevron_right</span>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg transition-colors duration-300 pt-20">
      <div className="max-w-[1920px] mx-auto px-4 py-12 border-b border-gray-100 dark:border-dark-border mb-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="flex-1">
            <Breadcrumbs slugPath={slug || ''} />
            <div className="flex items-center gap-4">
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white font-display leading-tight tracking-tight flex-1">{data.topic.title}</h1>
              <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-500 hover:text-primary-600 transition-all border border-gray-100 dark:border-white/10 shadow-sm">
                <span className="material-symbols-rounded text-2xl">menu_open</span>
              </button>
            </div>
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
        <div className="flex flex-col lg:flex-row gap-16 relative">
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-[150] lg:hidden">
               <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsMobileMenuOpen(false)} />
               <div className="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-dark-bg p-6 shadow-2xl border-l border-gray-100 dark:border-white/5 overflow-y-auto">
                 <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-100 dark:border-white/5">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Course Map</h3>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors">
                      <span className="material-symbols-rounded text-lg">close</span>
                    </button>
                 </div>
                 <NavigationList />
               </div>
            </div>
          )}

          <div className="flex-1 min-w-0">
            {isEditMode ? (
              <div className="max-w-4xl mx-auto animate-fade-in bg-white dark:bg-dark-bg p-8 rounded-3xl shadow-sm border border-gray-50 dark:border-white/5 min-h-[600px]">
                <Toolbar onAddBlock={(type) => setEditorBlocks([...editorBlocks, { id: Math.random().toString(36).substr(2, 9), type, content: '', metadata: type === 'multi-code' ? { snippets: [{ id: '1', label: 'Index', language: 'javascript', content: '' }] } : {} }])} />
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
              <>
                <RichContent htmlContent={data.blocks[0]?.components[0]?.json.content || ''} />
                <div className="max-w-4xl mx-auto mt-20 pt-10 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row justify-between gap-4">
                  <button onClick={() => navigate(-1)} className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-sm font-bold text-gray-600 dark:text-gray-300 group w-full sm:w-auto">
                    <span className="material-symbols-rounded group-hover:-translate-x-1 transition-transform">arrow_back</span>
                    Previous Context
                  </button>
                  {data.children && data.children.length > 0 && (
                     <Link to={`/topic/${slug}/${data.children.sort((a,b) => a.order_no - b.order_no)[0].slug}`} className="flex items-center justify-between sm:justify-center gap-3 px-8 py-4 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white shadow-xl shadow-primary-600/20 hover:shadow-primary-600/30 transition-all text-sm font-black uppercase tracking-widest group w-full sm:w-auto">
                       <span>Start: {data.children.sort((a,b) => a.order_no - b.order_no)[0].title}</span>
                       <span className="material-symbols-rounded group-hover:translate-x-1 transition-transform">arrow_forward</span>
                     </Link>
                  )}
                </div>
              </>
            )}
          </div>
          <aside className="hidden lg:block w-72 sticky top-28 h-fit space-y-6">
            <div className="bg-gray-50/50 dark:bg-white/5 rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Topic Hierarchy</h3>
              <NavigationList />
              {isAdmin && (
                <button onClick={() => setIsSubtopicModalOpen(true)} className="w-full mt-6 py-3 border border-dashed border-gray-300 dark:border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-primary-600 hover:border-primary-500/50 transition-all">
                  + Add Sub-Topic
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>
      <Footer />
      <CreateTopicModal isOpen={isSubtopicModalOpen} onClose={() => setIsSubtopicModalOpen(false)} onSuccess={loadTopic} parentId={data.topic.id} parentTitle={data.topic.title} />
    </div>
  );
};

const CreateTopicModal = ({ isOpen, onClose, onSuccess, parentId = null, parentTitle = null }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; parentId?: number | null; parentTitle?: string | null }) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (title) setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  }, [title]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      await createTopic({ title, slug, description: description || '', parent_id: parentId, order_no: 0 });
      onSuccess(); onClose(); setTitle(''); setSlug(''); setDescription('');
    } catch (err) { alert('Failed to create topic'); } finally { setLoading(false); }
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-dark-surface rounded-3xl shadow-2xl p-10 border border-gray-100 dark:border-white/10 animate-fade-in">
        <div className="flex justify-between items-center mb-8">
          <div><h2 className="text-2xl font-black font-display tracking-tight">{parentId ? 'Add Subtopic' : 'New Track'}</h2>{parentTitle && <p className="text-[10px] font-black uppercase tracking-widest text-primary-500 mt-1">Under: {parentTitle}</p>}</div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"><span className="material-symbols-rounded">close</span></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Title</label><input className="w-full h-12 px-4 rounded-xl border border-gray-100 dark:border-white/10 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold" required value={title} onChange={e => setTitle(e.target.value)} placeholder="Topic Title..." /></div>
          <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Slug (URL Path)</label><input className="w-full h-12 px-4 rounded-xl border border-gray-100 dark:border-white/10 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-primary-500 transition-all text-xs font-mono" required value={slug} onChange={e => setSlug(e.target.value)} /></div>
          <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label><textarea className="w-full h-24 p-4 rounded-xl border border-gray-100 dark:border-white/10 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm resize-none" value={description} onChange={e => setDescription(e.target.value)} placeholder="What will they learn?" /></div>
          <button type="submit" disabled={loading} className="w-full h-14 bg-primary-600 hover:bg-primary-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-xl shadow-primary-500/20 transition-all active:scale-95 disabled:opacity-50 mt-4">{loading ? '...' : 'Create Topic'}</button>
        </form>
      </div>
    </div>
  );
};

const Footer = () => (
  <footer className="bg-white dark:bg-dark-surface border-t border-gray-100 dark:border-white/5 pt-24 pb-12 transition-colors">
    <div className="max-w-[1920px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
      <div className="col-span-1 md:col-span-1">
        <Link to="/" className="flex items-center gap-3 font-display font-black text-2xl tracking-tight mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-xl shadow-primary-600/20"><span className="material-symbols-rounded text-3xl">school</span></div>
          BrainLoom
        </Link>
        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-10 max-w-xs font-medium">The hub for professional engineering excellence. We craft deep technical tracks that bridge the gap between basics and mastery.</p>
      </div>
      <div className="space-y-8"><h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mastery Tracks</h4><ul className="space-y-4 text-sm font-bold text-gray-600 dark:text-gray-300"><li><Link to="/explore" className="hover:text-primary-600 transition-colors">Explore All</Link></li></ul></div>
      <div className="space-y-8"><h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Our Company</h4><ul className="space-y-4 text-sm font-bold text-gray-600 dark:text-gray-300"><li><Link to="/" className="hover:text-primary-600 transition-colors">About BrainLoom</Link></li></ul></div>
      <div className="bg-gradient-to-br from-primary-600 to-indigo-700 rounded-[32px] p-10 text-white relative overflow-hidden group shadow-2xl shadow-primary-600/20"><div className="relative z-10"><h4 className="text-2xl font-black mb-4 font-display">Elite Access</h4><p className="text-white/80 text-sm mb-8 font-medium leading-relaxed">Unlock the full platform with a premium plan.</p><button className="w-full py-4 bg-white text-primary-700 font-black uppercase tracking-[0.15em] text-[10px] rounded-2xl shadow-xl hover:scale-105 transition-all">Upgrade Experience</button></div><span className="material-symbols-rounded absolute -right-10 -bottom-10 text-white/10 text-[200px] select-none">verified_user</span></div>
    </div>
    <div className="max-w-[1920px] mx-auto px-6 pt-12 border-t border-gray-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-bold text-gray-400 uppercase tracking-widest"><p>&copy; 2024 BrainLoom Space For Engineering Minds.</p></div>
  </footer>
);

const Home = () => {
  const { isAdmin } = useContext(AuthContext);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  useEffect(() => { setLoading(true); fetchRootTopics().then(res => setTopics(res.topics)).finally(() => setLoading(false)); }, []);
  const filteredTopics = useMemo(() => topics.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())), [topics, searchQuery]);
  return (
    <div className="animate-fade-in transition-colors duration-300">
      <section className="relative pt-44 pb-48 px-6 overflow-hidden bg-white dark:bg-dark-bg transition-colors text-center">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-primary-50 dark:bg-primary-900/10 text-primary-600 dark:text-primary-400 text-[10px] font-black uppercase tracking-[0.3em] mb-12 border border-primary-100 dark:border-primary-800 animate-fade-in"><span className="material-symbols-rounded text-sm">rocket_launch</span> Pioneering The Future of Education</div>
          <h1 className="text-6xl md:text-8xl font-black text-gray-900 dark:text-white font-display tracking-tighter leading-[0.95] mb-12">Elevate Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600 animate-gradient">Technical IQ</span></h1>
          <div className="max-w-3xl mx-auto relative group scale-100 hover:scale-[1.02] transition-transform duration-500"><div className="relative flex items-center bg-white dark:bg-dark-surface p-3 rounded-[24px] shadow-2xl border border-gray-100 dark:border-white/5"><span className="material-symbols-rounded ml-6 text-gray-400 text-3xl">search</span><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="What skill do you want to master?" className="flex-1 bg-transparent border-none outline-none px-6 py-6 font-bold text-xl dark:text-white" /><button onClick={() => navigate('/explore')} className="hidden md:block px-10 py-5 bg-primary-600 hover:bg-primary-700 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl transition-all">Discover</button></div></div>
        </div>
      </section>
      <section className="max-w-[1920px] mx-auto px-6 py-32"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 max-w-7xl mx-auto">{loading ? [1,2,3,4].map(i => <div key={i} className="h-80 bg-gray-100 dark:bg-white/5 rounded-[40px] animate-pulse" />) : filteredTopics.slice(0, 4).map(t => <Link key={t.id} to={`/topic/${t.slug}`} className="bg-white dark:bg-dark-surface border border-gray-100 dark:border-white/5 rounded-[40px] overflow-hidden hover:-translate-y-4 transition-all duration-700 h-full flex flex-col group p-10"><h3 className="text-2xl font-black mb-4 font-display text-gray-900 dark:text-white leading-tight">{t.title}</h3><p className="text-gray-500 dark:text-gray-400 line-clamp-2 mb-10 leading-relaxed font-medium">{t.description || 'Master the essential concepts.'}</p><div className="mt-auto flex items-center justify-between text-primary-600 text-[9px] font-black uppercase tracking-[0.3em] border-t border-gray-50 dark:border-white/5 pt-8 group-hover:text-primary-500 transition-all">Initiate Path <span className="material-symbols-rounded text-lg group-hover:translate-x-2 transition-transform">east</span></div></Link>)}</div></section>
      <Footer />
    </div>
  );
};

const ExplorePage = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchRootTopics().then(res => setTopics(res.topics)).finally(() => setLoading(false)); }, []);
  return (
    <div className="min-h-screen pt-32 pb-32 animate-fade-in bg-white dark:bg-dark-bg transition-colors"><div className="max-w-7xl mx-auto px-6"><h1 className="text-5xl font-black font-display tracking-tight mb-20 text-center">Knowledge Directory</h1><div className="grid grid-cols-1 md:grid-cols-3 gap-8">{loading ? [1,2,3].map(i => <div key={i} className="h-64 bg-gray-100 dark:bg-white/5 rounded-3xl animate-pulse" />) : topics.map(t => <Link key={t.id} to={`/topic/${t.slug}`} className="p-8 rounded-[32px] bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:bg-white dark:hover:bg-dark-surface hover:shadow-2xl transition-all group flex flex-col h-full"><h3 className="text-xl font-black mb-4 font-display">{t.title}</h3><p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-8">{t.description}</p><div className="mt-auto text-primary-600 text-[9px] font-black uppercase tracking-widest flex items-center justify-between">Explore Track <span className="material-symbols-rounded text-base">arrow_forward</span></div></Link>)}</div></div><Footer /></div>
  );
};

const GoogleAdvanceSearchPage = () => {
    const [query, setQuery] = useState('');
    const [site, setSite] = useState('');
    const [filetype, setFiletype] = useState('');
    const [inurl, setInurl] = useState('');
    const [intitle, setIntitle] = useState('');
    const [exclude, setExclude] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const fullQuery = useMemo(() => {
        let q = query.trim();
        if (site) q += ` site:${site}`;
        if (filetype) q += ` filetype:${filetype}`;
        if (inurl) q += ` inurl:${inurl}`;
        if (intitle) q += ` intitle:${intitle}`;
        if (exclude) q += ` -${exclude}`;
        return q.trim();
    }, [query, site, filetype, inurl, intitle, exclude]);
    const handleSearch = async () => {
        if (!fullQuery) return; setLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: `Search for this information: ${fullQuery}. Provide a list of specific relevant links.`,
                config: { tools: [{googleSearch: {}}] },
            });
            const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            const searchResults = chunks.filter((c: any) => c.web).map((c: any) => ({
                title: c.web.title || "Found Source",
                uri: c.web.uri,
                snippet: "Reference found in grounding metadata."
            }));
            setResults(searchResults);
        } catch (err) { alert('Search failed.'); } finally { setLoading(false); }
    };
    return (
        <div className="min-h-screen pt-32 pb-32 animate-fade-in bg-white dark:bg-dark-bg transition-colors"><div className="max-w-5xl mx-auto px-6 text-center mb-16">
            <h1 className="text-5xl font-black font-display tracking-tight mb-6">Google Advance</h1>
            <p className="text-gray-500 max-w-xl mx-auto">Precision search engine with grounded intelligence.</p>
        </div><div className="grid grid-cols-1 lg:grid-cols-3 gap-10 max-w-5xl mx-auto px-6">
            <div className="space-y-4 p-6 rounded-3xl bg-gray-50 dark:bg-dark-surface border border-gray-100 dark:border-white/5 h-fit">
                <div><label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Query</label><input value={query} onChange={e => setQuery(e.target.value)} className="w-full h-10 px-3 rounded-lg dark:bg-dark-bg border-none outline-none font-bold text-sm" placeholder="Keywords" /></div>
                <div><label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Site</label><input value={site} onChange={e => setSite(e.target.value)} className="w-full h-10 px-3 rounded-lg dark:bg-dark-bg border-none outline-none font-bold text-sm" placeholder="e.g. stackoverflow.com" /></div>
                <div><label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Type</label><input value={filetype} onChange={e => setFiletype(e.target.value)} className="w-full h-10 px-3 rounded-lg dark:bg-dark-bg border-none outline-none font-bold text-sm" placeholder="e.g. pdf" /></div>
                <button onClick={handleSearch} disabled={loading || !fullQuery} className="w-full h-12 bg-primary-600 text-white font-black uppercase text-xs rounded-lg shadow-xl disabled:opacity-50">{loading ? 'Searching...' : 'Search'}</button>
            </div>
            <div className="lg:col-span-2 space-y-6 bg-white dark:bg-dark-surface p-8 rounded-[40px] border border-gray-100 dark:border-white/5 min-h-[400px]">
                {results.map((res, i) => (
                    <a key={i} href={res.uri} target="_blank" rel="noopener noreferrer" className="block p-5 rounded-2xl bg-gray-50/50 dark:bg-white/5 hover:border-primary-500/30 border border-transparent transition-all"><h4 className="font-bold text-primary-600 mb-1">{res.title}</h4><p className="text-[10px] text-gray-400 truncate mb-2">{res.uri}</p></a>
                ))}
                {!results.length && !loading && <div className="h-full flex items-center justify-center opacity-20 font-black uppercase text-xs">Ready for search</div>}
            </div>
        </div><Footer /></div>
    );
};

const ProductsPage = () => (
    <div className="min-h-screen pt-32 pb-32 animate-fade-in bg-white dark:bg-dark-bg transition-colors"><div className="max-w-7xl mx-auto px-6 text-center mb-20"><h1 className="text-5xl font-black font-display tracking-tight mb-6">Expert Ecosystem</h1></div><div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-7xl mx-auto px-6">
        <div className="p-10 rounded-[48px] bg-gradient-to-br from-primary-600 to-indigo-700 text-white shadow-2xl flex flex-col h-full"><div className="flex-1"><h2 className="text-2xl font-black mb-4 font-display">Technical Quizzes</h2><p className="text-white/80 mb-10 text-sm">Expert-vetted assessments.</p></div><button className="px-8 py-4 bg-white text-primary-700 font-black uppercase tracking-widest text-[10px] rounded-2xl">Launch</button></div>
        <div className="p-10 rounded-[48px] bg-dark-surface border border-gray-100 dark:border-white/10 shadow-2xl flex flex-col h-full"><div className="flex-1"><h2 className="text-2xl font-black mb-4 font-display">ATS Resume Builder</h2><p className="text-gray-500 dark:text-gray-400 mb-10 text-sm">Engineering-focused resumes.</p></div><button className="px-8 py-4 bg-primary-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl">Build</button></div>
        <div className="p-10 rounded-[48px] bg-gradient-to-br from-indigo-700 to-purple-800 text-white shadow-2xl flex flex-col h-full"><div className="flex-1"><h2 className="text-2xl font-black mb-4 font-display">Google Advance</h2><p className="text-white/80 mb-10 text-sm">Precision search engine.</p></div><Link to="/products/google-advance" className="px-8 py-4 bg-white text-indigo-800 font-black uppercase tracking-widest text-[10px] rounded-2xl text-center">Open</Link></div>
    </div><Footer /></div>
);

const ProfilePage = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    if (!user) return <Navigate to="/login" />;
    return (
        <div className="min-h-screen pt-32 pb-32 animate-fade-in bg-white dark:bg-dark-bg transition-colors"><div className="max-w-4xl mx-auto px-6"><div className="bg-gray-50 dark:bg-dark-surface rounded-[48px] p-12 shadow-2xl flex flex-col md:flex-row items-center gap-10">
            <div className="w-32 h-32 rounded-[32px] bg-primary-600 text-white flex items-center justify-center text-4xl font-black">{user.name.charAt(0)}</div>
            <div className="flex-1 text-center md:text-left"><h1 className="text-4xl font-black font-display mb-2">{user.name}</h1><p className="text-gray-500">{user.email}</p></div>
            <button onClick={() => { logout(); navigate('/'); }} className="px-8 py-4 bg-red-50 text-red-500 font-black uppercase tracking-widest text-[10px] rounded-2xl border border-red-100">Sign Out</button>
        </div></div><Footer /></div>
    );
};

const Navbar = () => {
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const location = useLocation();
  return (
    <nav className="fixed top-0 inset-x-0 z-[100] h-20 glass border-b border-gray-200 dark:border-white/5 px-6">
      <div className="max-w-[1920px] mx-auto w-full h-full flex items-center justify-between">
        <div className="flex items-center gap-12"><Link to="/" className="flex items-center gap-3 font-display font-black text-2xl tracking-tighter"><div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-lg"><span className="material-symbols-rounded">school</span></div><span className="hidden lg:block">BrainLoom</span></Link>
        <div className="hidden md:flex gap-10"><Link to="/explore" className="text-[10px] font-black uppercase tracking-widest">Explore</Link><Link to="/products" className="text-[10px] font-black uppercase tracking-widest">Products</Link></div></div>
        <div className="flex items-center gap-4"><button onClick={toggleTheme} className="p-3 text-gray-500"><span className="material-symbols-rounded">{isDark ? 'light_mode' : 'dark_mode'}</span></button>
        {user ? <Link to="/profile" className="flex items-center gap-2"><span className="material-symbols-rounded">account_circle</span><span className="text-[10px] font-black uppercase">Profile</span></Link> : <Link to="/login" className="px-8 py-3 bg-primary-600 text-white text-[10px] font-black uppercase rounded-2xl">Login</Link>}</div>
      </div>
    </nav>
  );
};

const LoginPage = () => {
  const { loginUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white dark:bg-dark-bg transition-colors pt-32"><form onSubmit={async e => { e.preventDefault(); setLoading(true); try { await loginUser((e.currentTarget.elements[0] as HTMLInputElement).value, (e.currentTarget.elements[1] as HTMLInputElement).value); navigate('/'); } catch { alert('Auth failed'); } finally { setLoading(false); } }} className="bg-white dark:bg-dark-surface p-12 rounded-[40px] shadow-2xl space-y-10 border border-gray-100 dark:border-white/5 w-full max-w-sm">
      <div className="text-center"><h1 className="text-3xl font-black font-display mb-2">Admin Login</h1><p className="text-[10px] font-black uppercase text-gray-400">Restricted Access</p></div>
      <div className="space-y-4"><input className="w-full h-16 px-6 rounded-2xl border border-gray-100 dark:border-white/10 dark:bg-dark-bg outline-none font-bold" placeholder="Email" required type="email" /><input className="w-full h-16 px-6 rounded-2xl border border-gray-100 dark:border-white/10 dark:bg-dark-bg outline-none font-bold" type="password" placeholder="Token" required /></div>
      <button type="submit" disabled={loading} className="w-full h-16 bg-primary-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl">{loading ? 'Verifying...' : 'Login'}</button>
    </form></div>
  );
};

export function App() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [user, setUser] = useState<User | null>(() => { const saved = localStorage.getItem('user'); return saved ? JSON.parse(saved) : null; });
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  useEffect(() => { document.documentElement.classList.toggle('dark', isDark); localStorage.setItem('theme', isDark ? 'dark' : 'light'); }, [isDark]);
  const loginUser = async (email: string, pass: string) => { const data = await login(email, pass); setToken(data.token); setUser(data.user); localStorage.setItem('token', data.token); localStorage.setItem('user', JSON.stringify(data.user)); };
  const logout = () => { setUser(null); setToken(null); localStorage.removeItem('token'); localStorage.removeItem('user'); };
  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme: () => setIsDark(!isDark) }}>
      <AuthContext.Provider value={{ user, token, loginUser, logout, isAdmin: !!user }}>
        <HashRouter>
          <div className="flex flex-col min-h-screen font-sans bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 transition-colors">
            <Navbar />
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/products/google-advance" element={<GoogleAdvanceSearchPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/topic/*" element={<TopicViewer />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </div>
        </HashRouter>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}
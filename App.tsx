import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useParams, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { login, fetchRootTopics, fetchTopicBySlug, deleteTopic, saveTopicContent, createTopic } from './services/api';
import { RichContent } from './components/RichContent';
import { Topic, User, TopicDetailResponse, EditorBlock, BlockType } from './types';
import { 
  Toolbar, BlockActions, TextBlock, CodeBlock, MultiCodeBlock, NoteBlock, ImageBlock, CarouselBlock 
} from './components/EditorElements';

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
  return blocks.length > 0 ? blocks : [{ id: 'init', type: 'text' as BlockType, content: html }];
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
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-500 hover:text-primary-600 transition-all border border-gray-100 dark:border-white/10 shadow-sm"
              >
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
          
          {/* Mobile Sidebar Overlay */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-[150] lg:hidden">
               <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsMobileMenuOpen(false)} />
               <div className="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-dark-bg p-6 shadow-2xl animate-fade-in border-l border-gray-100 dark:border-white/5 overflow-y-auto">
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
                {/* Navigation Buttons */}
                <div className="max-w-4xl mx-auto mt-20 pt-10 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row justify-between gap-4">
                  <button 
                    onClick={() => navigate(-1)} 
                    className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-sm font-bold text-gray-600 dark:text-gray-300 group w-full sm:w-auto"
                  >
                    <span className="material-symbols-rounded group-hover:-translate-x-1 transition-transform">arrow_back</span>
                    Previous Context
                  </button>
                  {data.children && data.children.length > 0 && (
                     <Link 
                       to={`/topic/${slug}/${data.children.sort((a,b) => a.order_no - b.order_no)[0].slug}`}
                       className="flex items-center justify-between sm:justify-center gap-3 px-8 py-4 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white shadow-xl shadow-primary-600/20 hover:shadow-primary-600/30 transition-all text-sm font-black uppercase tracking-widest group w-full sm:w-auto"
                     >
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
        description: description || '',
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
            <textarea className="w-full h-24 p-4 rounded-xl border border-gray-100 dark:border-white/10 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm resize-none" value={description} onChange={e => setDescription(e.target.value)} placeholder="What will they learn?" />
          </div>
          <button type="submit" disabled={loading} className="w-full h-14 bg-primary-600 hover:bg-primary-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-xl shadow-primary-500/20 transition-all active:scale-95 disabled:opacity-50 mt-4">
            {loading ? '...' : 'Create Topic'}
          </button>
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
        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-10 max-w-xs font-medium">
          The hub for professional engineering excellence. We craft deep technical tracks that bridge the gap between basics and mastery.
        </p>
        <div className="flex gap-4">
          {['facebook', 'twitter', 'linkedin', 'github'].map(i => (
            <div key={i} className="w-10 h-10 rounded-xl border border-gray-100 dark:border-white/10 flex items-center justify-center hover:bg-primary-600 hover:text-white dark:text-gray-400 hover:border-primary-600 transition-all cursor-pointer">
              <span className="material-symbols-rounded text-lg">public</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-8">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mastery Tracks</h4>
        <ul className="space-y-4 text-sm font-bold text-gray-600 dark:text-gray-300">
          <li><Link to="/explore" className="hover:text-primary-600 transition-colors">Explore All</Link></li>
          <li><a href="#" className="hover:text-primary-600 transition-colors">System Design</a></li>
          <li><a href="#" className="hover:text-primary-600 transition-colors">Cloud Architecture</a></li>
          <li><a href="#" className="hover:text-primary-600 transition-colors">DevOps Excellence</a></li>
        </ul>
      </div>
      <div className="space-y-8">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Our Company</h4>
        <ul className="space-y-4 text-sm font-bold text-gray-600 dark:text-gray-300">
          <li><Link to="/" className="hover:text-primary-600 transition-colors">About BrainLoom</Link></li>
          <li><a href="#" className="hover:text-primary-600 transition-colors">Expert Mentors</a></li>
          <li><a href="#" className="hover:text-primary-600 transition-colors">Product Roadmap</a></li>
          <li><a href="#" className="hover:text-primary-600 transition-colors">Contact Hub</a></li>
        </ul>
      </div>
      <div className="bg-gradient-to-br from-primary-600 to-indigo-700 rounded-[32px] p-10 text-white relative overflow-hidden group shadow-2xl shadow-primary-600/20">
        <div className="relative z-10">
          <h4 className="text-2xl font-black mb-4 font-display">Elite Access</h4>
          <p className="text-white/80 text-sm mb-8 font-medium leading-relaxed">Unlock the full platform with a premium corporate license or individual plan.</p>
          <button className="w-full py-4 bg-white text-primary-700 font-black uppercase tracking-[0.15em] text-[10px] rounded-2xl shadow-xl hover:scale-105 transition-all active:scale-95">Upgrade Experience</button>
        </div>
        <span className="material-symbols-rounded absolute -right-10 -bottom-10 text-white/10 text-[200px] group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-1000 select-none">verified_user</span>
      </div>
    </div>
    <div className="max-w-[1920px] mx-auto px-6 pt-12 border-t border-gray-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-bold text-gray-400 uppercase tracking-widest">
      <p className="flex items-center gap-2">&copy; 2024 BrainLoom Space <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full"></span> For Engineering Minds.</p>
      <div className="flex gap-12">
        <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Privacy Ethics</a>
        <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Terms of Master</a>
      </div>
    </div>
  </footer>
);

const Home = () => {
  const { isAdmin } = useContext(AuthContext);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const loadData = () => {
    setLoading(true);
    fetchRootTopics().then(res => setTopics(res.topics)).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const filteredTopics = useMemo(() => {
    if (!searchQuery) return topics;
    return topics.filter(t => 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [topics, searchQuery]);

  return (
    <div className="animate-fade-in transition-colors duration-300">
      <section className="relative pt-44 pb-48 px-6 overflow-hidden bg-white dark:bg-dark-bg transition-colors">
        <div className="absolute top-[-10%] right-[5%] w-[500px] h-[500px] bg-primary-500/10 blur-[150px] rounded-full animate-float"></div>
        <div className="absolute bottom-[5%] left-[0%] w-[400px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full animate-float" style={{ animationDelay: '3s' }}></div>
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-primary-50 dark:bg-primary-900/10 text-primary-600 dark:text-primary-400 text-[10px] font-black uppercase tracking-[0.3em] mb-12 border border-primary-100 dark:border-primary-800 animate-fade-in">
            <span className="material-symbols-rounded text-sm">rocket_launch</span> 
            Pioneering The Future of Engineering Education
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-gray-900 dark:text-white font-display tracking-tighter leading-[0.95] mb-12">
            Elevate Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-indigo-500 to-primary-600 bg-[length:200%_auto] animate-gradient">Technical IQ</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 font-medium mb-16 max-w-3xl mx-auto leading-relaxed">
            The definitive platform for deep technical mastery. Structured paths, expert-led modules, and immersive code-first experiences.
          </p>
          
          <div className="max-w-3xl mx-auto relative group scale-100 hover:scale-[1.02] transition-transform duration-500">
            <div className="absolute -inset-2 bg-gradient-to-r from-primary-600 to-indigo-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-40 transition duration-700"></div>
            <div className="relative flex items-center bg-white dark:bg-dark-surface p-3 rounded-[24px] shadow-2xl border border-gray-100 dark:border-white/5">
              <span className="material-symbols-rounded ml-6 text-gray-400 text-3xl">search</span>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What skill do you want to master?"
                className="flex-1 bg-transparent border-none outline-none px-6 py-6 font-bold text-xl dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
              <button onClick={() => navigate('/explore')} className="hidden md:block px-10 py-5 bg-primary-600 hover:bg-primary-700 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl transition-all active:scale-95">Discover</button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-gray-50/50 dark:bg-white/[0.02] border-y border-gray-100 dark:border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-24">
          {[
            { icon: 'groups_2', count: '12,400+', label: 'Global Engineers' },
            { icon: 'book_5', count: '840+', label: 'Technical Modules' },
            { icon: 'verified_user', count: '100%', label: 'Expert Vetted' },
            { icon: 'auto_graph', count: '150+', label: 'Learning Tracks' },
          ].map((stat, i) => (
            <div key={i} className="text-center group flex flex-col items-center">
              <div className="w-16 h-16 bg-white dark:bg-dark-surface rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-gray-50 dark:border-white/10 group-hover:bg-primary-600 transition-all duration-500">
                <span className="material-symbols-rounded text-primary-600 group-hover:text-white text-3xl transition-colors">{stat.icon}</span>
              </div>
              <div className="text-4xl font-black text-gray-900 dark:text-white font-display mb-2 tracking-tighter">{stat.count}</div>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-[1920px] mx-auto px-6 py-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8 max-w-7xl mx-auto">
          <div>
            <div className="text-[10px] font-black text-primary-600 uppercase tracking-[0.3em] mb-4">Curated Excellence</div>
            <h2 className="text-5xl font-black text-gray-900 dark:text-white font-display tracking-tighter">Premium Tracks</h2>
          </div>
          <div className="flex gap-4">
            {isAdmin && (
              <button onClick={() => setIsModalOpen(true)} className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-primary-500/20 transition-all flex items-center gap-3">
                <span className="material-symbols-rounded">add_circle</span>
                New Track
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 max-w-7xl mx-auto">
          {loading ? (
            [1,2,3,4].map(i => <div key={i} className="h-80 bg-gray-100 dark:bg-white/5 rounded-[40px] animate-pulse" />)
          ) : (
            filteredTopics.slice(0, 4).map(t => (
              <Link key={t.id} to={`/topic/${t.slug}`} className="bg-white dark:bg-dark-surface border border-gray-100 dark:border-white/5 rounded-[40px] overflow-hidden hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] hover:-translate-y-4 transition-all duration-700 h-full flex flex-col group relative">
                <div className="h-48 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-600/10 to-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-20 h-20 rounded-3xl bg-white dark:bg-dark-bg shadow-2xl flex items-center justify-center relative z-10 group-hover:scale-125 transition-all duration-700">
                     <span className="material-symbols-rounded text-primary-600 text-4xl">auto_stories</span>
                  </div>
                </div>
                <div className="p-10 flex-1 flex flex-col">
                  <h3 className="text-2xl font-black mb-4 font-display tracking-tight text-gray-900 dark:text-white leading-tight">{t.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 line-clamp-2 mb-10 leading-relaxed font-medium">{t.description || 'Master the essential concepts in this comprehensive learning track.'}</p>
                  <div className="mt-auto flex items-center justify-between text-primary-600 text-[9px] font-black uppercase tracking-[0.3em] border-t border-gray-50 dark:border-white/5 pt-8 group-hover:text-primary-500 transition-all">
                    Initiate Path <span className="material-symbols-rounded text-lg group-hover:translate-x-2 transition-transform">east</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
        <div className="mt-16 text-center">
            <Link to="/explore" className="px-12 py-5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-primary-600 hover:text-white transition-all shadow-xl active:scale-95">View All Learning Tracks</Link>
        </div>
      </section>

      <Footer />
      <CreateTopicModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={loadData} />
    </div>
  );
};

const ExplorePage = () => {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchRootTopics().then(res => setTopics(res.topics)).finally(() => setLoading(false));
    }, []);

    const filtered = topics.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="min-h-screen pt-32 pb-32 animate-fade-in bg-white dark:bg-dark-bg">
            <div className="max-w-7xl mx-auto px-6">
                <div className="mb-20 text-center">
                    <h1 className="text-5xl font-black font-display tracking-tight mb-6">Knowledge Directory</h1>
                    <p className="text-gray-500 max-w-xl mx-auto mb-10">Choose from our curated collection of technical mastery tracks. Each path is designed for professional depth.</p>
                    <div className="max-w-xl mx-auto relative">
                        <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by technology or concept..." className="w-full h-14 pl-12 pr-6 rounded-2xl border border-gray-100 dark:border-white/10 dark:bg-dark-surface outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold" />
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-gray-100 dark:bg-white/5 rounded-3xl animate-pulse" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {filtered.map(t => (
                            <Link key={t.id} to={`/topic/${t.slug}`} className="p-8 rounded-[32px] bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:bg-white dark:hover:bg-dark-surface hover:shadow-2xl transition-all group flex flex-col h-full">
                                <div className="w-14 h-14 rounded-2xl bg-primary-600 text-white flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-rounded">auto_stories</span>
                                </div>
                                <h3 className="text-xl font-black mb-4 font-display">{t.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-8 leading-relaxed font-medium">{t.description || 'Master this subject with deep-dive modules.'}</p>
                                <div className="mt-auto text-primary-600 text-[9px] font-black uppercase tracking-widest flex items-center justify-between">
                                    Explore Track <span className="material-symbols-rounded text-base">arrow_forward</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
};

const ProductsPage = () => {
    return (
        <div className="min-h-screen pt-32 pb-32 animate-fade-in bg-white dark:bg-dark-bg">
            <div className="max-w-7xl mx-auto px-6">
                <div className="mb-20 text-center">
                    <h1 className="text-5xl font-black font-display tracking-tight mb-6">Expert Ecosystem</h1>
                    <p className="text-gray-500 max-w-xl mx-auto">Tools and services built to accelerate your career transition and technical growth.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                    <div className="p-12 rounded-[48px] bg-gradient-to-br from-primary-600 to-indigo-700 text-white relative overflow-hidden group shadow-2xl">
                        <div className="relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center mb-10 border border-white/30">
                                <span className="material-symbols-rounded text-3xl">quiz</span>
                            </div>
                            <h2 className="text-3xl font-black font-display mb-4 tracking-tight">Technical Quizzes</h2>
                            <p className="text-white/80 mb-10 leading-relaxed font-medium">Test your knowledge with expert-vetted technical assessments across system design, algorithms, and full-stack development.</p>
                            <button className="px-8 py-4 bg-white text-primary-700 font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-105 transition-all shadow-xl">Launch Assessments</button>
                        </div>
                        <span className="material-symbols-rounded absolute -right-16 -bottom-16 text-white/10 text-[250px] group-hover:rotate-12 transition-transform duration-1000">contract_edit</span>
                    </div>

                    <div className="p-12 rounded-[48px] bg-dark-surface border border-gray-100 dark:border-white/10 relative overflow-hidden group shadow-2xl">
                        <div className="relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-primary-600 text-white flex items-center justify-center mb-10 shadow-xl">
                                <span className="material-symbols-rounded text-3xl">description</span>
                            </div>
                            <h2 className="text-3xl font-black font-display mb-4 tracking-tight">ATS Resume Builder</h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-10 leading-relaxed font-medium">Generate high-impact, engineering-focused resumes optimized for Applicant Tracking Systems at top-tier tech firms.</p>
                            <button className="px-8 py-4 bg-primary-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-105 transition-all shadow-xl">Build Resume</button>
                        </div>
                        <span className="material-symbols-rounded absolute -right-16 -bottom-16 text-primary-500/5 text-[250px] group-hover:-rotate-12 transition-transform duration-1000">history_edu</span>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

const ProfilePage = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    if (!user) return <Navigate to="/login" />;

    return (
        <div className="min-h-screen pt-32 pb-32 animate-fade-in bg-white dark:bg-dark-bg">
            <div className="max-w-4xl mx-auto px-6">
                <div className="bg-gray-50 dark:bg-dark-surface rounded-[48px] border border-gray-100 dark:border-white/5 p-12 shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 blur-3xl rounded-full"></div>
                    <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                        <div className="w-32 h-32 rounded-[32px] bg-primary-600 text-white flex items-center justify-center text-4xl font-black shadow-2xl">
                            {user.name.charAt(0)}
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-primary-500 mb-2">Authenticated User</div>
                            <h1 className="text-4xl font-black font-display tracking-tight mb-2">{user.name}</h1>
                            <p className="text-gray-500 font-medium">{user.email}</p>
                        </div>
                        <button onClick={() => { logout(); navigate('/'); }} className="px-8 py-4 bg-red-50 dark:bg-red-500/10 text-red-500 font-black uppercase tracking-widest text-[10px] rounded-2xl border border-red-100 dark:border-red-500/20 hover:bg-red-500 hover:text-white transition-all">Sign Out</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
                        <div className="p-8 rounded-3xl bg-white dark:bg-dark-bg border border-gray-100 dark:border-white/5">
                            <div className="text-2xl font-black mb-1">0</div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">Completed Path</div>
                        </div>
                        <div className="p-8 rounded-3xl bg-white dark:bg-dark-bg border border-gray-100 dark:border-white/5">
                            <div className="text-2xl font-black mb-1">0</div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">Quiz Mastery</div>
                        </div>
                        <div className="p-8 rounded-3xl bg-white dark:bg-dark-bg border border-gray-100 dark:border-white/5">
                            <div className="text-2xl font-black mb-1">PRO</div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">Account Type</div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

const Navbar = () => {
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 inset-x-0 z-[100] transition-all duration-500 px-6 ${scrolled || location.pathname !== '/' ? 'h-20 glass border-b border-gray-200 dark:border-white/5' : 'h-24 bg-transparent'}`}>
      <div className="max-w-[1920px] mx-auto w-full h-full flex items-center justify-between">
        <div className="flex items-center gap-12">
          <Link to="/" className="flex items-center gap-3 font-display font-black text-2xl tracking-tighter">
            <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-500/20"><span className="material-symbols-rounded text-2xl">school</span></div>
            <span className="hidden lg:block">BrainLoom</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-10">
            <Link to="/explore" className={`text-[10px] font-black uppercase tracking-[0.25em] transition-colors ${location.pathname === '/explore' ? 'text-primary-600' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
              Explore
            </Link>
            <Link to="/products" className={`text-[10px] font-black uppercase tracking-[0.25em] transition-colors ${location.pathname === '/products' ? 'text-primary-600' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
              Our Products
            </Link>
            <Link to="/" className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
              About Us
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-3 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" title="Toggle Theme"><span className="material-symbols-rounded text-2xl">{isDark ? 'light_mode' : 'dark_mode'}</span></button>
          <div className="h-6 w-px bg-gray-200 dark:bg-white/10 mx-2 hidden sm:block"></div>
          {user ? (
            <div className="flex items-center gap-4">
              <Link to="/profile" className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl transition-all ${location.pathname === '/profile' ? 'bg-primary-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'}`}>
                <span className="material-symbols-rounded">account_circle</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Profile</span>
              </Link>
            </div>
          ) : (
            <Link to="/login" className="px-8 py-3.5 bg-primary-600 hover:bg-primary-700 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-primary-500/20 active:scale-95">Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

const LoginPage = () => {
  const { loginUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white dark:bg-dark-bg transition-colors pt-32">
      <div className="w-full max-w-sm relative">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary-500/10 blur-3xl rounded-full"></div>
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
        }} className="bg-white dark:bg-dark-surface p-12 rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] space-y-10 border border-gray-100 dark:border-white/5 relative z-10 group overflow-hidden">
          <div className="text-center">
            <div className="w-24 h-24 bg-primary-600 text-white rounded-[28px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-primary-600/30 group-hover:scale-110 transition-transform duration-700">
               <span className="material-symbols-rounded text-5xl">vpn_key</span>
            </div>
            <h1 className="text-3xl font-black font-display tracking-tight mb-2">Admin Terminal</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Encrypted Infrastructure Login</p>
          </div>
          <div className="space-y-4">
            <input className="w-full h-16 px-6 rounded-2xl border border-gray-100 dark:border-white/10 dark:bg-dark-bg outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-bold text-lg" placeholder="Email Address" required type="email" />
            <input className="w-full h-16 px-6 rounded-2xl border border-gray-100 dark:border-white/10 dark:bg-dark-bg outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-bold text-lg" type="password" placeholder="Access Token" required />
          </div>
          <button type="submit" disabled={loading} className="w-full h-16 bg-primary-600 hover:bg-primary-700 text-white font-black uppercase tracking-[0.25em] text-xs rounded-2xl shadow-xl shadow-primary-500/20 transition-all active:scale-95 disabled:opacity-50">
            {loading ? 'Decrypting...' : 'Verify Identity'}
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
          <div className="flex flex-col min-h-screen font-sans bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 selection:bg-primary-100 dark:selection:bg-primary-900 selection:text-primary-900 dark:selection:text-primary-100 transition-colors">
            <Navbar />
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/products" element={<ProductsPage />} />
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
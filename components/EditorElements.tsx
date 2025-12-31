
import React, { useState } from 'react';
import { EditorBlock, BlockType, CodeSnippet } from '../types';

export const Icons = {
  Bold: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>,
  Italic: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>,
  List: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  Image: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Code: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  Note: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Layers: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Terminal: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
  ChevronLeft: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
  ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>,
};

export const Toolbar: React.FC<{
  onAddBlock: (type: BlockType) => void;
  onAiAssist: () => void;
  isAiLoading: boolean;
}> = ({ onAddBlock, onAiAssist, isAiLoading }) => {
  const tools: { type: BlockType; label: string; icon: React.ReactNode }[] = [
    { type: 'heading', label: 'Heading', icon: <div className="font-bold text-lg">H</div> },
    { type: 'text', label: 'Text', icon: <div className="font-bold text-lg">P</div> },
    { type: 'code', label: 'Code', icon: <Icons.Code /> },
    { type: 'multi-code', label: 'Tabbed Code', icon: <Icons.Terminal /> },
    { type: 'note', label: 'Note', icon: <Icons.Note /> },
    { type: 'image', label: 'Image', icon: <Icons.Image /> },
    { type: 'carousel', label: 'Gallery', icon: <Icons.Layers /> },
  ];

  return (
    <div className="sticky top-20 z-50 flex justify-center w-full pointer-events-none mb-12">
      <div className="flex items-center gap-1 p-2 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-xl border border-gray-200 dark:border-dark-border shadow-2xl rounded-3xl pointer-events-auto">
        <div className="flex items-center gap-1 border-r border-gray-200 dark:border-dark-border pr-2 mr-1">
          <button 
            type="button"
            className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors"
            onClick={() => document.execCommand('bold', false)}
            title="Bold"
          >
            <Icons.Bold />
          </button>
          <button 
            type="button"
            className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors"
            onClick={() => document.execCommand('italic', false)}
            title="Italic"
          >
            <Icons.Italic />
          </button>
        </div>

        {tools.map((tool) => (
          <button
            key={tool.type}
            type="button"
            onClick={() => onAddBlock(tool.type)}
            className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all flex flex-col items-center gap-1 group relative min-w-[64px]"
          >
            {tool.icon}
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-primary-600">
              {tool.label}
            </span>
          </button>
        ))}

        <div className="ml-1 pl-2 border-l border-gray-200 dark:border-dark-border">
          <button 
            type="button"
            disabled={isAiLoading}
            onClick={onAiAssist}
            className={`px-4 py-3 bg-gradient-to-tr from-primary-600 to-indigo-500 text-white rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 flex flex-col items-center gap-1 ${isAiLoading ? 'animate-pulse' : ''}`}
          >
            <Icons.Sparkles />
            <span className="text-[10px] font-black uppercase tracking-widest">{isAiLoading ? 'WAIT' : 'AI WRITE'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const BlockActions: React.FC<{
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}> = ({ onDelete, onMoveUp, onMoveDown, isFirst, isLast }) => {
  return (
    <div className="absolute right-4 top-4 flex items-center gap-1 opacity-40 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-white/95 dark:bg-dark-surface/95 backdrop-blur border border-gray-200 dark:border-dark-border rounded-xl shadow-lg p-1.5 z-20">
      <button 
        type="button"
        disabled={isFirst}
        onClick={(e) => { e.preventDefault(); onMoveUp(); }}
        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg disabled:opacity-30 transition-colors"
        title="Move Up"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
      </button>
      <button 
        type="button"
        disabled={isLast}
        onClick={(e) => { e.preventDefault(); onMoveDown(); }}
        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg disabled:opacity-30 transition-colors"
        title="Move Down"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      <div className="w-px h-4 bg-gray-200 dark:bg-dark-border mx-1"></div>
      <button 
        type="button"
        onClick={(e) => { 
          e.preventDefault();
          onDelete(); 
        }}
        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors group/trash"
        title="Delete Block"
      >
        <Icons.Trash />
      </button>
    </div>
  );
};

export const MultiCodeBlock: React.FC<{ block: EditorBlock; onChange: (b: EditorBlock) => void }> = ({ block, onChange }) => {
  const [activeTab, setActiveTab] = useState(0);
  const snippets = block.metadata?.snippets || [];
  const languages = ['javascript', 'typescript', 'python', 'html', 'css', 'rust', 'go', 'json', 'bash', 'java', 'csharp', 'cpp'];

  const addSnippet = () => {
    const newSnippet: CodeSnippet = {
      id: Math.random().toString(36).substr(2, 9),
      label: 'New Snippet',
      language: 'javascript',
      content: ''
    };
    const newSnippets = [...snippets, newSnippet];
    onChange({ ...block, metadata: { ...block.metadata, snippets: newSnippets } });
    setActiveTab(newSnippets.length - 1);
  };

  const updateSnippet = (idx: number, data: Partial<CodeSnippet>) => {
    const newSnippets = [...snippets];
    newSnippets[idx] = { ...newSnippets[idx], ...data };
    onChange({ ...block, metadata: { ...block.metadata, snippets: newSnippets } });
  };

  const removeSnippet = (idx: number) => {
    const newSnippets = snippets.filter((_, i) => i !== idx);
    onChange({ ...block, metadata: { ...block.metadata, snippets: newSnippets } });
    setActiveTab(Math.max(0, activeTab - 1));
  };

  return (
    <div className="bg-[#0d1117] rounded-3xl overflow-hidden my-8 border border-slate-700 shadow-2xl">
      <div className="flex items-center bg-[#161b22] border-b border-gray-800 overflow-x-auto scrollbar-hide">
        {snippets.map((s, idx) => (
          <div key={s.id} className="group/tab flex items-center relative">
            <button
              onClick={() => setActiveTab(idx)}
              className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${
                activeTab === idx 
                  ? 'text-primary-400 border-primary-500 bg-primary-500/5' 
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              <input 
                className="bg-transparent outline-none w-24 text-center placeholder:opacity-50"
                value={s.label}
                onChange={(e) => updateSnippet(idx, { label: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                placeholder="Label"
              />
            </button>
            {snippets.length > 1 && (
              <button 
                onClick={() => removeSnippet(idx)}
                className="absolute right-1 top-2 opacity-0 group-hover/tab:opacity-100 text-red-400 hover:text-red-500 p-1"
              >
                <span className="material-symbols-rounded text-xs">close</span>
              </button>
            )}
          </div>
        ))}
        <button onClick={addSnippet} className="px-4 py-4 text-gray-500 hover:text-primary-400 transition-colors">
          <Icons.Plus />
        </button>
      </div>

      {snippets.length > 0 ? (
        <div className="p-8">
          <div className="mb-4 flex items-center justify-between">
            <select
              value={snippets[activeTab].language}
              onChange={(e) => updateSnippet(activeTab, { language: e.target.value })}
              className="bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg outline-none cursor-pointer hover:bg-slate-700 transition-colors"
            >
              {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
            </select>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Snippet {activeTab + 1} Editor</span>
          </div>
          <textarea
            value={snippets[activeTab].content}
            onChange={(e) => updateSnippet(activeTab, { content: e.target.value })}
            className="w-full bg-transparent text-slate-100 font-mono text-sm outline-none resize-none min-h-[350px] leading-relaxed"
            placeholder={`// Paste your ${snippets[activeTab].label} code here...`}
            spellCheck={false}
          />
        </div>
      ) : (
        <div className="p-20 text-center text-slate-600 font-black uppercase tracking-widest text-xs">
          Click the + icon to add a code snippet
        </div>
      )}
    </div>
  );
};

export const TextBlock: React.FC<{ block: EditorBlock; onChange: (b: EditorBlock) => void }> = ({ block, onChange }) => {
  const isHeading = block.type === 'heading';
  
  return (
    <div className="relative group min-h-[1.5em] mb-4">
      <div 
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onChange({ ...block, content: e.currentTarget.innerHTML })}
        className={`w-full py-4 px-4 focus:bg-white dark:focus:bg-dark-surface/50 rounded-2xl transition-colors leading-relaxed outline-none border border-transparent focus:border-primary-100 dark:focus:border-primary-900/20 ${isHeading ? 'text-3xl font-bold font-display text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
        dangerouslySetInnerHTML={{ __html: block.content }}
      />
      {block.content.length === 0 && (
        <div className="absolute top-4 left-4 pointer-events-none text-gray-400 italic">
          {isHeading ? 'Type your heading here...' : 'Write your module content...'}
        </div>
      )}
    </div>
  );
};

export const CodeBlock: React.FC<{ block: EditorBlock; onChange: (b: EditorBlock) => void }> = ({ block, onChange }) => {
  const languages = ['javascript', 'typescript', 'python', 'html', 'css', 'rust', 'go', 'json', 'bash'];
  
  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden my-6 border border-slate-700 shadow-2xl">
      <div className="flex items-center justify-between px-5 py-3 bg-slate-800 border-b border-slate-700">
        <select 
          value={block.metadata?.language || 'javascript'}
          onChange={(e) => onChange({ ...block, metadata: { ...block.metadata, language: e.target.value } })}
          className="bg-transparent text-slate-300 text-xs font-bold uppercase tracking-widest outline-none cursor-pointer hover:text-white transition-colors"
        >
          {languages.map(lang => <option key={lang} value={lang} className="bg-slate-800">{lang}</option>)}
        </select>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
        </div>
      </div>
      <textarea
        value={block.content}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        spellCheck={false}
        className="w-full bg-transparent text-slate-100 font-mono text-sm p-8 outline-none resize-none min-h-[160px]"
        placeholder="// Code block empty. Type or paste your snippet here..."
      />
    </div>
  );
};

export const NoteBlock: React.FC<{ block: EditorBlock; onChange: (b: EditorBlock) => void }> = ({ block, onChange }) => {
  const styles = {
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
    tip: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
  };

  const level = block.metadata?.level || 'info';

  return (
    <div className={`p-8 rounded-3xl border-l-8 my-8 transition-all border shadow-sm ${styles[level]}`}>
      <div className="flex items-center gap-3 mb-4">
        <Icons.Note />
        <span className="font-black uppercase text-[10px] tracking-[0.2em]">{level} Callout</span>
        <div className="ml-auto flex gap-3">
          {Object.keys(styles).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ ...block, metadata: { ...block.metadata, level: key as any } })}
              className={`w-5 h-5 rounded-full border border-black/10 transition-transform hover:scale-125 ${
                key === 'info' ? 'bg-blue-500' : key === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
              } ${level === key ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-dark-bg' : ''}`}
            />
          ))}
        </div>
      </div>
      <div 
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onChange({ ...block, content: e.currentTarget.innerHTML })}
        className="outline-none min-h-[1.5em] text-lg font-medium leading-relaxed"
        dangerouslySetInnerHTML={{ __html: block.content }}
      />
    </div>
  );
};

export const ImageBlock: React.FC<{ block: EditorBlock; onChange: (b: EditorBlock) => void }> = ({ block, onChange }) => {
  return (
    <div className="my-10">
      {!block.content ? (
        <button 
             type="button"
             className="w-full border-2 border-dashed border-gray-200 dark:border-dark-border rounded-3xl p-16 text-center bg-gray-50/50 dark:bg-dark-surface/30 hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors cursor-pointer group"
             onClick={() => {
                const url = prompt('Enter image URL:');
                if (url) onChange({...block, content: url});
             }}>
          <div className="mx-auto w-16 h-16 bg-white dark:bg-dark-bg rounded-2xl shadow-sm flex items-center justify-center text-gray-300 mb-6 group-hover:scale-110 transition-transform">
            <Icons.Image />
          </div>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Add Full-Width Illustration</p>
        </button>
      ) : (
        <div className="relative group rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-dark-border">
          <img src={block.content} alt="Tutorial Illustration" className="w-full object-cover max-h-[600px]" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
            <button 
              type="button"
              onClick={() => {
                const url = prompt('Enter image URL:', block.content);
                if (url) onChange({...block, content: url});
              }}
              className="bg-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 text-gray-900 transition-all shadow-xl"
            >
              Change URL
            </button>
            <button 
              type="button"
              onClick={() => onChange({...block, content: ''})}
              className="bg-red-500 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const CarouselBlock: React.FC<{ block: EditorBlock; onChange: (b: EditorBlock) => void }> = ({ block, onChange }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const images = block.metadata?.images || [];

  const addImage = () => {
    const url = prompt('Enter image URL:');
    if (!url) return;
    const newImage = {
      id: Math.random().toString(36).substr(2, 9),
      url: url,
      caption: 'Step description...'
    };
    const newImages = [...images, newImage];
    onChange({ ...block, metadata: { ...block.metadata, images: newImages } });
    setActiveIndex(newImages.length - 1);
  };

  const removeImage = (id: string) => {
    const newImages = images.filter(img => img.id !== id);
    onChange({ ...block, metadata: { ...block.metadata, images: newImages } });
    if (activeIndex >= newImages.length) setActiveIndex(Math.max(0, newImages.length - 1));
  };

  return (
    <div className="my-10 bg-gray-50/50 dark:bg-dark-surface/20 rounded-[2.5rem] p-10 border border-gray-100 dark:border-dark-border shadow-inner">
      <div className="flex items-center justify-between mb-8">
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
          <span className="material-symbols-rounded text-primary-500">collections</span> Interactive Gallery
        </h4>
        <button 
          type="button"
          onClick={addImage}
          className="bg-white dark:bg-dark-surface px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-gray-100 dark:border-dark-border hover:shadow-md transition-all flex items-center gap-2"
        >
          <Icons.Plus /> Add Slide
        </button>
      </div>

      {images.length > 0 ? (
        <div className="relative aspect-video bg-black rounded-3xl overflow-hidden group shadow-2xl">
          <img src={images[activeIndex].url} alt="" className="w-full h-full object-cover" />
          
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 to-transparent p-12">
            <input 
              className="bg-transparent text-white w-full outline-none font-bold text-xl border-b-2 border-white/10 pb-3 focus:border-primary-500 transition-all placeholder:text-white/30"
              value={images[activeIndex].caption}
              onChange={(e) => {
                const newImages = [...images];
                newImages[activeIndex].caption = e.target.value;
                onChange({ ...block, metadata: { ...block.metadata, images: newImages } });
              }}
              placeholder="Caption for this slide..."
            />
          </div>

          <button 
            type="button"
            onClick={() => setActiveIndex(prev => (prev === 0 ? images.length - 1 : prev - 1))}
            className="absolute left-8 top-1/2 -translate-y-1/2 w-16 h-16 bg-white/10 hover:bg-white/30 backdrop-blur-2xl rounded-full flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100 border border-white/20 shadow-2xl"
          >
            <Icons.ChevronLeft />
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveIndex(prev => (prev === images.length - 1 ? 0 : prev + 1))}
            className="absolute right-8 top-1/2 -translate-y-1/2 w-16 h-16 bg-white/10 hover:bg-white/30 backdrop-blur-2xl rounded-full flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100 border border-white/20 shadow-2xl"
          >
            <Icons.ChevronRight />
          </button>

          <button 
            type="button"
            onClick={() => removeImage(images[activeIndex].id)}
            className="absolute top-8 right-8 p-3 bg-red-500 text-white rounded-2xl opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all shadow-2xl flex items-center justify-center"
          >
            <Icons.Trash />
          </button>
        </div>
      ) : (
        <div className="aspect-video border-2 border-dashed border-gray-200 dark:border-dark-border rounded-3xl flex flex-col items-center justify-center text-gray-300 bg-white/40 dark:bg-dark-bg/20">
           <span className="material-symbols-rounded text-6xl mb-6">photo_library</span>
           <p className="text-[10px] font-black uppercase tracking-[0.2em]">Add content to initialize gallery</p>
        </div>
      )}

      <div className="flex gap-4 mt-10 overflow-x-auto pb-6 scrollbar-hide">
        {images.map((img, idx) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setActiveIndex(idx)}
            className={`flex-shrink-0 w-36 h-24 rounded-2xl border-4 transition-all overflow-hidden shadow-sm ${
              idx === activeIndex ? 'border-primary-500 scale-110 shadow-xl' : 'border-transparent opacity-50 hover:opacity-100 hover:scale-105'
            }`}
          >
            <img src={img.url} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
};

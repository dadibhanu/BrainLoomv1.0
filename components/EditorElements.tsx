import React, { useState, useRef } from 'react';
import { EditorBlock, BlockType, CodeSnippet } from '../types';
import { uploadMedia } from '../services/api';

export const Icons = {
  Bold: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>,
  Italic: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>,
  List: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  Image: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Code: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  Note: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Layers: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Terminal: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
};

export const Toolbar: React.FC<{
  onAddBlock: (type: BlockType) => void;
}> = ({ onAddBlock }) => {
  const tools: { type: BlockType; label: string; icon: React.ReactNode }[] = [
    { type: 'heading', label: 'Heading', icon: <div className="font-bold">H1</div> },
    { type: 'text', label: 'Text', icon: <div className="font-bold">P</div> },
    { type: 'code', label: 'Code', icon: <Icons.Code /> },
    { type: 'multi-code', label: 'Tabs', icon: <Icons.Terminal /> },
    { type: 'note', label: 'Note', icon: <Icons.Note /> },
    { type: 'image', label: 'Image', icon: <Icons.Image /> },
    { type: 'carousel', label: 'Gallery', icon: <Icons.Layers /> },
  ];

  return (
    <div className="sticky top-4 z-[100] flex justify-center w-full pointer-events-none mb-4">
      <div className="flex items-center gap-1 p-1.5 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-2xl border border-gray-200/50 dark:border-white/10 shadow-2xl rounded-2xl pointer-events-auto">
        <div className="flex items-center gap-1 border-r border-gray-200 dark:border-white/10 pr-2 mr-1">
          <button type="button" className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all" onClick={() => document.execCommand('bold', false)}><Icons.Bold /></button>
          <button type="button" className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all" onClick={() => document.execCommand('italic', false)}><Icons.Italic /></button>
        </div>
        {tools.map((tool) => (
          <button key={tool.type} type="button" onClick={() => onAddBlock(tool.type)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all flex flex-col items-center gap-0.5 group">
            {tool.icon}
            <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-primary-600">{tool.label}</span>
          </button>
        ))}
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
    <div className="absolute -left-10 top-0 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity p-1 z-30">
      <button type="button" disabled={isFirst} onClick={(e) => { e.preventDefault(); onMoveUp(); }} className="p-1 text-gray-400 hover:text-primary-500 disabled:opacity-0 transition-colors">
        <span className="material-symbols-rounded text-sm">keyboard_arrow_up</span>
      </button>
      <button type="button" disabled={isLast} onClick={(e) => { e.preventDefault(); onMoveDown(); }} className="p-1 text-gray-400 hover:text-primary-500 disabled:opacity-0 transition-colors">
        <span className="material-symbols-rounded text-sm">keyboard_arrow_down</span>
      </button>
      <button type="button" onClick={(e) => { e.preventDefault(); onDelete(); }} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
        <span className="material-symbols-rounded text-sm">delete</span>
      </button>
    </div>
  );
};

export const TextBlock: React.FC<{ block: EditorBlock; onChange: (b: EditorBlock) => void }> = ({ block, onChange }) => {
  const isHeading = block.type === 'heading';
  return (
    <div className="relative group/block w-full">
      <div 
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onChange({ ...block, content: e.currentTarget.innerHTML })}
        className={`w-full outline-none border-none transition-colors ${isHeading ? 'text-3xl font-bold font-display text-gray-900 dark:text-white mt-4 mb-2' : 'text-lg text-gray-700 dark:text-gray-300 leading-relaxed py-1'}`}
        dangerouslySetInnerHTML={{ __html: block.content }}
      />
      {block.content.length === 0 && (
        <div className={`absolute top-0 left-0 pointer-events-none text-gray-300 italic ${isHeading ? 'text-3xl py-4' : 'text-lg py-1'}`}>
          {isHeading ? 'Module Heading' : 'Type content here...'}
        </div>
      )}
    </div>
  );
};

export const CodeBlock: React.FC<{ block: EditorBlock; onChange: (b: EditorBlock) => void }> = ({ block, onChange }) => {
  const languages = ['javascript', 'typescript', 'python', 'html', 'css', 'rust', 'go', 'json', 'bash'];
  return (
    <div className="bg-[#0d1117] rounded-xl overflow-hidden my-4 border border-white/5 shadow-xl transition-all">
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-white/5">
        <select value={block.metadata?.language || 'javascript'} onChange={(e) => onChange({ ...block, metadata: { ...block.metadata, language: e.target.value } })}
          className="bg-transparent text-gray-400 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer hover:text-white transition-colors">
          {languages.map(lang => <option key={lang} value={lang} className="bg-[#161b22]">{lang}</option>)}
        </select>
      </div>
      <textarea value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} spellCheck={false}
        className="w-full bg-transparent text-gray-200 font-mono text-sm p-6 outline-none resize-none min-h-[120px]"
        placeholder="// Code content..." />
    </div>
  );
};

export const MultiCodeBlock: React.FC<{ block: EditorBlock; onChange: (b: EditorBlock) => void }> = ({ block, onChange }) => {
  const [activeTab, setActiveTab] = useState(0);
  const snippets = block.metadata?.snippets || [];
  const languages = ['javascript', 'typescript', 'python', 'html', 'css', 'rust', 'go', 'json', 'bash'];

  const addSnippet = () => {
    const newSnippet: CodeSnippet = { id: Math.random().toString(36).substr(2, 9), label: 'Snippet', language: 'javascript', content: '' };
    const newSnippets = [...snippets, newSnippet];
    onChange({ ...block, metadata: { ...block.metadata, snippets: newSnippets } });
    setActiveTab(newSnippets.length - 1);
  };

  const updateSnippet = (idx: number, data: Partial<CodeSnippet>) => {
    const newSnippets = [...snippets];
    newSnippets[idx] = { ...newSnippets[idx], ...data };
    onChange({ ...block, metadata: { ...block.metadata, snippets: newSnippets } });
  };

  return (
    <div className="bg-[#0d1117] rounded-xl overflow-hidden my-6 border border-white/5 shadow-xl">
      <div className="flex items-center bg-[#161b22] border-b border-white/5 overflow-x-auto">
        {snippets.map((s, idx) => (
          <button key={s.id} onClick={() => setActiveTab(idx)} className={`px-5 py-3 text-[9px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === idx ? 'text-primary-400 border-primary-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>
            <input className="bg-transparent outline-none w-20 text-center" value={s.label} onChange={(e) => updateSnippet(idx, { label: e.target.value })} onClick={e => e.stopPropagation()}/>
          </button>
        ))}
        <button onClick={addSnippet} className="px-4 py-3 text-gray-500 hover:text-white transition-colors"><Icons.Plus /></button>
      </div>
      {snippets.length > 0 && (
        <div className="p-6">
          <select value={snippets[activeTab].language} onChange={(e) => updateSnippet(activeTab, { language: e.target.value })}
            className="mb-4 bg-white/5 text-gray-400 text-[9px] font-black uppercase px-2 py-1 rounded outline-none">
            {languages.map(l => <option key={l} value={l} className="bg-gray-900">{l}</option>)}
          </select>
          <textarea value={snippets[activeTab].content} onChange={(e) => updateSnippet(activeTab, { content: e.target.value })}
            className="w-full bg-transparent text-gray-200 font-mono text-sm outline-none resize-none min-h-[250px]" spellCheck={false} />
        </div>
      )}
    </div>
  );
};

export const NoteBlock: React.FC<{ block: EditorBlock; onChange: (b: EditorBlock) => void }> = ({ block, onChange }) => {
  const styles = {
    info: 'bg-blue-50/30 dark:bg-blue-900/10 border-blue-500/50 text-blue-900 dark:text-blue-200',
    warning: 'bg-amber-50/30 dark:bg-amber-900/10 border-amber-500/50 text-amber-900 dark:text-amber-200',
    tip: 'bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-500/50 text-emerald-900 dark:text-emerald-200'
  };
  const level = block.metadata?.level || 'info';
  return (
    <div className={`p-5 rounded-xl border-l-4 my-4 transition-all ${styles[level]}`}>
      <div className="flex items-center gap-3 mb-2 opacity-40">
        <Icons.Note /><span className="font-black uppercase text-[8px] tracking-widest">{level}</span>
        <div className="ml-auto flex gap-2">
          {Object.keys(styles).map(k => (
            <button key={k} type="button" onClick={() => onChange({...block, metadata: {...block.metadata, level: k as any}})}
              className={`w-2.5 h-2.5 rounded-full ${k === 'info' ? 'bg-blue-500' : k === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'} ${level === k ? 'ring-2 ring-offset-1 ring-primary-500/50' : ''}`} />
          ))}
        </div>
      </div>
      <div contentEditable suppressContentEditableWarning onBlur={(e) => onChange({...block, content: e.currentTarget.innerHTML})}
        className="outline-none text-lg font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: block.content }} />
    </div>
  );
};

export const ImageBlock: React.FC<{ block: EditorBlock; onChange: (b: EditorBlock) => void }> = ({ block, onChange }) => {
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try { const url = await uploadMedia(file); onChange({...block, content: url}); }
    catch { alert('Upload failed'); } finally { setLoading(false); }
  };
  return (
    <div className="my-4 group relative rounded-xl overflow-hidden border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 transition-all">
      <input type="file" ref={inputRef} className="hidden" accept="image/*" onChange={handleUpload} />
      {block.content ? (
        <div className="relative">
          <img src={block.content} className="w-full object-contain max-h-[500px]" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
            <button type="button" onClick={() => inputRef.current?.click()} className="px-6 py-2 bg-white text-gray-900 rounded-xl font-bold text-sm">Replace</button>
            <button type="button" onClick={() => onChange({...block, content: ''})} className="px-6 py-2 bg-red-500 text-white rounded-xl font-bold text-sm">Remove</button>
          </div>
        </div>
      ) : (
        <button type="button" disabled={loading} onClick={() => inputRef.current?.click()} className="w-full p-12 flex flex-col items-center gap-3 text-gray-400 hover:text-primary-500 transition-colors">
          {loading ? <span className="material-symbols-rounded animate-spin text-3xl">sync</span> : <span className="material-symbols-rounded text-3xl">add_photo_alternate</span>}
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{loading ? 'Uploading...' : 'Add Image'}</span>
        </button>
      )}
    </div>
  );
};

export const CarouselBlock: React.FC<{ block: EditorBlock; onChange: (b: EditorBlock) => void }> = ({ block, onChange }) => {
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const images = block.metadata?.images || [];
  
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const url = await uploadMedia(file);
      const newImg = { id: Math.random().toString(36).substr(2, 9), url, caption: '' };
      onChange({ ...block, metadata: { ...block.metadata, images: [...images, newImg] } });
    } catch { 
      alert('Upload failed'); 
    } finally { 
      setLoading(false); 
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="my-6 bg-gray-50/50 dark:bg-white/5 p-6 rounded-2xl border border-gray-100 dark:border-white/5 transition-all">
      <input type="file" ref={inputRef} className="hidden" accept="image/*" onChange={handleUpload} />
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <span className="material-symbols-rounded text-sm">collections</span> Gallery Block
        </h4>
        <button onClick={() => inputRef.current?.click()} disabled={loading} className="px-4 py-2 bg-primary-600 text-white text-[9px] font-black uppercase rounded-lg hover:bg-primary-700 transition-colors shadow-lg">
          {loading ? '...' : '+ Add'}
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {images.map(img => (
          <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden group border border-white/10 shadow-sm">
            <img src={img.url} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button onClick={() => onChange({...block, metadata: {...block.metadata, images: images.filter(x => x.id !== img.id)}})}
                className="p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-all"><Icons.Trash /></button>
            </div>
          </div>
        ))}
        {images.length === 0 && !loading && (
          <div className="col-span-full py-8 text-center text-[9px] font-bold text-gray-400 uppercase tracking-widest italic opacity-50">
            Click + Add to build your gallery
          </div>
        )}
      </div>
    </div>
  );
};
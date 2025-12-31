
import React, { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface RichContentProps {
  htmlContent: string;
}

// Helpers to identify custom components embedded in the HTML string
const prepareHtmlForParsing = (html: string) => {
  let processed = html;
  processed = processed.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return processed;
};

const NoteBlock: React.FC<{ type: string; children: React.ReactNode }> = ({ type, children }) => {
  const styles: Record<string, string> = {
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
    tip: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  };

  const icons: Record<string, string> = {
    info: 'info',
    warning: 'warning',
    tip: 'lightbulb',
    success: 'check_circle',
    error: 'error',
  };

  return (
    <div className={`flex gap-3 p-5 my-8 rounded-xl border-l-4 ${styles[type] || styles.info} shadow-sm transition-colors`}>
      <span className="material-symbols-rounded shrink-0 text-2xl">{icons[type] || 'info'}</span>
      <div className="flex-1 text-base md:text-lg font-medium leading-relaxed">{children}</div>
    </div>
  );
};

const CodeRenderer: React.FC<{ language: string; code: string; title?: string }> = ({ language, code, title }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-dark-border bg-[#0d1117] shadow-xl my-8 max-w-full group">
      <div className="flex items-center justify-between px-5 py-3 bg-[#161b22] border-b border-gray-800">
        <div className="flex items-center gap-2">
           <div className="flex gap-1.5">
             <div className="w-2.5 h-2.5 rounded-full bg-red-500/40 group-hover:bg-red-500/80 transition-colors"></div>
             <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40 group-hover:bg-amber-500/80 transition-colors"></div>
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40 group-hover:bg-emerald-500/80 transition-colors"></div>
           </div>
           <span className="ml-4 text-[10px] text-gray-400 font-mono uppercase font-black tracking-widest">{title || language || 'text'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-all bg-gray-800/30 hover:bg-gray-800/80 px-3 py-1.5 rounded-lg"
        >
          <span className="material-symbols-rounded text-base">
            {copied ? 'check' : 'content_copy'}
          </span>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="overflow-x-auto scrollbar-hide">
        <SyntaxHighlighter
          language={language || 'text'}
          style={vscDarkPlus}
          customStyle={{ margin: 0, padding: '1.5rem', fontSize: '0.95rem', lineHeight: '1.7', background: 'transparent' }}
          showLineNumbers={false} 
        >
          {code.trim()}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

const MultiCodeRenderer: React.FC<{ snippets: { label: string; language: string; content: string }[] }> = ({ snippets }) => {
  const [active, setActive] = useState(0);

  if (!snippets || snippets.length === 0) return null;

  return (
    <div className="my-10 rounded-2xl overflow-hidden border border-gray-200 dark:border-dark-border bg-[#0d1117] shadow-2xl">
      <div className="flex items-center bg-[#161b22] border-b border-gray-800 overflow-x-auto scrollbar-hide">
        {snippets.map((s, idx) => (
          <button
            key={idx}
            onClick={() => setActive(idx)}
            className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${
              active === idx 
                ? 'text-primary-400 border-primary-500 bg-primary-500/5' 
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="relative">
        <SyntaxHighlighter 
          language={snippets[active].language} 
          style={vscDarkPlus} 
          customStyle={{ margin: 0, padding: '2rem', background: 'transparent', fontSize: '0.9rem', lineHeight: '1.7' }}
        >
          {snippets[active].content.trim()}
        </SyntaxHighlighter>
        <button 
          onClick={() => {
            navigator.clipboard.writeText(snippets[active].content);
            alert('Copied to clipboard');
          }}
          className="absolute top-4 right-4 p-2 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-all"
        >
          <span className="material-symbols-rounded text-sm">content_copy</span>
        </button>
      </div>
    </div>
  );
};

interface CarouselItem {
  url: string;
  caption: string;
}

const CarouselBlock: React.FC<{ items: CarouselItem[] }> = ({ items }) => {
  const [current, setCurrent] = useState(0);

  if (!items || items.length === 0) return null;

  return (
    <div className="my-10 w-full animate-fade-in">
      <div className="relative group rounded-3xl overflow-hidden shadow-2xl bg-gray-50 dark:bg-dark-surface/30 aspect-video border border-gray-200 dark:border-dark-border">
        <div 
          className="w-full h-full bg-center bg-cover transition-all duration-700 ease-out"
          style={{ backgroundImage: `url('${items[current].url}')` }}
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        {items.length > 1 && (
          <>
            <button 
              onClick={() => setCurrent(c => (c === 0 ? items.length - 1 : c - 1))}
              className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center bg-white/10 hover:bg-white/30 backdrop-blur-xl rounded-full text-white transition-all z-10 opacity-0 group-hover:opacity-100 border border-white/20 hover:scale-110 active:scale-95"
            >
              <span className="material-symbols-rounded text-3xl">chevron_left</span>
            </button>
            <button 
              onClick={() => setCurrent(c => (c === items.length - 1 ? 0 : c + 1))}
              className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center bg-white/10 hover:bg-white/30 backdrop-blur-xl rounded-full text-white transition-all z-10 opacity-0 group-hover:opacity-100 border border-white/20 hover:scale-110 active:scale-95"
            >
              <span className="material-symbols-rounded text-3xl">chevron_right</span>
            </button>
          </>
        )}

        <div className="absolute bottom-0 inset-x-0 p-8 text-white translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
          <div className="flex items-end justify-between gap-4">
             <div className="flex-1">
                <p className="text-lg font-bold drop-shadow-lg">{items[current].caption || 'Module step visualization'}</p>
             </div>
             <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 whitespace-nowrap">
               {current + 1} / {items.length}
             </div>
          </div>
        </div>
      </div>
      
      {items.length > 1 && (
        <div className="flex justify-center gap-3 mt-6">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`h-1.5 rounded-full transition-all duration-500 ${idx === current ? 'bg-primary-600 w-12' : 'bg-gray-200 dark:bg-gray-700 w-3 hover:bg-gray-300'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main parsing component
export const RichContent: React.FC<RichContentProps> = ({ htmlContent }) => {
  const [nodes, setNodes] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    if (!htmlContent) return;

    const processedHtml = prepareHtmlForParsing(htmlContent);
    const parser = new DOMParser();
    const doc = parser.parseFromString(processedHtml, 'text/html');
    
    const domToReact = (node: Node, index: number): React.ReactNode => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();
        
        // --- Special Block Rendering ---

        if (tagName === 'note') {
          return (
            <NoteBlock key={index} type={element.getAttribute('type') || 'info'}>
              {Array.from(element.childNodes).map((child, i) => domToReact(child, i))}
            </NoteBlock>
          );
        }

        if (tagName === 'code') {
          return (
            <CodeRenderer 
              key={index} 
              language={element.getAttribute('language') || 'javascript'} 
              code={element.textContent || ''} 
            />
          );
        }

        if (tagName === 'multicode') {
          const snippets = Array.from(element.querySelectorAll('snippet')).map(s => ({
            label: s.getAttribute('label') || 'Snippet',
            language: s.getAttribute('language') || 'javascript',
            content: s.textContent || ''
          }));
          return <MultiCodeRenderer key={index} snippets={snippets} />;
        }

        if (tagName === 'carousel') {
          const items: CarouselItem[] = Array.from(element.querySelectorAll('img')).map(img => ({
            url: img.getAttribute('src') || '',
            caption: img.getAttribute('alt') || ''
          }));
          return <CarouselBlock key={index} items={items} />;
        }

        if (tagName === 'img' && !element.closest('carousel')) {
          return (
            <div key={index} className="my-10 group relative">
              <img 
                src={element.getAttribute('src') || ''} 
                alt={element.getAttribute('alt') || 'Topic illustration'}
                className="rounded-3xl shadow-xl max-w-full h-auto mx-auto border border-gray-100 dark:border-dark-border group-hover:scale-[1.01] transition-transform duration-500"
                loading="lazy"
              />
              {element.getAttribute('alt') && (
                <p className="text-center text-xs text-gray-400 mt-4 italic font-medium">
                  {element.getAttribute('alt')}
                </p>
              )}
            </div>
          );
        }

        // --- Standard Typography Mapping ---
        const props: any = { key: index };
        
        if (tagName === 'h1') props.className = 'text-4xl md:text-5xl font-black mb-6 mt-12 font-display text-gray-900 dark:text-white tracking-tight';
        if (tagName === 'h2') props.className = 'text-3xl font-bold mb-4 mt-10 font-display text-gray-900 dark:text-white tracking-tight';
        if (tagName === 'h3') props.className = 'text-xl font-bold mb-3 mt-8 font-display text-gray-800 dark:text-gray-100';
        if (tagName === 'p') props.className = 'text-lg leading-relaxed text-gray-700 dark:text-gray-300 mb-6';
        if (tagName === 'ul') props.className = 'list-disc list-outside mb-8 space-y-3 pl-6 text-gray-700 dark:text-gray-300';
        if (tagName === 'ol') props.className = 'list-decimal list-outside mb-8 space-y-3 pl-6 text-gray-700 dark:text-gray-300';
        if (tagName === 'li') props.className = 'pl-2';
        if (tagName === 'strong' || tagName === 'b') props.className = 'font-bold text-gray-900 dark:text-white';
        if (tagName === 'em' || tagName === 'i') props.className = 'italic';

        // Void elements
        const voidElements = ['br', 'hr', 'img', 'input', 'link', 'meta'];
        if (voidElements.includes(tagName)) {
           return React.createElement(tagName, props);
        }

        const children = Array.from(element.childNodes).map((child, i) => domToReact(child, i));
        
        // Remove empty paragraphs
        if (tagName === 'p' && (children.length === 0 || (children.length === 1 && !children[0]))) {
          return null;
        }

        return React.createElement(tagName, props, children);
      }
      return null;
    };

    const reactNodes = Array.from(doc.body.childNodes).map((node, i) => domToReact(node, i));
    setNodes(reactNodes);

  }, [htmlContent]);

  return <div className="rich-content w-full max-w-4xl mx-auto">{nodes}</div>;
};

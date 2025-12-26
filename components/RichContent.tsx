import React, { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface RichContentProps {
  htmlContent: string;
}

// Helpers to identify custom components embedded in the HTML string
const unescapeCustomTags = (html: string) => {
  let processed = html;

  // 1. Aggressively unwrap P tags from start/end markers
  // Handles <p>&lt;tag&gt;</p> and <p>&lt;/tag&gt;</p>
  processed = processed.replace(/<p[^>]*>\s*(&lt;\/?(carousel|code-collection|code).*?&gt;)\s*<\/p>/gi, '$1');
  
  // 2. Process specific tags
  
  // Custom Code: Regex to capture content between encoded tags. 
  // We accept that content might contain HTML tags (like <p>) due to editor formatting.
  processed = processed.replace(/&lt;code language="(.*?)"&gt;([\s\S]*?)&lt;\/code&gt;/gi, (match, lang, content) => {
     // Clean up the code content
     let cleanContent = content
        .replace(/<\/p>\s*<p>/g, '\n') // Adjacent paragraphs -> newline
        .replace(/<\/p>/g, '\n')       // End of paragraph -> newline
        .replace(/<br\s*\/?>/g, '\n')  // BR -> newline
        .replace(/<[^>]+>/g, '')       // Strip any remaining tags
        // Decode entities
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');

     return `<custom-code language="${lang}">${cleanContent}</custom-code>`;
  });

  // Other custom tags
  processed = processed
    .replace(/&lt;note type="(.*?)"&gt;(.*?)&lt;\/note&gt;/gi, '<custom-note type="$1">$2</custom-note>')
    .replace(/&lt;code-collection&gt;([\s\S]*?)&lt;\/code-collection&gt;/gi, '<custom-code-collection>$1</custom-code-collection>')
    .replace(/&lt;carousel&gt;([\s\S]*?)&lt;\/carousel&gt;/gi, '<custom-carousel>$1</custom-carousel>')
    .replace(/&lt;image src="(.*?)" \/&gt;/gi, '<custom-image src="$1" />')
    .replace(/&lt;img src="(.*?)" \/&gt;/gi, '<custom-image src="$1" />');

  return processed;
};

const NoteBlock: React.FC<{ type: string; children: React.ReactNode }> = ({ type, children }) => {
  const styles: Record<string, string> = {
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  };

  const icons: Record<string, string> = {
    info: 'info',
    warning: 'warning',
    success: 'check_circle',
    error: 'error',
  };

  return (
    <div className={`flex gap-3 p-4 my-6 rounded-lg border ${styles[type] || styles.info} shadow-sm`}>
      <span className="material-symbols-rounded shrink-0">{icons[type] || 'info'}</span>
      <div className="flex-1 text-sm md:text-base">{children}</div>
    </div>
  );
};

const CodeRenderer = ({ language, code }: { language: string; code: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-dark-border bg-[#1e1e1e] shadow-md my-4 max-w-full">
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
        <span className="text-xs text-gray-400 font-mono uppercase font-bold">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <span className="material-symbols-rounded text-[16px]">
            {copied ? 'check' : 'content_copy'}
          </span>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={language || 'text'}
          style={vscDarkPlus}
          customStyle={{ margin: 0, padding: '1.5rem', fontSize: '0.9rem', lineHeight: '1.6' }}
          showLineNumbers={false} 
        >
          {code.trim()}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  return <div className="w-full"><CodeRenderer language={language} code={code} /></div>;
};

interface CodeTabItem {
  language: string;
  code: string;
}

const CodeTabs: React.FC<{ items: CodeTabItem[] }> = ({ items }) => {
  const [activeTab, setActiveTab] = useState(0);

  if (!items || items.length === 0) return null;

  return (
    <div className="my-8 w-full">
      <div className="flex items-center gap-1 mb-0 overflow-x-auto pb-0 scrollbar-hide border-b border-gray-200 dark:border-dark-border px-1">
        {items.map((item, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`px-4 py-2 rounded-t-lg text-sm font-bold transition-all border-t border-x relative top-[1px] ${
              activeTab === idx
                ? 'bg-[#1e1e1e] border-[#1e1e1e] text-white'
                : 'bg-gray-100 dark:bg-dark-surface border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {item.language ? item.language.toUpperCase() : 'CODE'}
          </button>
        ))}
      </div>
      <div className="rounded-b-xl rounded-tr-xl bg-[#1e1e1e]">
         <CodeRenderer language={items[activeTab].language} code={items[activeTab].code} />
      </div>
    </div>
  );
};

const CarouselBlock: React.FC<{ images: string[] }> = ({ images }) => {
  const [current, setCurrent] = useState(0);

  if (!images || images.length === 0) return null;

  return (
    <div className="my-8 w-full">
      <div className="relative group rounded-xl overflow-hidden shadow-lg bg-gray-100 dark:bg-gray-800 aspect-video border border-gray-200 dark:border-gray-700">
        <div 
          className="w-full h-full bg-contain bg-center bg-no-repeat transition-all duration-500"
          style={{ backgroundImage: `url('${images[current]}')` }}
        />
        
        {images.length > 1 && (
          <>
            <button 
              onClick={() => setCurrent(c => (c === 0 ? images.length - 1 : c - 1))}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-all z-10"
            >
              <span className="material-symbols-rounded">chevron_left</span>
            </button>
            <button 
              onClick={() => setCurrent(c => (c === images.length - 1 ? 0 : c + 1))}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-all z-10"
            >
              <span className="material-symbols-rounded">chevron_right</span>
            </button>
            
            {/* Image Counter Badge */}
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-mono font-medium border border-white/10 select-none">
              {current + 1} / {images.length}
            </div>

            {/* Dots Indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrent(idx)}
                  className={`w-2 h-2 rounded-full transition-all shadow-sm ${idx === current ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Main parsing component
export const RichContent: React.FC<RichContentProps> = ({ htmlContent }) => {
  const [nodes, setNodes] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    if (!htmlContent) return;

    const processedHtml = unescapeCustomTags(htmlContent);
    const parser = new DOMParser();
    const doc = parser.parseFromString(processedHtml, 'text/html');
    
    const domToReact = (node: Node, index: number): React.ReactNode => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
        
        // Handling Custom Components
        if (tagName === 'custom-note') {
          return (
            <NoteBlock key={index} type={element.getAttribute('type') || 'info'}>
              {Array.from(element.childNodes).map((child, i) => domToReact(child, i))}
            </NoteBlock>
          );
        }

        if (tagName === 'custom-code') {
          return (
            <CodeBlock 
              key={index} 
              language={element.getAttribute('language') || 'text'} 
              code={element.textContent || ''} 
            />
          );
        }

        if (tagName === 'custom-code-collection') {
          const codeItems: CodeTabItem[] = [];
          const children = element.getElementsByTagName('custom-code');
          for(let i=0; i<children.length; i++) {
             const child = children[i];
             codeItems.push({
               language: child.getAttribute('language') || 'text',
               code: child.textContent || ''
             });
          }
          return <CodeTabs key={index} items={codeItems} />;
        }

        if (tagName === 'custom-image') {
          return (
            <img 
              key={index}
              src={element.getAttribute('src') || ''} 
              alt="Content illustration"
              className="rounded-lg shadow-md max-w-full h-auto my-8 mx-auto border border-gray-100 dark:border-gray-700"
              loading="lazy"
            />
          );
        }

        if (tagName === 'custom-carousel') {
          const images: string[] = [];
          const imgTags = element.getElementsByTagName('custom-image');
          for (let i = 0; i < imgTags.length; i++) {
            const src = imgTags[i].getAttribute('src');
            if (src) images.push(src);
          }
          return <CarouselBlock key={index} images={images} />;
        }

        // Standard HTML Elements mapping
        const props: any = { key: index };
        Array.from(element.attributes).forEach(attr => {
          if (attr.name === 'class') props.className = attr.value;
          else if (attr.name === 'style') { /* skip style */ }
          else props[attr.name] = attr.value;
        });

        // Void elements
        const voidElements = [
          'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
          'link', 'meta', 'param', 'source', 'track', 'wbr'
        ];

        if (voidElements.includes(tagName)) {
           return React.createElement(tagName, props);
        }

        const children = Array.from(element.childNodes).map((child, i) => domToReact(child, i));

        if (tagName === 'p' && children.length === 0) return null;
        
        // Unwrap logic: If P contains blocks, convert P to DIV
        if (tagName === 'p') {
           const hasBlockChild = children.some(c => 
             React.isValidElement(c) && 
             (c.type === NoteBlock || c.type === CodeBlock || c.type === CodeTabs || c.type === CarouselBlock)
           );
           if (hasBlockChild) return <div key={index} className="my-4">{children}</div>;
           
           // Apply typography classes
           props.className = (props.className || '') + ' mb-6 leading-7 text-gray-700 dark:text-gray-300';
        }
        
        if (tagName === 'h1') props.className = (props.className || '') + ' text-3xl font-bold mb-4 mt-8 font-display text-gray-900 dark:text-white';
        if (tagName === 'h2') props.className = (props.className || '') + ' text-2xl font-bold mb-3 mt-6 font-display text-gray-900 dark:text-white';
        if (tagName === 'h3') props.className = (props.className || '') + ' text-xl font-bold mb-2 mt-5 font-display text-gray-900 dark:text-white';
        if (tagName === 'ul') props.className = (props.className || '') + ' list-disc list-inside mb-6 space-y-2';
        if (tagName === 'ol') props.className = (props.className || '') + ' list-decimal list-inside mb-6 space-y-2';

        return React.createElement(tagName, props, children);
      }
      return null;
    };

    const reactNodes = Array.from(doc.body.childNodes).map((node, i) => domToReact(node, i));
    setNodes(reactNodes);

  }, [htmlContent]);

  return <div className="rich-content w-full max-w-none">{nodes}</div>;
};
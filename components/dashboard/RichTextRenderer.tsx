import React from 'react';

interface RichTextRendererProps {
  text: string;
  className?: string;
}

export default function RichTextRenderer({ text, className = '' }: RichTextRendererProps) {
  if (!text) return null;

  // 1. Split into math blocks ($$...$$), inline math ($...$) and regular text
  const parts: { type: 'text' | 'block-math' | 'inline-math'; content: string }[] = [];
  const regex = /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g;
  
  let match;
  let lastIndex = 0;
  
  while ((match = regex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchContent = match[0];
    const matchEnd = matchStart + matchContent.length;
    
    // Add text preceding the match
    if (matchStart > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, matchStart)
      });
    }
    
    if (matchContent.startsWith('$$') && matchContent.endsWith('$$')) {
      parts.push({
        type: 'block-math',
        content: matchContent.slice(2, -2).trim()
      });
    } else {
      parts.push({
        type: 'inline-math',
        content: matchContent.slice(1, -1).trim()
      });
    }
    
    lastIndex = matchEnd;
  }
  
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  // Helper to parse math formulas to styled JSX
  const parseMathToJSX = (str: string, isBlock: boolean): React.ReactNode => {
    let processed = str;
    
    // Convert common LaTeX math/science shorthand symbols
    const symbolsMap: Record<string, string> = {
      '\\pm': '±',
      '\\times': '×',
      '\\div': '÷',
      '\\alpha': 'α',
      '\\beta': 'β',
      '\\gamma': 'γ',
      '\\delta': 'δ',
      '\\theta': 'θ',
      '\\pi': 'π',
      '\\lambda': 'λ',
      '\\sigma': 'σ',
      '\\omega': 'ω',
      '\\rightarrow': '→',
      '\\rightleftharpoons': '⇌',
      '\\degree': '°',
      '\\Delta': 'Δ',
      '\\sum': '∑',
      '\\int': '∫',
      '\\infty': '∞',
      '\\neq': '≠',
      '\\approx': '≈',
      '\\le': '≤',
      '\\ge': '≥',
      '\\mu': 'μ',
      '\\phi': 'φ'
    };
    
    Object.entries(symbolsMap).forEach(([key, val]) => {
      processed = processed.replaceAll(key, val);
    });

    let i = 0;
    
    const parseNext = (): React.ReactNode[] => {
      const nodes: React.ReactNode[] = [];
      
      while (i < processed.length) {
        if (processed.startsWith('\\frac', i)) {
          i += 5; // skip \frac
          const numText = extractBracedContent();
          const denText = extractBracedContent();
          
          nodes.push(
            <span key={`frac-${i}`} className="inline-flex flex-col items-center justify-center align-middle mx-1" style={{ fontSize: '0.82em' }}>
              <span className="border-b border-current px-1 text-center leading-none pb-0.5">{parseMathToJSX(numText, false)}</span>
              <span className="text-center leading-none pt-0.5">{parseMathToJSX(denText, false)}</span>
            </span>
          );
        } else if (processed.startsWith('\\sqrt', i)) {
          i += 5; // skip \sqrt
          const innerText = extractBracedContent();
          nodes.push(
            <span key={`sqrt-${i}`} className="inline-flex items-center align-middle mx-1">
              <span className="text-lg leading-none" style={{ transform: 'translateY(-1px)' }}>√</span>
              <span className="border-t border-current px-0.5" style={{ fontSize: '0.92em' }}>{parseMathToJSX(innerText, false)}</span>
            </span>
          );
        } else if (processed[i] === '^') {
          i++;
          let supVal = '';
          if (processed[i] === '{') {
            supVal = extractBracedContent();
          } else {
            supVal = processed[i] || '';
            i++;
          }
          nodes.push(<sup key={`sup-${i}`} className="text-[0.72em] leading-none align-super select-none font-medium">{parseMathToJSX(supVal, false)}</sup>);
        } else if (processed[i] === '_') {
          i++;
          let subVal = '';
          if (processed[i] === '{') {
            subVal = extractBracedContent();
          } else {
            subVal = processed[i] || '';
            i++;
          }
          nodes.push(<sub key={`sub-${i}`} className="text-[0.72em] leading-none align-sub select-none font-medium">{parseMathToJSX(subVal, false)}</sub>);
        } else {
          nodes.push(processed[i]);
          i++;
        }
      }
      
      return nodes;
    };
    
    const extractBracedContent = (): string => {
      if (processed[i] !== '{') return '';
      i++; // skip '{'
      let braceCount = 1;
      let start = i;
      while (i < processed.length) {
        if (processed[i] === '{') braceCount++;
        else if (processed[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            const content = processed.substring(start, i);
            i++; // skip '}'
            return content;
          }
        }
        i++;
      }
      return '';
    };
    
    const children = parseNext();
    
    if (isBlock) {
      return (
        <span key={`block-math-wrapper-${str}`} className="block text-center my-4 font-serif text-lg text-primary bg-primary/5 py-4 px-6 rounded-2xl border border-primary/20 shadow-sm max-w-xl mx-auto">
          {children}
        </span>
      );
    }
    
    return (
      <span key={`inline-math-wrapper-${str}`} className="inline-serif text-amber-600 bg-amber-500/5 px-1 py-0.5 rounded font-bold mx-0.5 align-middle">
        {children}
      </span>
    );
  };

  // Helper to parse regular Markdown line structures
  const parseMarkdownToJSX = (mdText: string): React.ReactNode => {
    const lines = mdText.split('\n');
    
    return (
      <div className="space-y-1.5">
        {lines.map((line, lineIdx) => {
          const trimmed = line.trim();
          
          if (trimmed.startsWith('### ')) {
            return <h4 key={`h4-${lineIdx}`} className="text-base font-bold text-foreground mt-3 mb-1.5">{parseInlineMarkdown(trimmed.substring(4))}</h4>;
          }
          if (trimmed.startsWith('## ')) {
            return <h3 key={`h3-${lineIdx}`} className="text-lg font-bold text-foreground mt-4 mb-2">{parseInlineMarkdown(trimmed.substring(3))}</h3>;
          }
          if (trimmed.startsWith('# ')) {
            return <h2 key={`h2-${lineIdx}`} className="text-xl font-bold text-foreground mt-5 mb-2.5">{parseInlineMarkdown(trimmed.substring(2))}</h2>;
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <div key={`li-${lineIdx}`} className="flex gap-2 pl-4 items-start py-0.5">
                <span className="text-primary font-bold select-none">•</span>
                <span className="flex-1">{parseInlineMarkdown(trimmed.substring(2))}</span>
              </div>
            );
          }
          
          return (
            <p key={`p-${lineIdx}`} className="leading-relaxed">
              {parseInlineMarkdown(line)}
            </p>
          );
        })}
      </div>
    );
  };

  const parseInlineMarkdown = (inlineText: string): React.ReactNode => {
    const inParts: { type: 'text' | 'bold' | 'italic' | 'code'; content: string }[] = [];
    const regexIn = /(\*\*[\s\S]*?\*\*|\*[^*]+?\*|`[^`]+?`)/g;
    
    let matchIn;
    let lastInIndex = 0;
    
    while ((matchIn = regexIn.exec(inlineText)) !== null) {
      const matchStart = matchIn.index;
      const matchContent = matchIn[0];
      const matchEnd = matchStart + matchContent.length;
      
      if (matchStart > lastInIndex) {
        inParts.push({
          type: 'text',
          content: inlineText.substring(lastInIndex, matchStart)
        });
      }
      
      if (matchContent.startsWith('**') && matchContent.endsWith('**')) {
        inParts.push({
          type: 'bold',
          content: matchContent.slice(2, -2)
        });
      } else if (matchContent.startsWith('*') && matchContent.endsWith('*')) {
        inParts.push({
          type: 'italic',
          content: matchContent.slice(1, -1)
        });
      } else if (matchContent.startsWith('`') && matchContent.endsWith('`')) {
        inParts.push({
          type: 'code',
          content: matchContent.slice(1, -1)
        });
      }
      
      lastInIndex = matchEnd;
    }
    
    if (lastInIndex < inlineText.length) {
      inParts.push({
        type: 'text',
        content: inlineText.substring(lastInIndex)
      });
    }
    
    return inParts.map((p, idx) => {
      switch (p.type) {
        case 'bold':
          return <strong key={idx} className="font-bold text-foreground">{p.content}</strong>;
        case 'italic':
          return <em key={idx} className="italic text-muted-foreground">{p.content}</em>;
        case 'code':
          return <code key={idx} className="font-mono bg-muted text-rose-500 px-1.5 py-0.5 rounded text-sm font-semibold border border-border">{p.content}</code>;
        default:
          return p.content;
      }
    });
  };

  return (
    <div className={`rich-text-container ${className}`}>
      {parts.map((part, idx) => {
        if (part.type === 'block-math') {
          return parseMathToJSX(part.content, true);
        } else if (part.type === 'inline-math') {
          return parseMathToJSX(part.content, false);
        } else {
          return <React.Fragment key={idx}>{parseMarkdownToJSX(part.content)}</React.Fragment>;
        }
      })}
    </div>
  );
}

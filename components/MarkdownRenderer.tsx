import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Split by newlines to handle block elements
  const lines = content.split('\n');
  
  const renderLine = (line: string, index: number) => {
    // Headers
    if (line.startsWith('### ')) {
      return <h3 key={index} className="text-xl md:text-2xl font-bold text-yellow-400 mt-6 mb-3 tracking-tight">{parseInline(line.replace('### ', ''))}</h3>;
    }
    if (line.startsWith('## ')) {
      return <h2 key={index} className="text-2xl md:text-3xl font-extrabold text-white mt-8 mb-4 border-b border-slate-700 pb-2">{parseInline(line.replace('## ', ''))}</h2>;
    }
    if (line.startsWith('# ')) {
      return <h1 key={index} className="text-3xl md:text-4xl font-black text-white mt-8 mb-6">{parseInline(line.replace('# ', ''))}</h1>;
    }

    // List items
    if (line.trim().startsWith('- ')) {
      return (
        <li key={index} className="ml-4 list-disc text-slate-300 text-lg leading-relaxed my-2 font-medium">
          {parseInline(line.trim().replace('- ', ''))}
        </li>
      );
    }
    
    // Numbered lists (simple detection)
    if (/^\d+\.\s/.test(line.trim())) {
       return (
        <div key={index} className="ml-4 text-slate-300 text-lg leading-relaxed my-2 flex gap-3 font-medium">
            <span className="font-bold text-yellow-500/80">{line.trim().split(' ')[0]}</span>
            <span>{parseInline(line.trim().replace(/^\d+\.\s/, ''))}</span>
        </div>
       );
    }

    // JSON Code blocks (simple detection for start/end)
    if (line.startsWith('```')) {
      return null; // Skip code fences
    }

    // Empty lines
    if (line.trim() === '') {
      return <div key={index} className="h-3" />;
    }

    // Paragraphs
    return <p key={index} className="text-slate-300 text-lg leading-relaxed mb-3 font-medium">{parseInline(line)}</p>;
  };

  const parseInline = (text: string) => {
    // Split by bold markers
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Yellow fluorescent highlight for bold text
        return <strong key={i} className="font-extrabold text-yellow-300 mx-1">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="w-full">
      {lines.map((line, idx) => renderLine(line, idx))}
    </div>
  );
};

export default MarkdownRenderer;
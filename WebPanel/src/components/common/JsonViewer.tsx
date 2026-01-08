import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';

interface JsonViewerProps {
  content: string;
  className?: string;
  wrapLines?: boolean;
  showLineNumbers?: boolean;
}

export function JsonViewer({ 
  content, 
  className,
  wrapLines = true,
  showLineNumbers = false 
}: JsonViewerProps) {
  const { resolvedTheme } = useSettings();
  
  const customStyle = {
    margin: 0,
    padding: '1rem',
    borderRadius: '0.5rem',
    fontSize: '0.75rem',
    lineHeight: '1.5',
    background: 'transparent',
  };

  return (
    <div className={cn("bg-muted rounded-lg overflow-auto", className)}>
      <SyntaxHighlighter
        language="json"
        style={resolvedTheme === 'dark' ? oneDark : oneLight}
        customStyle={customStyle}
        wrapLines={wrapLines}
        wrapLongLines={wrapLines}
        showLineNumbers={showLineNumbers}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
}

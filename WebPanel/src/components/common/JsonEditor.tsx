import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-json';
import { cn } from '@/lib/utils';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  height?: string;
  showLineNumbers?: boolean;
  readOnly?: boolean;
}

export function JsonEditor({ 
  value, 
  onChange,
  className,
  height = "500px",
  showLineNumbers = true,
  readOnly = false
}: JsonEditorProps) {
  const highlightCode = (code: string) => {
    return Prism.highlight(code || ' ', Prism.languages.json, 'json');
  };

  return (
    <div 
      className={cn(
        "relative bg-background rounded-lg overflow-hidden border border-border",
        className
      )}
      style={{ height }}
    >
      <div className="h-full overflow-auto custom-scrollbar json-editor-container">
        <Editor
          value={value}
          onValueChange={onChange}
          highlight={highlightCode}
          padding={16}
          readOnly={readOnly}
          className="json-editor"
          textareaClassName="json-editor-textarea"
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            fontSize: '0.875rem',
            lineHeight: '1.5',
            minHeight: '100%',
          }}
        />
      </div>
    </div>
  );
}

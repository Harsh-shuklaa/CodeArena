import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import { RotateCw, AlertTriangle } from "lucide-react";

/**
 * Reusable Monaco Code Editor Component
 * Custom built for CodeArena with loading overlays, error boundaries,
 * layout auto-calculations, and input pointer isolation.
 */
export default function CodeEditor({
  code,
  onChange,
  language,
  theme = "vs-dark",
  options = {}
}) {
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Normalize language name into Monaco supported identifier
  const getMonacoLanguage = (lang) => {
    if (!lang) return "javascript";
    const l = lang.toUpperCase();
    if (l.includes("PYTHON")) return "python";
    if (l.includes("RUST")) return "rust";
    if (l.includes("C++")) return "cpp";
    if (l.includes("JAVA")) return "java";
    if (l.includes("C")) return "c";
    return "javascript";
  };

  const handleEditorDidMount = (editor, monaco) => {
    setIsEditorReady(true);
    
    // Focus the editor immediately
    editor.focus();

    // Prevent scrolling parent window on editor scroll
    editor.onDidScrollChange((e) => {
      e.stopPropagation();
    });
  };

  const handleEditorError = (err) => {
    console.error("[MONACO LOADING ERROR]", err);
    setHasError(true);
  };

  if (hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0d0d12] text-error font-mono border border-error/20 rounded-xl p-6 text-center space-y-4 select-none">
        <AlertTriangle className="w-8 h-8 text-error animate-pulse" />
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider">COMPILER CORE OFFLINE</h3>
          <p className="text-[10px] text-on-surface-variant/60 mt-1 max-w-xs leading-relaxed">
            Failed to download or configure the Monaco code compiling environment.
          </p>
        </div>
        <button
          onClick={() => setHasError(false)}
          className="px-4 py-2 border border-error/50 hover:bg-error/10 text-error text-[10px] font-bold rounded uppercase transition-all cursor-pointer"
        >
          REBOOT COMPILE NODE
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-[#0e0e13] rounded-xl overflow-hidden border border-white/5 flex flex-col pointer-events-auto">
      {/* Premium loader overlay */}
      {!isEditorReady && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0e0e13] font-mono select-none">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <RotateCw className="w-6 h-6 text-primary animate-spin" />
          </div>
          <span className="text-[9px] text-primary tracking-[0.3em] uppercase block mt-4 animate-pulse">
            CONNECTING COMPILER SOCKET...
          </span>
        </div>
      )}

      {/* Editor mounting target */}
      <div className="flex-grow w-full h-full relative z-10 pointer-events-auto">
        <Editor
          height="100%"
          width="100%"
          language={getMonacoLanguage(language)}
          theme={theme}
          value={code}
          onChange={onChange}
          onMount={handleEditorDidMount}
          onError={handleEditorError}
          options={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 13,
            minimap: { enabled: false },
            scrollbar: {
              vertical: "visible",
              horizontal: "visible",
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
              arrowSize: 0,
              useShadows: false
            },
            padding: { top: 12, bottom: 12 },
            lineNumbersMinChars: 3,
            lineDecorationsWidth: 10,
            cursorBlinking: "blink",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            automaticLayout: true, // Resize automatically when container dimensions shift
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            renderLineHighlight: "all",
            contextmenu: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: "on",
            ...options
          }}
        />
      </div>
    </div>
  );
}

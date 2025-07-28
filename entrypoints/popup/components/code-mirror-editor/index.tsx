import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import {
  defaultKeymap,
  history,
  historyKeymap,
  toggleBlockComment,
  toggleComment,
} from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { EditorState } from '@codemirror/state';
import { keymap, lineNumbers, ViewUpdate } from '@codemirror/view';
import { EditorView } from 'codemirror';
import React, { useEffect, useRef, useState } from 'react';

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  height?: string;
}

const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  onFocus,
  onBlur,
  height = '100%',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;

    const extensions = [
      // 基础编辑器功能（不使用basicSetup，避免冲突）
      lineNumbers(),
      history(),
      foldGutter(),
      indentOnInput(),
      bracketMatching(),
      autocompletion(),
      syntaxHighlighting(defaultHighlightStyle),

      // 使用JavaScript语言模式来支持JSON注释
      javascript({
        typescript: false,
      }),

      // 键盘映射
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...searchKeymap,
        // 自定义快捷键
        {
          key: 'Ctrl-/',
          mac: 'Cmd-/',
          run: toggleComment,
        },
        {
          key: 'Ctrl-Shift-/',
          mac: 'Cmd-Shift-/',
          run: toggleBlockComment,
        },
        {
          key: 'Ctrl-F',
          mac: 'Cmd-F',
          run: view => {
            // 这里可以添加搜索功能
            return false;
          },
        },
        {
          key: 'Ctrl-A',
          mac: 'Cmd-A',
          run: view => {
            const { from, to } = view.state.selection;
            if (from === 0 && to === view.state.doc.length) {
              return false;
            }
            view.dispatch({
              selection: { anchor: 0, head: view.state.doc.length },
            });
            return true;
          },
        },
      ]),

      // 编辑器更新监听
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString();
          onChange(newValue);
        }
      }),

      // 焦点事件监听
      EditorView.focusChangeEffect.of((state, focused) => {
        if (focused && onFocus) {
          onFocus();
        } else if (!focused && onBlur) {
          onBlur();
        }
        return null;
      }),

      // 主题样式
      EditorView.theme({
        '&': {
          height: height,
          fontSize: '14px',
        },
        '.cm-content': {
          padding: '12px',
          fontFamily: 'Monaco, "SF Mono", Consolas, monospace',
          minHeight: '100%',
        },
        '.cm-editor': {
          height: '100%',
        },
        '.cm-scroller': {
          height: '100%',
        },
        '.cm-focused': {
          outline: 'none',
        },
        '.cm-foldGutter': {
          width: '16px',
        },
        '.cm-lineNumbers': {
          minWidth: '40px',
          color: '#999',
        },
        '.cm-gutters': {
          backgroundColor: '#f8f8f8',
          border: 'none',
        },
      }),
    ];

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    editorViewRef.current = view;
    setIsReady(true);

    return () => {
      view.destroy();
      editorViewRef.current = null;
      setIsReady(false);
    };
  }, []);

  // 更新编辑器值
  useEffect(() => {
    if (editorViewRef.current && isReady) {
      const currentValue = editorViewRef.current.state.doc.toString();
      if (currentValue !== value) {
        const transaction = editorViewRef.current.state.update({
          changes: {
            from: 0,
            to: editorViewRef.current.state.doc.length,
            insert: value,
          },
        });
        editorViewRef.current.dispatch(transaction);
      }
    }
  }, [value, isReady]);

  return (
    <div
      ref={editorRef}
      className="code-mirror-container light"
      style={{ height: height }}
    />
  );
};

export default CodeMirrorEditor;

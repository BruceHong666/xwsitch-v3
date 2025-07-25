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
  foldAll,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
  unfoldAll,
} from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { keymap, lineNumbers, ViewUpdate } from '@codemirror/view';
import { EditorView } from 'codemirror';
import React, { useEffect, useRef, useState } from 'react';

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  height?: string;
  theme?: 'light' | 'dark';
}

const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  onFocus,
  onBlur,
  height = '100%',
  theme = 'light',
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
          key: 'Ctrl-Shift-f',
          mac: 'Cmd-Shift-f',
          run: view => {
            // 格式化JSON（支持注释）
            try {
              const text = view.state.doc.toString();

              // 尝试移除注释后格式化
              const withoutComments = text
                .replace(/\/\*[\s\S]*?\*\//g, '') // 移除多行注释
                .replace(/\/\/.*$/gm, ''); // 移除单行注释

              const formatted = JSON.stringify(
                JSON.parse(withoutComments),
                null,
                2
              );
              view.dispatch({
                changes: {
                  from: 0,
                  to: view.state.doc.length,
                  insert: formatted,
                },
              });
              return true;
            } catch {
              // 如果不是有效JSON，不格式化
              console.warn('Cannot format: Invalid JSON syntax');
              return false;
            }
          },
        },
        {
          key: 'Ctrl-Shift-[',
          mac: 'Cmd-Shift-[',
          run: view => {
            foldAll(view);
            return true;
          },
        },
        {
          key: 'Ctrl-Shift-]',
          mac: 'Cmd-Shift-]',
          run: view => {
            unfoldAll(view);
            return true;
          },
        },
      ]),

      // 更新监听器
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString();
          onChange(newValue);
        }
      }),

      // 焦点变化监听器
      EditorView.focusChangeEffect.of((_, focusing: boolean) => {
        if (focusing && onFocus) {
          onFocus();
        } else if (!focusing && onBlur) {
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

    // 添加主题
    if (theme === 'dark') {
      extensions.push(oneDark);
    }

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
      style={{
        width: '100%',
        height: height,
        border: '1px solid #d9d9d9',
        borderRadius: '6px',
        overflow: 'hidden',
        backgroundColor: theme === 'dark' ? '#282c34' : '#ffffff',
      }}
    />
  );
};

export default CodeMirrorEditor;

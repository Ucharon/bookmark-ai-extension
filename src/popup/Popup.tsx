import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Dropdown } from './Dropdown';

type View = 'idle' | 'loading' | 'success' | 'error' | 'configuring' | 'confirmation';

interface BookmarkFolder {
  id: string;
  path: string;
}

export function Popup() {
  const [view, setView] = useState<View>('loading');
  const [error, setError] = useState('');
  const [tabInfo, setTabInfo] = useState<{ title: string; url: string } | null>(null);
  const [finalCategory, setFinalCategory] = useState('');
  const [suggestedPath, setSuggestedPath] = useState('');
  const [bookmarkFolders, setBookmarkFolders] = useState<BookmarkFolder[]>([]);

  useEffect(() => {
    // Start by checking the configuration
    chrome.storage.sync.get(['apiKey', 'apiBaseUrl'], (settings) => {
        if (!settings.apiKey || !settings.apiBaseUrl) {
            setView('configuring');
            return;
        }
        
        // Then, get tab info
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
              setView('error');
              setError('无法访问当前页面。请在普通网页上使用本插件。');
              return;
            }
            const tab = tabs[0];
            if (tab.url?.startsWith('chrome://')) {
               setView('error');
               setError('无法在Chrome内部页面上使用此插件。');
               return;
            }
            setTabInfo({ title: tab.title || '无标题', url: tab.url || '' });
            setView('idle');
        });
    });

    // Get bookmark tree
    chrome.runtime.sendMessage({ action: 'getBookmarkTree' }, (tree) => {
      if (tree) {
        const flattenedFolders = flattenBookmarkTree(tree);
        setBookmarkFolders(flattenedFolders);
      }
    });

  }, []);

  const flattenBookmarkTree = (nodes: chrome.bookmarks.BookmarkTreeNode[]): BookmarkFolder[] => {
    const folders: BookmarkFolder[] = [];
    const traverse = (node: chrome.bookmarks.BookmarkTreeNode, path: string) => {
      if (node.url) return; // It's a bookmark, not a folder

      // Top-level folders like 'Bookmarks Bar' or 'Other Bookmarks' don't contribute to the path.
      const isRootContainer = node.parentId === '0';
      const currentPath = isRootContainer ? '' : (path ? `${path}/${node.title}` : node.title);
      
      // We add the folder to the list, but only if it's not a top-level container.
      if (!isRootContainer && node.title) {
        folders.push({ id: node.id, path: currentPath });
      }

      if (node.children) {
        node.children.forEach(child => traverse(child, currentPath));
      }
    };
    
    // The API returns a single root node, its children are the top-level folders.
    // We start traversal from them.
    if (nodes && nodes.length > 0 && nodes[0].children) {
      nodes[0].children.forEach(child => traverse(child, ''));
    }

    return folders;
  };

  const handleGetClassification = () => {
    setView('loading');
    chrome.runtime.sendMessage({ action: 'getAiClassification' }, (response) => {
      if (response.status === 'success') {
        // Pre-process the path from AI to remove the root folder name before displaying
        let processedPath = response.categoryPath;
        if (processedPath.startsWith('书签栏/')) {
          processedPath = processedPath.substring('书签栏/'.length);
        } else if (processedPath.startsWith('Bookmarks Bar/')) {
          processedPath = processedPath.substring('Bookmarks Bar/'.length);
        }

        setSuggestedPath(processedPath);
        setTabInfo(response.tab); // Make sure tabInfo is updated from background
        setView('confirmation');
      } else {
        setError(response.message || '发生了未知错误');
        setView('error');
      }
    });
  };

  const handleConfirmSave = () => {
    if (!tabInfo) return;
    setView('loading');
    chrome.runtime.sendMessage({ 
      action: 'saveBookmark', 
      title: tabInfo.title, 
      url: tabInfo.url, 
      categoryPath: suggestedPath 
    }, (response) => {
      if (response.status === 'success') {
        setFinalCategory(response.category);
        setView('success');
      } else {
        setError(response.message || '发生了未知错误');
        setView('error');
      }
    });
  };

  const openOptionsPage = () => {
    chrome.runtime.openOptionsPage();
  };

  const renderContent = () => {
    switch (view) {
      case 'configuring':
        return (
          <div class="p-5 text-center space-y-4">
            <h3 class="text-xl font-bold text-gray-800">请先配置</h3>
            <p class="text-sm text-gray-600">为了使用AI分类功能, 请先设置您的API信息。</p>
            <button onClick={openOptionsPage} class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
              前往设置
            </button>
          </div>
        );
      case 'loading':
        return (
          <div class="flex flex-col items-center justify-center p-8 space-y-4">
            <div class="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-gray-600 text-lg">加载中...</p>
          </div>
        );
      case 'success':
        return (
          <div class="p-6 text-center space-y-4">
            <div class="mx-auto w-16 h-16 flex items-center justify-center bg-green-100 rounded-full">
                <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h3 class="text-xl font-bold text-gray-800">保存成功！</h3>
            <p class="text-sm text-gray-600">已存入分类:</p>
            <p class="text-md font-semibold text-blue-600 bg-blue-100 rounded-full px-4 py-1 inline-block">{finalCategory}</p>
             <button onClick={() => window.close()} class="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors">
              关闭
            </button>
          </div>
        );
      case 'error':
        return (
          <div class="p-5 text-center space-y-3">
            <h3 class="text-xl font-bold text-gray-800">出错了</h3>
            <p class="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
            <button onClick={() => setView('idle')} class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">
              返回重试
            </button>
          </div>
        );
      case 'confirmation':
        return (
          <div class="p-4 space-y-3">
            <h2 class="text-lg font-bold text-gray-800 text-center">确认分类</h2>
            <div class="bg-white p-2 rounded-md border border-gray-200">
                <p class="text-sm font-medium truncate text-gray-800" title={tabInfo?.title}>{tabInfo?.title}</p>
            </div>
            <div>
              <label for="category-path" class="block text-sm font-medium text-gray-700 mb-1">选择或确认分类</label>
              <Dropdown
                options={bookmarkFolders}
                value={suggestedPath}
                onChange={setSuggestedPath}
                suggestedPath={suggestedPath}
              />
            </div>
            <div class="flex gap-2">
              <button onClick={() => setView('idle')} class="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors">
                返回
              </button>
              <button onClick={handleConfirmSave} class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                确认保存
              </button>
            </div>
          </div>
        );
      case 'idle':
      default:
        return (
          <div class="p-4 space-y-3">
            <div class="relative text-center pb-1">
              <h1 class="text-lg font-bold text-gray-800">书签 AI 整理助手</h1>
              <button onClick={openOptionsPage} title="设置" class="absolute top-0 right-0 text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0l-.1.41a1.495 1.495 0 01-1.01.82l-.44.12C5.4 5.05 4.5 6.42 5.05 7.98l.12.44c.23.85.23 1.77 0 2.62l-.12.44c-.56 1.56.34 2.93 1.9 3.48l.44.12a1.495 1.495 0 01.82 1.01l.1.41c.38 1.56 2.6 1.56 2.98 0l.1-.41a1.495 1.495 0 011.01-.82l.44-.12c1.56-.56 2.45-1.92 1.9-3.48l-.12-.44a1.5 1.5 0 010-2.62l.12-.44c.56-1.56-.34-2.93-1.9-3.48l-.44-.12a1.495 1.495 0 01-.82-1.01l-.1-.41zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
            <div class="bg-white p-2 rounded-md border border-gray-200">
              <p class="text-sm font-medium truncate text-gray-800" title={tabInfo?.title}>{tabInfo?.title}</p>
              <p class="text-xs text-gray-500 truncate mt-0.5">{tabInfo?.url}</p>
            </div>
            <button onClick={handleGetClassification} class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-all transform hover:scale-102">
              <span class="text-lg">✨</span>
              <span>AI 智能分类</span>
            </button>
          </div>
        );
    }
  };

  return (
    <div class="w-80 bg-gray-50 text-gray-800 shadow-xl rounded-lg">
      {renderContent()}
    </div>
  );
} 
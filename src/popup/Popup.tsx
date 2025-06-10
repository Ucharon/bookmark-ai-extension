import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { Dropdown } from './Dropdown';
import { SettingsPanel } from './SettingsPanel';
import { PageAnalysis } from './PageAnalysis';

type View = 'idle' | 'loading' | 'success' | 'error' | 'configuring' | 'confirmation' | 'settings';

interface BookmarkFolder {
  id: string;
  path: string;
}

interface PageAnalysisData {
  description: string;
  keywords: string[];
  headings: string[];
  paragraphs: string[];
}

export function Popup() {
  const [view, setView] = useState<View>('loading');
  const [error, setError] = useState('');
  const [tabInfo, setTabInfo] = useState<{ title: string; url: string } | null>(null);
  const [finalCategory, setFinalCategory] = useState('');
  const [suggestedPath, setSuggestedPath] = useState('');
  const [bookmarkFolders, setBookmarkFolders] = useState<BookmarkFolder[]>([]);
  const [pageAnalysis, setPageAnalysis] = useState<PageAnalysisData>({
    description: '',
    keywords: [],
    headings: [],
    paragraphs: []
  });
  
  // 记录进入设置前的视图状态
  const [previousView, setPreviousView] = useState<View>('loading');

  useEffect(() => {
    checkApiConfiguration();
    
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
        
        // 设置页面分析数据（如果有）
        if (response.pageAnalysis) {
          setPageAnalysis(response.pageAnalysis);
        }
        
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
    // 记录当前视图状态，然后切换到设置视图
    setPreviousView(view);
    setView('settings');
  };

  // 检查API配置的函数
  const checkApiConfiguration = () => {
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
  };
  
  // 设置保存成功后的处理函数
  const handleSettingsSave = () => {
    // 重新检查API配置
    checkApiConfiguration();
  };

  const renderContent = () => {
    switch (view) {
      case 'settings':
        // 根据上一个视图状态决定是否是首次配置
        const isInitialSetup = previousView === 'configuring';
        return <SettingsPanel 
          onBack={() => setView(previousView)} // 返回上一个视图状态
          onSave={handleSettingsSave}
          isInitialSetup={isInitialSetup} 
        />;
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
            
            <PageAnalysis data={pageAnalysis} />
            
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
              <button onClick={openOptionsPage} title="设置" class="absolute top-0 right-0 text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path fill-rule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clip-rule="evenodd" />
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
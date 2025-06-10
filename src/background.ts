// Define interfaces for better type safety
interface Settings {
  apiKey?: string;
  apiBaseUrl?: string;
  modelName?: string;
}

interface SuccessResponse {
  status: 'success';
  category: string;
}

interface ErrorResponse {
  status: 'error';
  message: string;
}

type ApiResponse = SuccessResponse | ErrorResponse;

interface PageContent {
  url: string;
  title: string;
  metadata: {
    description: string;
    keywords: string[];
    author: string;
    ogTags: Record<string, string>;
    canonicalUrl: string;
  };
  headings: string[];
  paragraphs: string[];
  text: string;
  error?: string;
}

// 存储页面内容的缓存
let cachedPageContent: PageContent | null = null;

// Main message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getAiClassification') {
    getAiClassification(sendResponse);
    return true; // Async response
  }
  
  if (request.action === 'saveBookmark') {
    if (!request.title || !request.url || !request.categoryPath) {
      sendResponse({ status: 'error', message: 'Missing parameters for saving bookmark.' });
      return false;
    }
    saveBookmark(request.title, request.url, request.categoryPath, sendResponse);
    return true; // Async response
  }

  if (request.action === 'getBookmarkTree') {
    chrome.bookmarks.getTree((tree) => {
      sendResponse(tree);
    });
    return true; // Async response
  }
  
  // 处理内容提取脚本返回的数据
  if (request.action === 'contentExtracted' && request.content) {
    cachedPageContent = request.content;
    sendResponse({ status: 'success' });
    return false;
  }
});

async function getAiClassification(sendResponse: (response: any) => void) {
  try {
    const settings = await getSettings();
    if (!settings.apiKey || !settings.apiBaseUrl) {
      throw new Error('API Key or Base URL is not set. Please configure it in the options page.');
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.title || !tab.url) {
      throw new Error('Could not get active tab information.');
    }

    // 如果没有缓存的页面内容，执行内容提取脚本
    if (!cachedPageContent || cachedPageContent.url !== tab.url) {
      await extractPageContent(tab.id as number);
    }

    // Dynamically build categories from the user's bookmark tree.
    const bookmarkTree = await chrome.bookmarks.getTree();
    const categories = buildCategoryObjectFromTree(bookmarkTree);
    
    const categoryPath = await getClassificationFromLLM(tab.title, tab.url, categories, settings);

    // 准备页面分析摘要
    const pageAnalysis = {
      description: cachedPageContent?.metadata?.description || '',
      keywords: cachedPageContent?.metadata?.keywords || [],
      headings: cachedPageContent?.headings?.slice(0, 3) || [],
      paragraphs: cachedPageContent?.paragraphs?.slice(0, 2) || []
    };

    sendResponse({ 
      status: 'success', 
      categoryPath: categoryPath, 
      tab: { title: tab.title, url: tab.url },
      pageAnalysis // 在响应中包含页面分析数据
    });
  
  } catch (error) {
    console.error('Bookmark AI Organizer Error:', error);
    sendResponse({ status: 'error', message: (error as Error).message });
  }
}

/**
 * 执行内容提取脚本，获取页面内容
 */
async function extractPageContent(tabId: number): Promise<PageContent | null> {
  return new Promise((resolve) => {
    // 重置缓存的内容
    cachedPageContent = null;
    
    // 监听一次性消息，接收内容提取结果
    const listener = (message: any, sender: chrome.runtime.MessageSender) => {
      if (message.action === 'contentExtracted' && sender.tab?.id === tabId) {
        cachedPageContent = message.content;
        chrome.runtime.onMessage.removeListener(listener);
        resolve(message.content);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    
    // 注入内容提取脚本
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['contentScript.js']
    }).catch(error => {
      console.error('Error injecting content script:', error);
      resolve(null);
    });
    
    // 设置超时，防止无限等待
    setTimeout(() => {
      if (!cachedPageContent) {
        chrome.runtime.onMessage.removeListener(listener);
        resolve(null);
      }
    }, 5000);
  });
}

/**
 * Recursively builds a nested object from the bookmark tree, representing the folder structure.
 * This is used to provide the LLM with the user's existing classification schema.
 * @param nodes - The array of bookmark tree nodes from chrome.bookmarks.getTree().
 * @returns A nested object representing the folder structure.
 */
function buildCategoryObjectFromTree(nodes: chrome.bookmarks.BookmarkTreeNode[]): any {
  const categories = {};

  function traverse(node: chrome.bookmarks.BookmarkTreeNode, currentLevel: any) {
    // We are only interested in folders that have titles.
    if (!node.url && node.title) {
      // Create a new nested object for the current folder.
      currentLevel[node.title] = {};
      // If the folder has children, traverse them, passing the new nested object as the level.
      if (node.children) {
        node.children.forEach(child => traverse(child, currentLevel[node.title]));
      }
    }
  }

  // The getTree() API returns an array containing a single root node.
  // Its children are the top-level bookmark folders (e.g., 'Bookmarks Bar', 'Other Bookmarks').
  // We traverse these children to build our category object.
  if (nodes && nodes.length > 0 && nodes[0].children) {
    nodes[0].children.forEach(node => {
      // We only want to process actual folders that have a title.
      if (node.title) {
          traverse(node, categories);
      }
    });
  }

  return categories;
}

async function saveBookmark(title: string, url: string, categoryPath: string, sendResponse: (response: ApiResponse) => void) {
  try {
    const parentFolder = await findOrCreateBookmarkFolder(categoryPath);

    await chrome.bookmarks.create({
      parentId: parentFolder.id,
      title: title,
      url: url,
    });

    sendResponse({ status: 'success', category: categoryPath });

  } catch (error) {
    console.error('Bookmark AI Organizer Error:', error);
    sendResponse({ status: 'error', message: (error as Error).message });
  }
}

function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiKey', 'apiBaseUrl', 'modelName'], (items) => {
      resolve(items as Settings);
    });
  });
}

async function getClassificationFromLLM(title: string, url: string, categories: any, settings: Settings): Promise<string> {
  const prompt = buildPrompt(title, url, categories, cachedPageContent);

  const response = await fetch(`${settings.apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.modelName || 'gpt-4.1-mini', // Use stored model, with a fallback
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `Bookmark to classify: "${title}"` }
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API call failed with status ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const category = data.choices[0]?.message?.content?.trim();

  if (!category) {
    throw new Error('LLM did not return a valid category.');
  }
  return category;
}

function buildPrompt(title: string, url: string, categories: any, pageContent: PageContent | null): string {
    const categoryDescriptions = JSON.stringify(categories, null, 2);
    
    let contentSection = '';
    if (pageContent && !pageContent.error) {
      contentSection = `
Page Content Analysis:
Title: ${pageContent.title || title}
URL: ${pageContent.url || url}
Description: ${pageContent.metadata?.description || 'N/A'}
Keywords: ${pageContent.metadata?.keywords?.join(', ') || 'N/A'}

Key Headings:
${pageContent.headings?.slice(0, 5).map(h => `- ${h}`).join('\n') || 'N/A'}

Main Content Excerpts:
${pageContent.paragraphs?.slice(0, 3).map(p => `- ${p}`).join('\n') || 'N/A'}
`;
    }
    
    return `You are an expert bookmark organizer. Your task is to classify a new bookmark into ONE of the following categories based on its title and content. The categories are defined in a hierarchical JSON structure.

Your response MUST be the full path to the chosen category, like "Grandparent/Parent/Child". Do NOT add any other text, explanation, or markdown.

Available Categories:
${categoryDescriptions}

${contentSection}

Example:
If the user wants to classify "Spring Boot Official Documentation", a good response would be "技术/后端开发与框架".
If the user wants to classify "A Guide to Investment Banking", a good response would be "金融与商业/投资理财".

Now, classify the following bookmark based on the title and page content provided.
`;
}

async function findOrCreateBookmarkFolder(path: string): Promise<{ id: string }> {
  // Pre-process the path to remove redundant top-level folder names that users might see.
  let processedPath = path;
  if (processedPath.startsWith('书签栏/')) {
    processedPath = processedPath.substring('书签栏/'.length);
  } else if (processedPath.startsWith('Bookmarks Bar/')) {
    processedPath = processedPath.substring('Bookmarks Bar/'.length);
  }
  
  const pathParts = processedPath.split('/').filter(p => p.trim() !== '');
  let parentId = '1'; // Start search from the Bookmarks Bar.

  for (const part of pathParts) {
    const searchResults = await chrome.bookmarks.search({ title: part });
    
    // Find the folder that is a direct child of the current parentId
    const folder = searchResults.find(f => !f.url && f.parentId === parentId);
    
    if (folder) {
      parentId = folder.id;
    } else {
      const newFolder = await chrome.bookmarks.create({
        parentId: parentId,
        title: part,
      });
      parentId = newFolder.id;
    }
  }

  // The final parentId belongs to the target folder.
  return { id: parentId };
} 
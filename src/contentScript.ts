// 由于内容脚本无法直接导入模块，我们需要内联 Readability 的逻辑
// 这里只实现提取内容所需的基本功能

// 提取页面元数据
function extractMetadata() {
  // 基本元数据
  const title = document.title || '';
  
  // 描述
  const descriptionEl = document.querySelector('meta[name="description"]');
  const description = descriptionEl ? (descriptionEl as HTMLMetaElement).content : '';
  
  // 关键词
  const keywordsEl = document.querySelector('meta[name="keywords"]');
  const keywordsStr = keywordsEl ? (keywordsEl as HTMLMetaElement).content : '';
  const keywords = keywordsStr.split(',').map(k => k.trim()).filter(Boolean);
  
  // 作者
  const authorEl = document.querySelector('meta[name="author"]');
  const author = authorEl ? (authorEl as HTMLMetaElement).content : '';
  
  // Open Graph 标签
  const ogTags: Record<string, string> = {};
  document.querySelectorAll('meta[property^="og:"]').forEach((el) => {
    const property = (el as HTMLMetaElement).getAttribute('property');
    if (property) {
      ogTags[property.substring(3)] = (el as HTMLMetaElement).content;
    }
  });
  
  // 规范链接
  const canonicalEl = document.querySelector('link[rel="canonical"]');
  const canonicalUrl = canonicalEl ? (canonicalEl as HTMLLinkElement).href : '';
  
  return {
    title,
    description,
    keywords,
    author,
    ogTags,
    canonicalUrl
  };
}

// 获取页面文本内容
function getPageText() {
  // 简单版本：只获取页面的可见文本
  const bodyText = document.body.innerText || '';
  
  // 删除多余空白字符
  return bodyText.replace(/\s+/g, ' ').trim();
}

// 提取页面主要内容
function extractContent() {
  try {
    // 获取元数据
    const metadata = extractMetadata();
    
    // 获取页面文本内容
    const text = getPageText();
    
    // 获取所有标题元素的文本
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map(el => el.textContent?.trim())
      .filter(Boolean);
    
    // 获取所有段落元素的文本
    const paragraphs = Array.from(document.querySelectorAll('p'))
      .map(el => el.textContent?.trim())
      .filter(Boolean);
    
    return {
      url: window.location.href,
      title: document.title,
      metadata,
      headings,
      paragraphs: paragraphs.slice(0, 10), // 只取前10个段落，避免内容过多
      text: text.substring(0, 5000), // 只取前5000个字符
    };
  } catch (error) {
    console.error('Error extracting content from page:', error);
    return {
      url: window.location.href,
      title: document.title,
      error: 'Failed to extract content'
    };
  }
}

// 执行内容提取并发送回后台脚本
function main() {
  const content = extractContent();
  chrome.runtime.sendMessage({ action: 'contentExtracted', content });
}

// 执行主函数
main(); 
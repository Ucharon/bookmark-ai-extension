import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

interface PageMetadata {
  title: string;
  description: string;
  keywords: string[];
  author: string;
  ogTags: Record<string, string>;
  canonicalUrl: string;
}

interface PageContent {
  title: string;
  excerpt: string;
  content: string;
  textContent: string;
  length: number;
  metadata: PageMetadata;
}

/**
 * 提取页面元数据
 */
function extractMetadata(document: Document): PageMetadata {
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

/**
 * 从页面HTML中提取主要内容和元数据
 */
export function extractContent(html: string, url: string): PageContent | null {
  try {
    // 创建虚拟DOM
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;
    
    // 提取元数据
    const metadata = extractMetadata(document);
    
    // 使用Readability提取主要内容
    const reader = new Readability(document);
    const article = reader.parse();
    
    if (!article) {
      return null;
    }
    
    return {
      title: article.title || '',
      excerpt: article.excerpt || '',
      content: article.content || '',
      textContent: article.textContent || '',
      length: article.length || 0,
      metadata
    };
  } catch (error) {
    console.error('Error extracting content:', error);
    return null;
  }
}

/**
 * 直接在浏览器环境中提取页面内容（用于注入脚本）
 */
export function extractContentFromPage(): PageContent | null {
  try {
    // 在浏览器环境中，直接使用document对象
    const documentClone = document.cloneNode(true) as Document;
    const metadata = extractMetadata(document);
    
    // 使用Readability提取主要内容
    const reader = new Readability(documentClone);
    const article = reader.parse();
    
    if (!article) {
      return null;
    }
    
    return {
      title: article.title || '',
      excerpt: article.excerpt || '',
      content: article.content || '',
      textContent: article.textContent || '',
      length: article.length || 0,
      metadata
    };
  } catch (error) {
    console.error('Error extracting content from page:', error);
    return null;
  }
}

/**
 * 生成内容摘要（限制最大字符数）
 */
export function generateSummary(content: PageContent | null, maxLength: number = 1000): string {
  if (!content) return '';
  
  let summary = '';
  
  // 添加标题
  summary += `标题: ${content.title}\n\n`;
  
  // 添加元数据摘要
  if (content.metadata.description) {
    summary += `描述: ${content.metadata.description}\n\n`;
  }
  
  if (content.metadata.keywords.length > 0) {
    summary += `关键词: ${content.metadata.keywords.join(', ')}\n\n`;
  }
  
  // 添加内容摘要
  if (content.excerpt) {
    summary += `摘要: ${content.excerpt}\n\n`;
  }
  
  // 添加正文内容（裁剪至最大长度）
  const contentText = content.textContent || '';
  if (contentText) {
    const remainingLength = maxLength - summary.length;
    if (remainingLength > 0) {
      summary += `内容: ${contentText.substring(0, remainingLength)}${contentText.length > remainingLength ? '...' : ''}`;
    }
  }
  
  return summary;
} 
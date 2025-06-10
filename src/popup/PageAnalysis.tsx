import { h } from 'preact';
import { useState } from 'preact/hooks';

interface PageAnalysisProps {
  data: {
    description: string;
    keywords: string[];
    headings: string[];
    paragraphs: string[];
  };
}

export function PageAnalysis({ data }: PageAnalysisProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 如果没有有效的分析数据，不显示组件
  const hasData = 
    data.description || 
    (data.keywords && data.keywords.length > 0) || 
    (data.headings && data.headings.length > 0) || 
    (data.paragraphs && data.paragraphs.length > 0);

  if (!hasData) return null;

  return (
    <div class="mt-3 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
      <button 
        onClick={() => setIsExpanded(!isExpanded)} 
        class="w-full flex justify-between items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 transition"
      >
        <span class="text-sm font-medium text-gray-700">页面内容分析</span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          class={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
      
      {isExpanded && (
        <div class="px-3 py-2 text-sm">
          {data.description && (
            <div class="mb-2">
              <div class="font-medium text-gray-700">描述</div>
              <p class="text-gray-600 text-xs mt-1">{data.description}</p>
            </div>
          )}
          
          {data.keywords && data.keywords.length > 0 && (
            <div class="mb-2">
              <div class="font-medium text-gray-700">关键词</div>
              <div class="flex flex-wrap gap-1 mt-1">
                {data.keywords.map(keyword => (
                  <span class="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{keyword}</span>
                ))}
              </div>
            </div>
          )}
          
          {data.headings && data.headings.length > 0 && (
            <div class="mb-2">
              <div class="font-medium text-gray-700">主要标题</div>
              <ul class="text-xs text-gray-600 mt-1 pl-4 list-disc">
                {data.headings.map(heading => (
                  <li class="mb-0.5">{heading}</li>
                ))}
              </ul>
            </div>
          )}
          
          {data.paragraphs && data.paragraphs.length > 0 && (
            <div>
              <div class="font-medium text-gray-700">主要内容</div>
              <div class="text-xs text-gray-600 mt-1 max-h-20 overflow-y-auto pr-1">
                {data.paragraphs.map(paragraph => (
                  <p class="mb-1">{paragraph}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
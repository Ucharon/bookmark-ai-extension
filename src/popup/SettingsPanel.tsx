import { useState, useEffect } from 'preact/hooks';

interface SettingsPanelProps {
  onBack: () => void;
  onSave?: () => void;
  isInitialSetup?: boolean;
}

export function SettingsPanel({ onBack, onSave, isInitialSetup = false }: SettingsPanelProps) {
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('');
  const [status, setStatus] = useState('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);

  useEffect(() => {
    chrome.storage.sync.get({
      apiBaseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      modelName: 'gpt-4.1-mini'
    }, (items) => {
      setApiBaseUrl(items.apiBaseUrl);
      setApiKey(items.apiKey);
      setModelName(items.modelName);
    });
  }, []);

  const handleSave = () => {
    setStatus('');
    if (!apiKey || !apiBaseUrl || !modelName) {
      setStatus('所有字段均为必填项！');
      return;
    }
    chrome.storage.sync.set({
      apiBaseUrl: apiBaseUrl,
      apiKey: apiKey,
      modelName: modelName
    }, () => {
      setStatus('设置已成功保存！');
      
      if (onSave) {
        setTimeout(onSave, 1000);
      } else {
        setTimeout(() => setStatus(''), 3000);
      }
    });
  };

  const handleBackClick = () => {
    if (isInitialSetup && (!apiKey || !apiBaseUrl || !modelName)) {
      setStatus('请完成必要的API配置后再返回！');
      setTimeout(() => setStatus(''), 3000);
      return;
    }
    
    onBack();
  };

  return (
    <div class="p-4 space-y-6">
      <div class="flex items-center">
        <button onClick={handleBackClick} class="p-1.5 rounded-full hover:bg-gray-200 mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" d="M11.03 3.97a.75.75 0 010 1.06l-6.22 6.22H21a.75.75 0 010 1.5H4.81l6.22 6.22a.75.75 0 11-1.06 1.06l-7.5-7.5a.75.75 0 010-1.06l7.5-7.5a.75.75 0 011.06 0z" clip-rule="evenodd" />
          </svg>
        </button>
        <h1 class="text-xl font-bold text-gray-900 flex-1 text-center">设置</h1>
      </div>
      
      <div class="space-y-4">
        <div>
          <label for="api-base-url" class="block text-sm font-medium text-gray-700 mb-1">API 地址 (Base URL)</label>
          <input
            id="api-base-url"
            type="text"
            value={apiBaseUrl}
            onInput={(e) => setApiBaseUrl((e.target as HTMLInputElement).value)}
            class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="例如: https://api.openai.com/v1"
          />
        </div>
        <div>
          <label for="model-name" class="block text-sm font-medium text-gray-700 mb-1">模型名称 (Model Name)</label>
          <input
            id="model-name"
            type="text"
            value={modelName}
            onInput={(e) => setModelName((e.target as HTMLInputElement).value)}
            class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="例如: gpt-4"
          />
        </div>
        <div>
          <label for="api-key" class="block text-sm font-medium text-gray-700 mb-1">API 密钥 (API Key)</label>
          <div class="relative">
            <input
              id="api-key"
              type={isKeyVisible ? 'text' : 'password'}
              value={apiKey}
              onInput={(e) => setApiKey((e.target as HTMLInputElement).value)}
              class="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="请输入您的 API Key"
            />
            <button onClick={() => setIsKeyVisible(!isKeyVisible)} class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-600">
              {isKeyVisible ? (
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              ) : (
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <button 
        onClick={handleSave}
        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-md font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
      >
        保存设置
      </button>

      {status && (
        <div class={`text-center text-sm transition-opacity ${status.includes('成功') ? 'text-green-600' : 'text-red-600'}`}>
          {status}
        </div>
      )}
    </div>
  );
} 
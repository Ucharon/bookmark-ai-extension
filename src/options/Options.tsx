import { useState, useEffect } from 'preact/hooks';

export function Options() {
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
      setTimeout(() => setStatus(''), 3000);
    });
  };

  return (
    <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div class="w-full max-w-xl p-8 space-y-8 bg-white shadow-2xl rounded-2xl">
        <div class="text-center">
            <h1 class="text-4xl font-bold text-gray-900">设置</h1>
            <p class="mt-2 text-md text-gray-600">配置您的 AI 服务提供商</p>
        </div>

        <div class="space-y-6">
            <div>
                <label for="api-base-url" class="block text-sm font-medium text-gray-700 mb-1">API 地址 (Base URL)</label>
                <input
                    id="api-base-url"
                    type="text"
                    value={apiBaseUrl}
                    onInput={(e) => setApiBaseUrl((e.target as HTMLInputElement).value)}
                    class="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
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
                    class="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
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
                        class="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder="请输入您的 API Key"
                    />
                    <button onClick={() => setIsKeyVisible(!isKeyVisible)} class="absolute inset-y-0 right-0 flex items-center px-4 text-gray-600">
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
          class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-md font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-105"
        >
          保存设置
        </button>

        {status && (
            <div class={`mt-4 text-center text-sm transition-opacity ${status.includes('成功') ? 'text-green-600' : 'text-red-600'}`}>
                {status}
            </div>
        )}
      </div>
    </div>
  );
} 
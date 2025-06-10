import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';

interface Option {
  id: string;
  path: string;
}

interface DropdownProps {
  options: Option[];
  value: string;
  onChange: (newValue: string) => void;
  suggestedPath: string; 
}

export function Dropdown({ options, value, onChange, suggestedPath }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Check if the AI's suggestion is a new path that doesn't exist in the current bookmarks
    const isSuggestionNew = !options.some(opt => opt.path === suggestedPath);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [ref]);

    const handleSelect = (path: string) => {
        onChange(path);
        setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    return (
        <div class="relative" ref={ref} onKeyDown={handleKeyDown}>
            <button
                type="button"
                class="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span class="block truncate">{value}</span>
                <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M10 3a.75.75 0 01.53.22l3.5 3.5a.75.75 0 01-1.06 1.06L10 4.81 6.53 8.28a.75.75 0 01-1.06-1.06l3.5-3.5A.75.75 0 0110 3zm-3.72 9.28a.75.75 0 011.06 0L10 15.19l2.66-2.67a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0l-3.25-3.25a.75.75 0 010-1.06z" clip-rule="evenodd" />
                    </svg>
                </span>
            </button>
            {isOpen && (
                <ul class="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm" role="listbox">
                    {isSuggestionNew && (
                        <li class="relative cursor-default select-none py-2 pl-3 pr-9 text-indigo-600 hover:bg-indigo-50" onClick={() => handleSelect(suggestedPath)}>
                            <span class="block truncate font-semibold">{suggestedPath} (新分类)</span>
                        </li>
                    )}
                    {options.map((option) => (
                        <li key={option.id} class="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-indigo-50" role="option" onClick={() => handleSelect(option.path)}>
                           <span class={`block truncate ${value === option.path ? 'font-semibold' : 'font-normal'}`}>{option.path}</span>
                            {value === option.path && (
                                <span class="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600">
                                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clip-rule="evenodd" />
                                    </svg>
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
} 
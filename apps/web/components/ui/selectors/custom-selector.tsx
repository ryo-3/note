import React, { useState, useEffect, useRef, useId, useContext, useCallback } from 'react';
import ChevronDownIcon from "@/components/icons/chevron-down-icon";
import PlusIcon from "@/components/icons/plus-icon";
import CheckIcon from "@/components/icons/check-icon";
import { SelectorContext } from "@/src/contexts/selector-context";
import { FORM_STYLES } from "@/src/styles/form-styles";

interface SelectorOption {
  value: string;
  label: string;
  color?: string;
}

interface CustomSelectorProps {
  label: string;
  options: SelectorOption[];
  value: string;
  onChange: (value: string) => void;
  fullWidth?: boolean;
  width?: string;
  allowCreate?: boolean;
  onCreateNew?: (newValue: string) => void;
}

function CustomSelector({
  label,
  options,
  value,
  onChange,
  fullWidth = false,
  width = "82px",
  allowCreate = false,
  onCreateNew
}: CustomSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const selectorRef = useRef<HTMLDivElement>(null);
  const selectorId = useId();
  
  // セレクターコンテキストの安全な使用
  const selectorContext = useContext(SelectorContext);
  const activeSelector = selectorContext?.activeSelector;
  const setActiveSelector = useCallback((id: string | null) => {
    if (selectorContext?.setActiveSelector) {
      selectorContext.setActiveSelector(id);
    }
  }, [selectorContext]);
  
  const selectedOption = options.find(opt => opt.value === value);

  // 他のセレクターが開いたら閉じる
  useEffect(() => {
    if (activeSelector && activeSelector !== selectorId) {
      setIsOpen(false);
      setIsCreating(false);
      setNewCategoryName("");
    }
  }, [activeSelector, selectorId]);

  // 外部クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setNewCategoryName("");
        setActiveSelector(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, setActiveSelector]);
  
  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setActiveSelector(null);
  };

  const handleCreateNew = () => {
    if (newCategoryName.trim() && onCreateNew) {
      onCreateNew(newCategoryName.trim());
      setNewCategoryName("");
      setIsCreating(false);
      setIsOpen(false);
    }
  };

  const handleCancelCreate = () => {
    setNewCategoryName("");
    setIsCreating(false);
  };

  return (
    <div className="relative" ref={selectorRef}>
      <div className="flex items-center justify-between">
        <label className={FORM_STYLES.label}>
          {label}
        </label>
      </div>
      <div className="relative">
        <div
          className={`${FORM_STYLES.selector} ${
            isOpen ? "rounded-t-lg" : "rounded-lg"
          } ${fullWidth ? "w-full" : ""}`}
          style={fullWidth ? {} : { width }}
          onClick={() => {
            const newOpenState = !isOpen;
            setIsOpen(newOpenState);
            setActiveSelector(newOpenState ? selectorId : null);
          }}
          title="クリックして変更"
        >
          <div className={FORM_STYLES.selectorText}>
            {selectedOption?.color && (
              <div className={`w-3 h-3 rounded-full ${selectedOption.color}`}></div>
            )}
            {selectedOption?.label}
          </div>
          <ChevronDownIcon 
            className={`${FORM_STYLES.chevron} ${isOpen ? "rotate-180" : ""}`}
          />
        </div>

        {isOpen && (
          <div
            className={`absolute top-full left-0 z-10 bg-white rounded-lg shadow-lg border border-gray-400 border-t-0 rounded-t-none ${
              fullWidth ? "w-full" : "w-full"
            }`}
          >
            <div className=" space-y-1">
              {allowCreate && (
                <div className="border-b border-gray-200 pb-1 mb-1">
                  {isCreating ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="カテゴリー名"
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCreateNew();
                          } else if (e.key === "Escape") {
                            handleCancelCreate();
                          }
                        }}
                        autoFocus
                      />
                      <button
                        onClick={handleCreateNew}
                        className="px-2 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 flex-shrink-0"
                        title="追加"
                      >
                        <CheckIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="w-full px-3 py-2 text-sm transition-all text-left flex items-center justify-between rounded-md hover:bg-gray-50 text-blue-600"
                      onClick={() => setIsCreating(true)}
                    >
                      <span>新規カテゴリー</span>
                      <PlusIcon className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
              
              {options.map((option) => (
                <div key={option.value}>
                  <button
                    className={`w-full px-3 py-2 text-sm transition-all text-left flex items-center gap-2 rounded-md ${
                      option.value === value 
                        ? `bg-gray-100` 
                        : `hover:bg-gray-50`
                    }`}
                    onClick={() => handleSelect(option.value)}
                  >
                    {option.color && (
                      <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
                    )}
                    {option.label}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
}

export default CustomSelector;
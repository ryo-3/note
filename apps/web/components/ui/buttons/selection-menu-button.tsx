import React, { useRef, useState } from 'react';
import { ButtonContainer } from "@/components/ui/layout/button-container";
import SelectionMenu from "@/components/ui/menus/selection-menu";
import DashboardIcon from "@/components/icons/dashboard-icon";
import CsvExportIcon from "@/components/icons/csv-export-icon";
import PinIcon from "@/components/icons/pin-icon";
import TagIcon from "@/components/icons/tag-icon";

interface SelectionMenuButtonProps {
  count: number;
  onMenuClick?: () => void;
  isVisible: boolean;
  onBoardLink?: () => void;
  onExport?: () => void;
  onTagging?: () => void;
  onPin?: () => void;
  onTabMove?: () => void;
}

/**
 * 選択したアイテム数を表示し、メニューを開くボタン
 * 通常タブでアイテムが選択された時に左下に表示される
 */
export default function SelectionMenuButton({
  count,
  onMenuClick,
  isVisible,
  onBoardLink,
  onExport,
  onTagging,
  onPin,
  onTabMove
}: SelectionMenuButtonProps) {
  const buttonRef = useRef<HTMLElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    {
      id: 'pin',
      label: 'ピン止め',
      icon: <PinIcon className="w-4 h-4" />,
      onClick: () => onPin?.()
    },
    {
      id: 'board-link',
      label: 'ボードに追加',
      icon: <DashboardIcon className="w-4 h-4" />,
      onClick: () => onBoardLink?.()
    },
    {
      id: 'tag',
      label: 'タグを付ける',
      icon: <TagIcon className="w-5 h-5" />,
      onClick: () => onTagging?.()
    },
    {
      id: 'export',
      label: 'エクスポート',
      icon: <CsvExportIcon className="w-4 h-4" />,
      onClick: () => onExport?.()
    },
    {
      id: 'tab-move',
      label: 'タブ移動',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      onClick: () => onTabMove?.()
    }
  ];

  const handleButtonClick = () => {
    setIsMenuOpen(!isMenuOpen);
    onMenuClick?.();
  };

  return (
    <ButtonContainer show={isVisible} position="bottom-left">
      <div ref={buttonRef as React.RefObject<HTMLDivElement>} className="relative">
        <button
          onClick={handleButtonClick}
          className="bg-gray-400 hover:bg-gray-500 text-white p-2 rounded-full shadow-lg transition-colors flex items-center justify-center"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
            />
          </svg>
        </button>
        {/* バッジ */}
        <div className="absolute -top-2 -right-2 bg-Green text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md">
          {count}
        </div>
        
        {/* メニュー */}
        <SelectionMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          items={menuItems}
          anchorRef={buttonRef}
        />
      </div>
    </ButtonContainer>
  );
}
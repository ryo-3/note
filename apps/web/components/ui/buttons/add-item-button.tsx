'use client'

import CreateButton from '@/components/ui/buttons/create-button'

type ItemType = 'memo' | 'task' | 'board'

interface AddItemButtonProps {
  itemType: ItemType
  onClick: () => void
  position?: 'right' | 'top' | 'bottom'
  className?: string
  disabled?: boolean
  size?: 'small' | 'normal'
  showTooltip?: boolean
  customSize?: {
    padding?: string;
    iconSize?: string;
  }
}

function AddItemButton({
  itemType,
  onClick,
  position = 'right',
  className = '',
  disabled = false,
  size = 'normal',
  showTooltip = true,
  customSize
}: AddItemButtonProps) {
  const typeConfig = {
    memo: {
      label: '新規メモ作成',
      color: 'green' as const,
    },
    task: {
      label: '新規タスク作成',
      color: 'yellow' as const,
    },
    board: {
      label: '新規ボード作成',
      color: 'blue' as const,
    }
  }

  const config = typeConfig[itemType]

  return (
    <CreateButton
      onClick={onClick}
      color={config.color}
      label={config.label}
      position={position}
      className={className}
      disabled={disabled}
      size={size}
      showTooltip={showTooltip}
      customSize={customSize}
    />
  )
}

export default AddItemButton
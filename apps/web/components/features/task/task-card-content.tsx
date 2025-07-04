import { formatDateOnly } from '@/src/utils/formatDate'
import { getStatusColor, getPriorityColor, getStatusText, getPriorityText } from '@/src/utils/taskUtils'
import type { Task, DeletedTask } from '@/src/types/task'

interface TaskCardContentProps {
  task: Task | DeletedTask
  variant?: 'normal' | 'deleted'
  showEditDate?: boolean
}

function TaskCardContent({ task, variant = 'normal', showEditDate = false }: TaskCardContentProps) {
  const isDeleted = variant === 'deleted'
  const deletedTask = task as DeletedTask


  return (
    <>
      <div className={`font-semibold text-base mb-2 line-clamp-2 leading-tight ${
        isDeleted ? 'text-gray-700' : 'text-gray-800'
      }`}>
        {task.title}
      </div>
      
      {/* ステータスと優先度 */}
      <div className="flex gap-1 mb-2">
        <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(task.status)}`}>
          {getStatusText(task.status)}
        </span>
        <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(task.priority)}`}>
          {getPriorityText(task.priority)}
        </span>
      </div>

      {/* 期限表示 */}
      {task.dueDate && !isDeleted && (
        <div className="text-xs text-gray-500 mb-2">
          期限: {formatDateOnly(task.dueDate)}
        </div>
      )}
      
      <div className="text-sm text-gray-600 flex-1 overflow-hidden mb-2">
        <div className="line-clamp-1">
          {task.description || '説明なし'}
        </div>
      </div>
      
      <div className={`text-xs mt-2 pt-2 ${
        isDeleted 
          ? 'text-red-400 border-t border-red-200' 
          : 'text-gray-400 border-t border-gray-100'
      }`}>
        {isDeleted ? (
          <div>削除: {formatDateOnly(deletedTask.deletedAt)}</div>
        ) : showEditDate ? (
          <div className="flex gap-2">
            <div>作成: {formatDateOnly(task.createdAt)}</div>
            {task.updatedAt && task.updatedAt !== task.createdAt && (
              <div>更新: {formatDateOnly(task.updatedAt)}</div>
            )}
          </div>
        ) : (
          <div>
            {task.updatedAt && task.updatedAt !== task.createdAt
              ? formatDateOnly(task.updatedAt)
              : formatDateOnly(task.createdAt)
            }
          </div>
        )}
      </div>
    </>
  )
}

export default TaskCardContent
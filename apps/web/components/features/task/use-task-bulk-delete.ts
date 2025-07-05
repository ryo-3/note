import { useEffect } from 'react'
import { useDeleteTask, usePermanentDeleteTask } from '@/src/hooks/use-tasks'
import { useBulkDelete } from '@/components/ui/modals'
import { animateMultipleItemsToTrashWithRect } from '@/src/utils/deleteAnimation'
import type { Task, DeletedTask } from '@/src/types/task'

interface UseTasksBulkDeleteProps {
  activeTab: 'todo' | 'in_progress' | 'completed' | 'deleted'
  checkedTasks: Set<number>
  checkedDeletedTasks: Set<number>
  setCheckedTasks: (tasks: Set<number>) => void
  setCheckedDeletedTasks: (tasks: Set<number>) => void
  tasks?: Task[]
  deletedTasks?: DeletedTask[]
  onTaskDelete?: (id: number) => void
  onDeletedTaskDelete?: (id: number) => void
  deleteButtonRef?: React.RefObject<HTMLButtonElement | null>
  setIsDeleting?: (isDeleting: boolean) => void
  setIsLidOpen?: (isOpen: boolean) => void
  viewMode?: 'list' | 'card'
}

export function useTasksBulkDelete({
  activeTab,
  checkedTasks,
  checkedDeletedTasks,
  setCheckedTasks,
  setCheckedDeletedTasks,
  tasks,
  deletedTasks,
  onTaskDelete,
  onDeletedTaskDelete,
  deleteButtonRef,
  setIsDeleting,
  setIsLidOpen,
  viewMode = 'list'
}: UseTasksBulkDeleteProps) {
  const deleteTaskMutation = useDeleteTask()
  const permanentDeleteTaskMutation = usePermanentDeleteTask()
  const bulkDelete = useBulkDelete()

  // チェック状態のクリーンアップ - 削除されたタスクのチェックを解除
  useEffect(() => {
    if (tasks) {
      const allTaskIds = new Set(tasks.map(t => t.id))
      const newCheckedTasks = new Set(Array.from(checkedTasks).filter(id => allTaskIds.has(id)))
      if (newCheckedTasks.size !== checkedTasks.size) {
        setCheckedTasks(newCheckedTasks)
      }
    }
  }, [tasks, checkedTasks, setCheckedTasks])

  // 削除中フラグを外部で管理
  const isCurrentlyDeleting = deleteTaskMutation.isPending || permanentDeleteTaskMutation.isPending
  
  useEffect(() => {
    // 削除中は自動クリーンアップを無効にする
    if (deletedTasks && !isCurrentlyDeleting) {
      const deletedTaskIds = new Set(deletedTasks.map(t => t.id))
      const newCheckedDeletedTasks = new Set(Array.from(checkedDeletedTasks).filter(id => deletedTaskIds.has(id)))
      if (newCheckedDeletedTasks.size !== checkedDeletedTasks.size) {
        setCheckedDeletedTasks(newCheckedDeletedTasks)
      }
    }
  }, [deletedTasks, checkedDeletedTasks, setCheckedDeletedTasks, isCurrentlyDeleting])

  // 削除処理の共通コールバック
  const createDeleteCallback = (buttonRect: DOMRect | undefined) => async (ids: number[]) => {
    console.log('🎯 共通削除コールバック開始:', { ids, buttonRect, viewMode });
    
    // ゴミ箱アニメーション実行（通常削除と削除済みの完全削除の両方）
    if (buttonRect) {
      console.log('🎯 アニメーション開始:', { ids, buttonRect, viewMode });
      // 保存された位置情報を使用
      animateMultipleItemsToTrashWithRect(ids, buttonRect, async () => {
        console.log('🎬 アニメーション完了:', { ids: ids.length });
        
        // アニメーション完了後にAPI処理
        console.log('🌐 API開始:', { ids: ids.length, activeTab });
        for (const id of ids) {
          try {
            if (activeTab === "deleted") {
              await permanentDeleteTaskMutation.mutateAsync(id)
            } else {
              await deleteTaskMutation.mutateAsync(id)
            }
          } catch (error) {
            console.error(`タスク削除エラー (ID: ${id}):`, error)
          }
        }
        console.log('🌐 API完了:', { ids: ids.length });
        
        // API完了後にState更新（これでリストから削除）
        console.log('🔄 State更新開始:', { ids: ids.length });
        for (const id of ids) {
          if (activeTab === "deleted") {
            onDeletedTaskDelete?.(id)
          } else {
            onTaskDelete?.(id)
          }
        }
        console.log('🔄 State更新完了:', { ids: ids.length });
        
        // 500ms後に蓋を閉じる
        setTimeout(() => {
          setIsLidOpen?.(false)
          
          // 蓋が閉じた後にチェック状態をクリア
          if (activeTab === "deleted") {
            setCheckedDeletedTasks(new Set())
          } else {
            setCheckedTasks(new Set())
          }
        }, 500)
        
        // 3秒後に削除ボタンを非表示
        setTimeout(() => {
          setIsDeleting?.(false)
        }, 3000)
      }, 100, viewMode)
    } else {
      // アニメーションなしの場合は即座にState更新
      for (const id of ids) {
        if (activeTab === "deleted") {
          onDeletedTaskDelete?.(id)
        } else {
          onTaskDelete?.(id)
        }
      }
      // 選択状態をクリア (UI即座更新)
      if (activeTab === "deleted") {
        setCheckedDeletedTasks(new Set())
      } else {
        setCheckedTasks(new Set())
      }
    }

    // アニメーションなしの場合のみAPI処理を遅延実行
    if (!buttonRect) {
      setTimeout(async () => {
        for (const id of ids) {
          try {
            if (activeTab === "deleted") {
              await permanentDeleteTaskMutation.mutateAsync(id)
            } else {
              await deleteTaskMutation.mutateAsync(id)
            }
          } catch (error) {
            console.error(`タスク削除エラー (ID: ${id}):`, error)
          }
        }
      }, 100)
    }
  }

  const handleBulkDelete = async () => {
    console.log('🎯 handleBulkDelete開始', { activeTab, checkedTasks: checkedTasks.size, checkedDeletedTasks: checkedDeletedTasks.size });
    
    const targetIds = activeTab === "deleted" 
      ? Array.from(checkedDeletedTasks)
      : Array.from(checkedTasks)

    console.log('🎯 対象アイテム:', { targetIds, activeTab });

    // タスクの場合は1件からモーダル表示（削除済み・通常問わず）
    const threshold = 1

    // 削除ボタンの位置を事前に保存
    const buttonRect = deleteButtonRef?.current?.getBoundingClientRect();
    console.log('🎯 ボタン位置:', { buttonRect, deleteButtonRef: deleteButtonRef?.current });
    
    // 削除ボタンを押した瞬間に蓋を開く（メモの通常時と同じ動作）
    setIsDeleting?.(true)
    setIsLidOpen?.(true)
    
    await bulkDelete.confirmBulkDelete(targetIds, threshold, createDeleteCallback(buttonRect))
  }

  return {
    handleBulkDelete,
    bulkDeleteState: {
      isModalOpen: bulkDelete.isModalOpen,
      targetIds: bulkDelete.targetIds,
      isDeleting: bulkDelete.isDeleting,
      handleCancel: () => {
        // キャンセル時に蓋を閉じる
        setIsDeleting?.(false)
        setTimeout(() => {
          setIsLidOpen?.(false)
        }, 300)
        bulkDelete.handleCancel()
      },
      handleConfirm: () => {
        // モーダルでの確認後はuseBulkDeleteが自動的に元のコールバックを呼ぶ
        bulkDelete.handleConfirm(createDeleteCallback(deleteButtonRef?.current?.getBoundingClientRect()))
      }
    }
  }
}
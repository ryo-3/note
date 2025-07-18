"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ArrowLeftIcon from "@/components/icons/arrow-left-icon";
import { useToggleBoardCompletion, useDeleteBoard, useUpdateBoard } from "@/src/hooks/use-boards";

interface BoardSettingsProps {
  boardId: number;
  boardSlug: string;
  initialBoardName: string;
  initialBoardDescription?: string | null;
  initialBoardCompleted: boolean;
}

export default function BoardSettings({
  boardId,
  boardSlug,
  initialBoardName,
  initialBoardDescription,
  initialBoardCompleted
}: BoardSettingsProps) {
  const router = useRouter();
  const toggleCompletion = useToggleBoardCompletion();
  const deleteBoard = useDeleteBoard();
  const updateBoard = useUpdateBoard();

  const [editName, setEditName] = useState(initialBoardName);
  const [editDescription, setEditDescription] = useState(initialBoardDescription || "");
  const [hasChanges, setHasChanges] = useState(false);

  const handleNameChange = (value: string) => {
    setEditName(value);
    setHasChanges(value !== initialBoardName || editDescription !== (initialBoardDescription || ""));
  };

  const handleDescriptionChange = (value: string) => {
    setEditDescription(value);
    setHasChanges(editName !== initialBoardName || value !== (initialBoardDescription || ""));
  };

  const handleSave = async () => {
    try {
      await updateBoard.mutateAsync({
        id: boardId,
        data: {
          name: editName,
          description: editDescription || undefined,
        },
      });
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to update board:", error);
      // TODO: エラーハンドリング（トースト通知など）
    }
  };

  const handleToggleCompletion = async () => {
    try {
      await toggleCompletion.mutateAsync(boardId);
    } catch (error) {
      console.error("Failed to toggle board completion:", error);
    }
  };

  const handleDelete = async () => {
    if (confirm("このボードを削除しますか？")) {
      try {
        await deleteBoard.mutateAsync(boardId);
        router.push("/boards"); // 削除後はボード一覧に戻る
      } catch (error) {
        console.error("Failed to delete board:", error);
      }
    }
  };

  const handleBack = () => {
    router.push(`/boards/${boardSlug}`);
  };

  return (
    <div className="max-w-4xl">
      {/* ヘッダー */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">ボード設定</h1>
      </div>

      <div className="space-y-6">
        {/* 基本情報 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">基本情報</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ボード名
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ボード名を入力"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                説明
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="ボードの説明を入力"
              />
            </div>

            {hasChanges && (
              <div className="lg:col-span-2 flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={updateBoard.isPending}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  {updateBoard.isPending ? "保存中..." : "保存"}
                </button>
                <button
                  onClick={() => {
                    setEditName(initialBoardName);
                    setEditDescription(initialBoardDescription || "");
                    setHasChanges(false);
                  }}
                  disabled={updateBoard.isPending}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  キャンセル
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 状態管理 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">状態管理</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 mb-1">完了状態</p>
                <p className="text-sm text-gray-500">
                  {initialBoardCompleted ? "このボードは完了済みです" : "このボードは未完了です"}
                </p>
              </div>
              <button
                onClick={handleToggleCompletion}
                disabled={toggleCompletion.isPending}
                className={`px-6 py-3 rounded-lg transition-colors font-medium ${
                  initialBoardCompleted 
                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-700'
                    : 'bg-green-100 hover:bg-green-200 text-green-600 hover:text-green-700'
                }`}
              >
                {toggleCompletion.isPending ? "処理中..." : initialBoardCompleted ? "未完了に戻す" : "完了にする"}
              </button>
            </div>
          </div>
        </div>

        {/* 危険ゾーン */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-600 mb-6">危険ゾーン</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200">
              <div>
                <p className="font-medium text-red-900 mb-1">ボードを削除</p>
                <p className="text-sm text-red-600">
                  この操作は元に戻せません。ボード内のメモとタスクの関連付けが削除されます。
                </p>
              </div>
              <button
                onClick={handleDelete}
                disabled={deleteBoard.isPending}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
              >
                {deleteBoard.isPending ? "削除中..." : "削除"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
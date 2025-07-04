"use client";

import { useState } from "react";
import { useGlobalSearch } from "@/src/hooks/use-global-search";
import SearchIcon from "@/components/icons/search-icon";
import type { Memo, DeletedMemo } from '@/src/types/memo';
import type { Task, DeletedTask } from '@/src/types/task';

interface SearchResult {
  type: 'memo' | 'task' | 'deleted-memo' | 'deleted-task';
  item: Memo | Task | DeletedMemo | DeletedTask;
  matchedField: 'title' | 'content';
  snippet: string;
}

interface SearchScreenProps {
  onSelectMemo?: (memo: Memo) => void;
  onSelectTask?: (task: Task) => void;
  onSelectDeletedMemo?: (memo: DeletedMemo) => void;
  onSelectDeletedTask?: (task: DeletedTask) => void;
}

function SearchScreen({
  onSelectMemo,
  onSelectTask,
  onSelectDeletedMemo,
  onSelectDeletedTask
}: SearchScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<"all" | "title" | "content">("all");
  const [searchType, setSearchType] = useState<"all" | "memo" | "task" | "deleted">("all");
  const [sortBy, setSortBy] = useState<"relevance" | "date" | "title">("relevance");
  
  // 検索実行
  const { results, isSearching, hasQuery } = useGlobalSearch({
    query: searchQuery,
    searchScope,
    searchType,
    debounceMs: 500 // 詳細検索では少し長めのデバウンス
  });

  // ソート処理
  const sortedResults = [...results].sort((a, b) => {
    switch (sortBy) {
      case "date":
        return b.item.createdAt - a.item.createdAt;
      case "title":
        return a.item.title.localeCompare(b.item.title, 'ja');
      case "relevance":
      default:
        // タイトルマッチを優先、その後は日付順
        if (a.matchedField === 'title' && b.matchedField === 'content') return -1;
        if (a.matchedField === 'content' && b.matchedField === 'title') return 1;
        return b.item.createdAt - a.item.createdAt;
    }
  });

  // 検索結果選択ハンドラー
  const handleSelectSearchResult = (result: SearchResult) => {
    switch (result.type) {
      case 'memo':
        onSelectMemo?.(result.item as Memo);
        break;
      case 'task':
        onSelectTask?.(result.item as Task);
        break;
      case 'deleted-memo':
        onSelectDeletedMemo?.(result.item as DeletedMemo);
        break;
      case 'deleted-task':
        onSelectDeletedTask?.(result.item as DeletedTask);
        break;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* ヘッダー */}
      <div className="border-b border-gray-200 p-6">
        {/* タイトル */}
        <div className="flex items-center gap-3 mb-4">
          <SearchIcon className="w-6 h-6 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">詳細検索</h1>
        </div>
        
        {/* 検索バー */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="メモ・タスクを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-Green focus:border-transparent"
              autoFocus
            />
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* フィルター設定 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 検索範囲 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              検索範囲
            </label>
            <select
              value={searchScope}
              onChange={(e) => setSearchScope(e.target.value as "all" | "title" | "content")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-Green"
            >
              <option value="all">タイトル + 内容</option>
              <option value="title">タイトルのみ</option>
              <option value="content">内容のみ</option>
            </select>
          </div>

          {/* 検索対象 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              検索対象
            </label>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as "all" | "memo" | "task" | "deleted")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-Green"
            >
              <option value="all">メモ + タスク</option>
              <option value="memo">メモのみ</option>
              <option value="task">タスクのみ</option>
              <option value="deleted">削除済みのみ</option>
            </select>
          </div>

          {/* ソート順 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ソート順
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "relevance" | "date" | "title")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-Green"
            >
              <option value="relevance">関連度順</option>
              <option value="date">作成日時順</option>
              <option value="title">タイトル順</option>
            </select>
          </div>
        </div>
      </div>

      {/* 検索結果エリア */}
      <div className="flex-1 overflow-hidden relative">
        {!hasQuery ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">🔍</div>
              <h2 className="text-xl font-medium mb-2">詳細検索</h2>
              <p className="text-gray-400">上の検索バーにキーワードを入力してください</p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            {/* 検索結果ヘッダー */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-3 z-1">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {isSearching ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-Green"></div>
                      検索中...
                    </span>
                  ) : (
                    <span>
                      「{searchQuery}」の検索結果: <strong>{sortedResults.length}</strong> 件
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 検索結果リスト */}
            <div className="p-6">
              {sortedResults.length === 0 && !isSearching ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">📭</div>
                  <p>検索結果が見つかりませんでした</p>
                  <p className="text-sm mt-2">別のキーワードで試してみてください</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedResults.map((result) => (
                    <DetailedSearchResultItem
                      key={`${result.type}-${result.item.id}`}
                      result={result}
                      onClick={() => handleSelectSearchResult(result)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface DetailedSearchResultItemProps {
  result: SearchResult;
  onClick: () => void;
}

function DetailedSearchResultItem({ result, onClick }: DetailedSearchResultItemProps) {
  const getTypeInfo = () => {
    switch (result.type) {
      case 'memo':
        return { label: 'メモ', color: 'bg-blue-100 text-blue-800' };
      case 'task':
        return { label: 'タスク', color: 'bg-green-100 text-green-800' };
      case 'deleted-memo':
        return { label: '削除済みメモ', color: 'bg-gray-100 text-gray-600' };
      case 'deleted-task':
        return { label: '削除済みタスク', color: 'bg-gray-100 text-gray-600' };
    }
  };

  const typeInfo = getTypeInfo();
  const title = result.item.title;
  const isDeleted = result.type.startsWith('deleted-');

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-Green hover:shadow-sm transition-all bg-white"
    >
      <div className="flex items-start gap-3">
        {/* タイプバッジ */}
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${typeInfo.color} flex-shrink-0`}>
          {typeInfo.label}
        </span>
        
        <div className="flex-1 min-w-0">
          {/* タイトル */}
          <h3 className={`font-medium text-lg ${isDeleted ? 'text-gray-500' : 'text-gray-900'} mb-1`}>
            {title}
          </h3>
          
          {/* スニペット */}
          <div className="text-sm text-gray-600 mb-2">
            {result.matchedField === 'title' ? (
              <span className="italic text-green-600">タイトルにマッチ</span>
            ) : (
              <div className="line-clamp-2">{result.snippet}</div>
            )}
          </div>
          
          {/* メタ情報 */}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>作成日: {new Date(result.item.createdAt * 1000).toLocaleDateString('ja-JP')}</span>
            <span>マッチ箇所: {result.matchedField === 'title' ? 'タイトル' : '内容'}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default SearchScreen;
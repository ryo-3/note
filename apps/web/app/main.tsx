"use client";

import DeletedMemoList from "@/components/features/memo/deleted-memo-list";
import DesktopLayout from "@/components/layout/desktop-layout";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import BoardScreen, { BoardScreenRef } from "@/components/screens/board-screen";
import CreateScreen from "@/components/screens/create-screen";
import MemoScreen from "@/components/screens/memo-screen";
import SearchScreen from "@/components/screens/search-screen";
import SettingsScreen from "@/components/screens/settings-screen";
import TaskScreen from "@/components/screens/task-screen";
import WelcomeScreen from "@/components/screens/welcome-screen";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import type { DeletedTask, Task } from "@/src/types/task";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import { useEffect, useState, useRef } from "react";

// 画面モード定義（7つのシンプルな画面状態）
type ScreenMode = 'home' | 'memo' | 'task' | 'create' | 'search' | 'settings' | 'board';

function Main() {
  // ==========================================
  // State管理
  // ==========================================
  
  // ユーザー設定取得
  const { preferences } = useUserPreferences(1);
  
  // 画面状態管理
  const [screenMode, setScreenMode] = useState<ScreenMode>('home');
  const [currentMode, setCurrentMode] = useState<"memo" | "task" | "board">("memo"); // サイドバータブ状態
  
  // refs
  const boardScreenRef = useRef<BoardScreenRef>(null);
  
  // 選択中アイテム管理
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [selectedDeletedMemo, setSelectedDeletedMemo] = useState<DeletedMemo | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDeletedTask, setSelectedDeletedTask] = useState<DeletedTask | null>(null);
  
  // デバッグ用：削除済みメモの状態変更を追跡
  useEffect(() => {
    console.log('🔍 selectedDeletedMemo 状態変更:', {
      id: selectedDeletedMemo?.id,
      title: selectedDeletedMemo?.title
    });
  }, [selectedDeletedMemo]);
  
  // UI状態管理
  const [showDeleted, setShowDeleted] = useState(false); // モバイル版削除済み表示フラグ
  const [windowWidth, setWindowWidth] = useState(0); // レスポンシブ制御用

  // エラー管理（将来的にAPI同期エラー表示用）
  const errors: string[] = [];
  const clearErrors = () => {};

  // ==========================================
  // 画面幅監視（レスポンシブ対応）
  // ==========================================
  useEffect(() => {
    const updateWindowWidth = () => {
      setWindowWidth(window.innerWidth);
    };

    updateWindowWidth();
    window.addEventListener("resize", updateWindowWidth);
    return () => window.removeEventListener("resize", updateWindowWidth);
  }, []);

  const isMobile = windowWidth <= 768;

  // ==========================================
  // 共通ユーティリティ関数
  // ==========================================
  
  /** 全選択状態をクリア */
  const clearAllSelections = () => {
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setShowDeleted(false);
  };

  // ==========================================
  // アイテム選択ハンドラー（デスクトップ・モバイル共通）
  // ==========================================
  
  /** メモ選択 - メモ画面に遷移 */
  const handleSelectMemo = (memo: Memo | null) => {
    if (memo) {
      setSelectedMemo(memo);
      setScreenMode('memo');
    } else {
      setSelectedMemo(null);
    }
  };

  /** 削除済みメモ選択 - メモ画面に遷移 */
  const handleSelectDeletedMemo = (memo: DeletedMemo | null) => {
    console.log('🔍 handleSelectDeletedMemo 呼び出し:', {
      memoId: memo?.id,
      memoTitle: memo?.title,
      currentSelected: selectedDeletedMemo?.id
    });
    
    if (memo) {
      console.log('🔍 削除済みメモを設定:', memo.id);
      // clearAllSelections()の代わりに手動で他の状態をクリア
      setSelectedMemo(null);
      setSelectedTask(null);
      setSelectedDeletedTask(null);
      setShowDeleted(false);
      // 削除済みメモは最後に設定
      setSelectedDeletedMemo(memo);
      setScreenMode('memo');
      
      // 状態更新の確認は useEffect で行うため削除
    } else {
      console.log('🔍 削除済みメモをクリア');
      setSelectedDeletedMemo(null);
    }
  };

  /** タスク選択 - タスク画面に遷移 */
  const handleSelectTask = (task: Task | null) => {
    setSelectedTask(task);
    if (task) {
      setScreenMode('task');
    }
  };

  /** 削除済みタスク選択 - タスク画面に遷移 */
  const handleSelectDeletedTask = (task: DeletedTask | null) => {
    if (task) {
      clearAllSelections();
      setSelectedDeletedTask(task);
      setScreenMode('task');
    } else {
      setSelectedDeletedTask(null);
    }
  };

  // ==========================================
  // 編集・削除ハンドラー（デスクトップ・モバイル共通）
  // ==========================================
  
  /** メモ編集 - メモ画面に遷移 */
  const handleEditMemo = (memo?: Memo) => {
    if (memo) {
      setSelectedMemo(memo);
    }
    setScreenMode('memo');
  };

  /** タスク編集 - タスク画面に遷移 */
  const handleEditTask = (task?: Task) => {
    if (task) {
      setSelectedTask(task);
    }
    setScreenMode('task');
  };

  /** メモ削除後の次メモ選択（モバイル版自動選択用） */
  const handleDeleteMemo = (nextMemo: Memo) => {
    clearAllSelections();
    setSelectedMemo(nextMemo);
    setScreenMode('memo');
  };

  // ==========================================
  // 画面遷移ハンドラー（デスクトップ・モバイル共通）
  // ==========================================
  
  /** ホーム画面に戻る */
  const handleHome = () => {
    clearAllSelections();
    setScreenMode('home');
  };

  /** 設定画面に遷移 */
  const handleSettings = () => {
    clearAllSelections();
    setScreenMode('settings');
  };

  /** 検索画面に遷移 */
  const handleSearch = () => {
    clearAllSelections();
    setScreenMode('search');
  };

  /** ボード画面に遷移 */
  const handleDashboard = () => {
    clearAllSelections();
    setScreenMode('board');
  };

  /** 新規作成画面に遷移 */
  const handleNewMemo = () => {
    clearAllSelections();
    setScreenMode('create');
  };

  const handleNewTask = () => {
    clearAllSelections();
    setScreenMode('create');
  };

  const handleNewBoard = () => {
    clearAllSelections();
    setCurrentMode('board');
    setScreenMode('create');
  };

  /** 詳細表示を閉じてホームに戻る */
  const handleClose = () => {
    clearAllSelections();
    setScreenMode('home');
  };

  /** 一覧表示に遷移（memo/task/board画面） */
  const handleShowList = (mode: 'memo' | 'task' | 'board') => {
    clearAllSelections();
    setScreenMode(mode);
  };

  // ==========================================
  // モバイル専用ハンドラー
  // ==========================================
  
  /** モバイル版：削除済み一覧から通常表示に戻る */
  const handleBackToNotes = () => {
    clearAllSelections();
    setScreenMode('home');
  };

  return (
    <main>
      {/* ==========================================
          エラー表示領域（将来的なAPI同期エラー用）
          ========================================== */}
      {errors.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {errors.map((error, index) => (
            <div
              key={index}
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg max-w-sm"
            >
              <div className="flex justify-between items-start">
                <span className="text-sm">{error}</span>
                <button
                  onClick={clearErrors}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isMobile ? (
        /* ==========================================
           モバイル版レイアウト：サイドバー全画面表示
           ========================================== */
        <div className="h-screen w-full">
          {showDeleted ? (
            // 削除済みメモ一覧表示
            <DeletedMemoList
              onBackToNotes={handleBackToNotes}
              onSelectDeletedMemo={handleSelectDeletedMemo}
            />
          ) : (
            // 通常のサイドバー表示（フルサイズ）
            <Sidebar
              onNewMemo={handleNewMemo}
              onNewTask={handleNewTask}
              onSelectMemo={handleSelectMemo}
              onSelectTask={handleSelectTask}
              onEditTask={handleEditTask}
              onShowFullList={() => handleShowList('memo')}
              onHome={handleHome}
              onEditMemo={handleEditMemo}
              onDeleteMemo={handleDeleteMemo}
              selectedMemoId={selectedMemo?.id}
              selectedTaskId={selectedTask?.id}
              isCompact={false} // モバイルは常にフルサイズ
              currentMode={currentMode}
              onModeChange={setCurrentMode}
              onSettings={handleSettings}
              onDashboard={handleDashboard}
              onNewBoard={handleNewBoard}
              isBoardActive={screenMode === 'board'}
            />
          )}
        </div>
      ) : (
        /* ==========================================
           デスクトップ版レイアウト：ヘッダー + サイドバー + メインコンテンツ
           ========================================== */
        <div className="flex flex-col h-screen w-full">
          {/* ヘッダー（設定で非表示可能） */}
          {!preferences?.hideHeader && <Header />}
          
          {/* メインレイアウト */}
          <DesktopLayout
            hideHeader={preferences?.hideHeader}
            sidebarContent={
              // コンパクトサイドバー（アイコンナビ）
              <Sidebar
                onNewMemo={handleNewMemo}
                onNewTask={handleNewTask}
                onSelectMemo={handleSelectMemo}
                onSelectTask={handleSelectTask}
                onEditTask={handleEditTask}
                onShowFullList={() => handleShowList('memo')}
                onShowTaskList={() => handleShowList('task')}
                onHome={handleHome}
                onEditMemo={handleEditMemo}
                onDeleteMemo={handleDeleteMemo}
                selectedMemoId={selectedMemo?.id}
                selectedTaskId={selectedTask?.id}
                isCompact={true} // デスクトップは常にコンパクト
                currentMode={currentMode}
                onModeChange={setCurrentMode}
                onSettings={handleSettings}
                onSearch={handleSearch}
                onDashboard={handleDashboard}
                onNewBoard={handleNewBoard}
                isBoardActive={screenMode === 'board'}
              />
            }
          >
            {/* ==========================================
                メインコンテンツエリア（7つの画面モード）
                ========================================== */}
            
            {/* ホーム画面 */}
            {screenMode === 'home' && (
              <WelcomeScreen />
            )}
            
            {/* メモ関連画面（一覧・表示・編集） */}
            {screenMode === 'memo' && (
              <MemoScreen
                selectedMemo={selectedMemo}
                selectedDeletedMemo={selectedDeletedMemo}
                onSelectMemo={handleSelectMemo}
                onSelectDeletedMemo={handleSelectDeletedMemo}
                onClose={handleClose}
                onDeselectAndStayOnMemoList={() => {
                  setSelectedMemo(null);
                  setSelectedDeletedMemo(null);
                }}
              />
            )}
            
            {/* タスク関連画面（一覧・表示・編集） */}
            {screenMode === 'task' && (
              <TaskScreen
                selectedTask={selectedTask}
                selectedDeletedTask={selectedDeletedTask}
                onSelectTask={handleSelectTask}
                onSelectDeletedTask={handleSelectDeletedTask}
                onClose={handleClose}
                onClearSelection={() => {
                  setSelectedTask(null);
                  setSelectedDeletedTask(null);
                }}
              />
            )}
            
            {/* 新規作成画面（メモ・タスク・ボード統合） */}
            {screenMode === 'create' && (
              <CreateScreen
                initialMode={currentMode}
                onClose={handleClose}
                onModeChange={setCurrentMode}
                onShowMemoList={() => handleShowList('memo')}
                onShowTaskList={() => handleShowList('task')}
                onShowBoardList={() => handleShowList('board')}
              />
            )}
            
            {/* 検索画面 */}
            {screenMode === 'search' && (
              <SearchScreen
                onSelectMemo={handleSelectMemo}
                onSelectTask={handleSelectTask}
                onSelectDeletedMemo={handleSelectDeletedMemo}
                onSelectDeletedTask={handleSelectDeletedTask}
              />
            )}
            
            {/* 設定画面 */}
            {screenMode === 'settings' && (
              <SettingsScreen />
            )}

            {/* ボード画面 */}
            {screenMode === 'board' && (
              <BoardScreen ref={boardScreenRef} />
            )}
          </DesktopLayout>
        </div>
      )}
    </main>
  );
}

export default Main;

import { useEffect } from 'react';

/**
 * 削除アニメーション完了時に蓋を閉じるためのカスタムフック
 * @param onClose 蓋を閉じる際に呼ばれるコールバック関数
 */
declare global {
  interface Window {
    closeDeletingLid?: () => void;
  }
}

export function useDeletionLid(onClose: () => void) {
  useEffect(() => {
    // グローバルな関数として登録（削除アニメーションから呼び出される）
    window.closeDeletingLid = onClose;
    
    return () => {
      // クリーンアップ時に削除
      delete window.closeDeletingLid;
    };
  }, [onClose]);
}
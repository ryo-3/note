import { useEffect, useState } from 'react';

/**
 * 削除ボタンの遅延非表示処理を管理するカスタムフック
 * 削除完了後もアニメーション完了まで1秒間ボタンを表示し続ける
 */
export function useDelayedButtonVisibility(
  shouldShow: boolean,
  isAnimating: boolean,
  delayMs: number = 1000
) {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    if (shouldShow && !showButton) {
      // 表示する場合はすぐに表示
      setShowButton(true);
    } else if (!shouldShow && showButton && !isAnimating) {
      // 非表示にする場合は、アニメーション中でなければ指定時間後に非表示
      const timer = setTimeout(() => {
        setShowButton(false);
      }, delayMs);
      return () => clearTimeout(timer);
    }
  }, [shouldShow, showButton, isAnimating, delayMs]);

  return showButton;
}
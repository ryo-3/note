// 仮想ゴミ箱要素作成ヘルパー
function createVirtualTrash(trashRect: DOMRect): HTMLElement {
  const virtualTrash = document.createElement('div');
  virtualTrash.style.position = 'fixed';
  virtualTrash.style.left = `${trashRect.left}px`;
  virtualTrash.style.top = `${trashRect.top}px`;
  virtualTrash.style.width = `${trashRect.width}px`;
  virtualTrash.style.height = `${trashRect.height}px`;
  document.body.appendChild(virtualTrash);
  return virtualTrash;
}

// 共通アニメーションベース関数
function createTrashAnimation(
  itemElement: HTMLElement,
  trashElement: HTMLElement,
  options: {
    duration: number; // ミリ秒
    fixedSize?: { width: number; height: number }; // 固定サイズ
    targetOffset: { x: number; y: number }; // ゴミ箱からのオフセット
    scale: { x: number; y: number }; // 最終スケール
    opacity: number; // 最終透明度
    rotation: () => number; // 回転角度（関数）
    transformOrigin: string; // 変形の基点
    timingFunction: string; // イージング関数
    onComplete?: () => void;
  }
) {
  const itemRect = itemElement.getBoundingClientRect();
  
  // ゴミ箱の位置を取得
  const targetElement = trashElement.offsetWidth > 0 && trashElement.offsetHeight > 0 
    ? trashElement 
    : trashElement.parentElement as HTMLElement;
  const trashRect = targetElement.getBoundingClientRect();
  
  // 蓋を開く
  const trashIcon = trashElement.querySelector('[data-trash-icon]') as HTMLElement;
  if (trashIcon) {
    trashIcon.style.setProperty('--lid-open', '1');
  }
  
  // アニメーション用クローン作成
  const clone = itemElement.cloneNode(true) as HTMLElement;
  const width = options.fixedSize?.width || itemRect.width;
  const height = options.fixedSize?.height || itemRect.height;
  
  clone.style.position = 'fixed';
  clone.style.top = `${itemRect.top}px`;
  clone.style.left = `${itemRect.left}px`;
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.zIndex = '9999';
  clone.style.pointerEvents = 'none';
  clone.style.transition = `all ${options.duration}ms ${options.timingFunction}`;
  clone.style.transformOrigin = options.transformOrigin;
  
  // 元要素を非表示
  itemElement.style.visibility = 'hidden';
  itemElement.style.pointerEvents = 'none';
  
  document.body.appendChild(clone);
  
  requestAnimationFrame(() => {
    // ターゲット位置計算
    const targetX = trashRect.left + trashRect.width / 2 - width / 2 + options.targetOffset.x;
    const targetY = trashRect.top + trashRect.height / 2 - height / 2 + options.targetOffset.y;
    
    // アニメーション実行
    clone.style.transform = `translate(${targetX - itemRect.left}px, ${targetY - itemRect.top}px) scaleX(${options.scale.x}) scaleY(${options.scale.y}) rotate(${options.rotation()}deg)`;
    clone.style.opacity = options.opacity.toString();
    
    setTimeout(() => {
      document.body.removeChild(clone);
      if (trashIcon) {
        trashIcon.style.setProperty('--lid-open', '0');
      }
      options.onComplete?.();
    }, options.duration);
  });
}

// リストアイテム用削除アニメーション
export function animateItemToTrash(
  itemElement: HTMLElement,
  trashElement: HTMLElement,
  onComplete?: () => void
) {
  createTrashAnimation(itemElement, trashElement, {
    duration: 600,
    targetOffset: { x: 0, y: 0 }, // ゴミ箱中央
    scale: { x: 0.1, y: 0.1 },
    opacity: 0.3,
    rotation: () => 15,
    transformOrigin: 'center',
    timingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    onComplete
  });
}

// 位置情報を使用してアニメーション実行
export function animateMultipleItemsToTrashWithRect(
  itemIds: number[],
  trashRect: DOMRect,
  onComplete?: () => void,
  delay: number = 100,
  viewMode: 'list' | 'card' = 'list'
) {
  console.log('🎭 アニメーション関数開始:', { total: itemIds.length, itemIds });
  
  const maxAnimatedItems = 20; // アニメーションする最大数
  const animatedIds = itemIds.slice(0, maxAnimatedItems);
  const remainingIds = itemIds.slice(maxAnimatedItems);
  
  console.log('🎭 アニメーション分割:', { 
    animated: animatedIds.length, 
    remaining: remainingIds.length, 
    animatedIds, 
    remainingIds 
  });
  
  let completedCount = 0;
  const totalItems = itemIds.length;
  
  // アニメーション中はスクロールバーを非表示
  const listContainer = document.querySelector('.overflow-y-auto') as HTMLElement;
  if (listContainer) {
    listContainer.style.overflow = 'hidden';
    console.log('📏 スクロールバー非表示');
  }
  
  // ゴミ箱の蓋を開く
  const trashIcon = document.querySelector('[data-trash-icon]') as HTMLElement;
  if (trashIcon) {
    trashIcon.style.setProperty('--lid-open', '1');
  }
  
  // 残りのアイテムを一斉にフェードアウト（20個以降は遅延なし）
  if (remainingIds.length > 0) {
    console.log('📦 残りのアイテム一斉フェードアウト:', { count: remainingIds.length });
    
    // ゴミ箱アニメーション最後のアイテムの後に実行
    setTimeout(() => {
      remainingIds.forEach((id) => {
        const itemElement = document.querySelector(`[data-memo-id="${id}"], [data-task-id="${id}"]`) as HTMLElement;
        
        if (itemElement) {
          // クローンを作成してフェードアウトアニメーション
          const itemRect = itemElement.getBoundingClientRect();
          const clone = itemElement.cloneNode(true) as HTMLElement;
          
          clone.style.position = 'fixed';
          clone.style.top = `${itemRect.top}px`;
          clone.style.left = `${itemRect.left}px`;
          clone.style.width = `${itemRect.width}px`;
          clone.style.height = `${itemRect.height}px`;
          clone.style.zIndex = '9998';
          clone.style.pointerEvents = 'none';
          clone.style.transition = 'all 0.3s ease-out';
          
          // 元のアイテムを即座に非表示
          itemElement.style.opacity = '0';
          itemElement.style.transform = 'scale(0.8)';
          itemElement.style.transition = 'all 0.1s ease-out';
          
          // クローンをDOMに追加
          document.body.appendChild(clone);
          
          // クローンをフェードアウト
          requestAnimationFrame(() => {
            clone.style.opacity = '0';
            clone.style.transform = 'scale(0.8)';
            
            setTimeout(() => {
              document.body.removeChild(clone);
            }, 300);
          });
        }
      });
      
      // 一斉にカウントアップ
      completedCount += remainingIds.length;
      console.log('✅ 一斉フェードアウト完了:', { count: remainingIds.length, completedCount, totalItems });
      
      // 全てのアイテムが完了したらコールバック実行
      if (completedCount >= totalItems) {
        setTimeout(() => {
          console.log('🎊 全アニメーション完了!', { completedCount, totalItems });
          if (trashIcon) {
            trashIcon.style.setProperty('--lid-open', '0');
          }
          // スクロールバーを復元
          if (listContainer) {
            listContainer.style.overflow = '';
            console.log('📏 スクロールバー復元');
          }
          onComplete?.();
        }, 300); // フェードアウトのtransition時間を待つ
      }
    }, maxAnimatedItems * delay); // 最初の20個のアニメーション後に実行
  }
  
  // 最初の20個だけアニメーション
  animatedIds.forEach((id, index) => {
    setTimeout(() => {
      console.log('🗑️ ゴミ箱アニメーション開始:', { id, index, delay: index * delay });
      const itemElement = document.querySelector(`[data-memo-id="${id}"], [data-task-id="${id}"]`) as HTMLElement;
      if (itemElement) {
        console.log('🗑️ ゴミ箱アイテム発見:', { id, element: itemElement });
        
        // viewModeに応じてアニメーション実行
        if (viewMode === 'card') {
          const trashElement = createVirtualTrash(trashRect);
          animateCardToTrash(itemElement, trashElement, () => {
            document.body.removeChild(trashElement);
            handleAnimationComplete();
          });
        } else {
          animateItemToTrashWithRect(itemElement, trashRect, handleAnimationComplete);
        }
        
        function handleAnimationComplete() {
          completedCount++;
          console.log('🗑️ アニメーション完了:', { id, completedCount, totalItems, viewMode });
          if (completedCount === totalItems) {
            setTimeout(() => {
              if (trashIcon) {
                trashIcon.style.setProperty('--lid-open', '0');
              }
              if (listContainer) {
                listContainer.style.overflow = '';
                console.log('📏 スクロールバー復元');
              }
              onComplete?.();
            }, 200);
          }
        }
      } else {
        completedCount++;
        // 全てのアイテム（ゴミ箱アニメーション + フェードアウト）が完了したらコールバック実行
        if (completedCount === totalItems) {
          setTimeout(() => {
            if (trashIcon) {
              trashIcon.style.setProperty('--lid-open', '0');
            }
            onComplete?.();
          }, 200);
        }
      }
    }, index * delay);
  });
}

// 位置情報を使用してアニメーション実行
export function animateItemToTrashWithRect(
  itemElement: HTMLElement,
  trashRect: DOMRect,
  onComplete?: () => void
) {
  // アイテムの初期位置を取得
  const itemRect = itemElement.getBoundingClientRect();
  
  // アニメーション用のクローンを作成
  const clone = itemElement.cloneNode(true) as HTMLElement;
  clone.style.position = 'fixed';
  clone.style.top = `${itemRect.top}px`;
  clone.style.left = `${itemRect.left}px`;
  clone.style.width = `${itemRect.width}px`;
  clone.style.height = `${itemRect.height}px`;
  clone.style.zIndex = '9999';
  clone.style.pointerEvents = 'none';
  clone.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  clone.style.transformOrigin = 'center';
  
  // 元のアイテムを非表示にする（高さは保持）
  itemElement.style.visibility = 'hidden';
  itemElement.style.pointerEvents = 'none';
  
  // クローンをDOMに追加
  document.body.appendChild(clone);
  
  // アニメーション開始
  requestAnimationFrame(() => {
    // ゴミ箱の口（左上寄り）に向かって移動・縮小
    const targetX = trashRect.left + trashRect.width / 2 - itemRect.width / 2 - 13; // ~px左へ
    const targetY = trashRect.top + trashRect.height * 0.2 - 34; // ~px上へ
    
    // より自然な弧を描く動きを作成
    clone.style.transform = `translate(${targetX - itemRect.left}px, ${targetY - itemRect.top}px) scale(0.05) rotate(${Math.random() * 15 + 5}deg)`;
    clone.style.opacity = '0.8';
    
    // 最初の段階で少し遅延
    setTimeout(() => {
      // ゴミ箱の中に落ちる動き
      clone.style.transform = `translate(${targetX - itemRect.left}px, ${targetY - itemRect.top + 20}px) scaleX(0.001) scaleY(0.01) rotate(${Math.random() * 30 + 10}deg)`;
      clone.style.opacity = '0';
      clone.style.transition = 'all 0.5s ease-in';
    }, 600);
    
    // アニメーション完了後の処理
    setTimeout(() => {
      document.body.removeChild(clone);
      onComplete?.();
    }, 600);
  });
}

// 複数アイテムを順次ゴミ箱に飛ばす
export function animateMultipleItemsToTrash(
  itemIds: number[],
  trashElement: HTMLElement,
  onComplete?: () => void,
  delay: number = 100,
  viewMode: 'list' | 'card' = 'list'
) {
  let completedCount = 0;
  
  itemIds.forEach((id, index) => {
    setTimeout(() => {
      const itemElement = document.querySelector(`[data-memo-id="${id}"], [data-task-id="${id}"]`) as HTMLElement;
      if (itemElement) {
        // カード表示の時はanimateCardToTrash、リスト表示の時はanimateItemToTrashを使用
        const animateFunction = viewMode === 'card' ? animateCardToTrash : animateItemToTrash;
        animateFunction(itemElement, trashElement, () => {
          completedCount++;
          if (completedCount === itemIds.length) {
            onComplete?.();
          }
        });
      } else {
        completedCount++;
        if (completedCount === itemIds.length) {
          onComplete?.();
        }
      }
    }, index * delay);
  });
}

// エディター全体をゴミ箱に吸い込むアニメーション
export function animateEditorToTrash(
  editorElement: HTMLElement,
  trashElement: HTMLElement,
  onComplete?: () => void
) {
  console.log('📝 エディターゴミ箱アニメーション開始');
  
  // エディターの位置とサイズを取得
  const editorRect = editorElement.getBoundingClientRect();
  const trashRect = trashElement.getBoundingClientRect();
  
  // 蓋を開く
  const trashIcon = trashElement.querySelector('[data-trash-icon]') as HTMLElement;
  if (trashIcon) {
    trashIcon.style.setProperty('--lid-open', '1');
  }
  
  // エディター全体のアニメーション設定
  editorElement.style.position = 'fixed';
  editorElement.style.top = `${editorRect.top}px`;
  editorElement.style.left = `${editorRect.left}px`;
  editorElement.style.width = `${editorRect.width}px`;
  editorElement.style.height = `${editorRect.height}px`;
  editorElement.style.zIndex = '9999';
  editorElement.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  editorElement.style.transformOrigin = 'center';
  
  // ゴミ箱の口（左上寄り）に向かって移動・縮小
  const targetX = trashRect.left + trashRect.width / 2 - editorRect.width / 2 - 13;
  const targetY = trashRect.top + trashRect.height * 0.2 - 34;
  
  // アニメーション開始
  requestAnimationFrame(() => {
    editorElement.style.transform = `translate(${targetX - editorRect.left}px, ${targetY - editorRect.top}px) scale(0.02) rotate(${Math.random() * 20 + 10}deg)`;
    editorElement.style.opacity = '0.8';
    
    // アニメーション完了後の処理
    setTimeout(() => {
      console.log('📝 エディターゴミ箱アニメーション完了');
      
      // 蓋を閉じる
      if (trashIcon) {
        trashIcon.style.setProperty('--lid-open', '0');
      }
      
      onComplete?.();
    }, 800);
  });
}

// カード用削除アニメーション（中央から縮小）
export function animateCardToTrash(
  cardElement: HTMLElement,
  trashElement: HTMLElement,
  onComplete?: () => void
) {
  console.log('📄 カードゴミ箱アニメーション開始');
  
  createTrashAnimation(cardElement, trashElement, {
    duration: 700, // カードは少しゆっくり
    targetOffset: { x: 10, y: -5 }, // カードは大きいので少し上に
    scale: { x: 0.02, y: 0.02 }, // カードはより小さく
    opacity: 0.3,
    rotation: () => Math.random() * 20 + 10, // 少し回転
    transformOrigin: 'center',
    timingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    onComplete
  });
}


// エディター用削除アニメーション（下から上へ吸い込まれる）
export function animateEditorContentToTrash(
  editorElement: HTMLElement,
  trashElement: HTMLElement,
  onComplete?: () => void
) {
  console.log('✏️ エディターコンテンツゴミ箱アニメーション開始');
  
  createTrashAnimation(editorElement, trashElement, {
    duration: 600, // 速度統一
    fixedSize: { width: 400, height: 300 }, // 固定サイズ
    targetOffset: { x: 0, y: -30 }, // 中央寄り上
    scale: { x: 0.03, y: 0.01 }, // 縦に縮む
    opacity: 0.3,
    rotation: () => Math.random() * 15 + 3,
    transformOrigin: 'center bottom',
    timingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // 速度統一
    onComplete
  });
}

// 復元時のフェードアウトアニメーション
export function animateItemsRestoreFadeOut(
  itemIds: number[],
  onComplete?: () => void,
  delay: number = 50
) {
  console.log('🌟 復元アニメーション開始:', { total: itemIds.length, itemIds });
  
  const maxAnimatedItems = 20; // アニメーションする最大数
  const animatedIds = itemIds.slice(0, maxAnimatedItems);
  const remainingIds = itemIds.slice(maxAnimatedItems);
  
  console.log('🌟 復元アニメーション分割:', { 
    animated: animatedIds.length, 
    remaining: remainingIds.length, 
    animatedIds, 
    remainingIds 
  });
  
  let completedCount = 0;
  const totalItems = itemIds.length;
  
  // 残りのアイテムを一斉にフェードアウト（20個以降は遅延なし）
  if (remainingIds.length > 0) {
    console.log('📦 残りのアイテム一斉フェードアウト:', { count: remainingIds.length });
    
    // 最初の20個のアニメーション後に実行
    setTimeout(() => {
      remainingIds.forEach((id) => {
        const itemElement = document.querySelector(`[data-memo-id="${id}"], [data-task-id="${id}"]`) as HTMLElement;
        
        if (itemElement) {
          // 元のアイテムを即座に非表示
          itemElement.style.opacity = '0';
          itemElement.style.transform = 'scale(0.95)';
          itemElement.style.transition = 'all 0.1s ease-out';
        }
      });
      
      // 一斉にカウントアップ
      completedCount += remainingIds.length;
      console.log('✅ 一斉フェードアウト完了:', { count: remainingIds.length, completedCount, totalItems });
      
      // 全てのアイテムが完了したらコールバック実行
      if (completedCount >= totalItems) {
        setTimeout(() => {
          console.log('🎊 全復元アニメーション完了!', { completedCount, totalItems });
          onComplete?.();
        }, 100);
      }
    }, maxAnimatedItems * delay);
  }
  
  // 最初の20個だけ順次アニメーション
  animatedIds.forEach((id, index) => {
    setTimeout(() => {
      console.log('🌟 復元アニメーション実行:', { id, index });
      const itemElement = document.querySelector(`[data-memo-id="${id}"], [data-task-id="${id}"]`) as HTMLElement;
      
      if (itemElement) {
        // アイテムの初期位置を取得
        const itemRect = itemElement.getBoundingClientRect();
        
        // アニメーション用のクローンを作成
        const clone = itemElement.cloneNode(true) as HTMLElement;
        clone.style.position = 'fixed';
        clone.style.top = `${itemRect.top}px`;
        clone.style.left = `${itemRect.left}px`;
        clone.style.width = `${itemRect.width}px`;
        clone.style.height = `${itemRect.height}px`;
        clone.style.zIndex = '9999';
        clone.style.pointerEvents = 'none';
        clone.style.transition = 'all 0.4s ease-out';
        clone.style.transformOrigin = 'center';
        
        // 元のアイテムを即座に非表示
        itemElement.style.opacity = '0';
        itemElement.style.transform = 'scale(0.95)';
        itemElement.style.transition = 'all 0.1s ease-out';
        
        // クローンをDOMに追加
        document.body.appendChild(clone);
        
        // フェードアウトアニメーション開始
        requestAnimationFrame(() => {
          clone.style.opacity = '0';
          clone.style.transform = 'scale(0.95) translateY(-10px)';
          
          setTimeout(() => {
            document.body.removeChild(clone);
            completedCount++;
            console.log('🌟 復元アニメーション完了:', { id, completedCount, totalItems });
            
            // 全てのアイテムが完了したらコールバック実行
            if (completedCount === totalItems) {
              console.log('🎊 全復元アニメーション完了!');
              onComplete?.();
            }
          }, 400);
        });
      } else {
        completedCount++;
        if (completedCount === totalItems) {
          onComplete?.();
        }
      }
    }, index * delay);
  });
}
# Claude開発仕様書
日本語で対応して　
## プロジェクト概要
- **メモ帳アプリ**: メモとタスクの統合管理アプリ
- **技術スタック**: 
  - **フロントエンド**: Next.js + TypeScript + Tailwind CSS
  - **バックエンド**: Hono + SQLite + Drizzle ORM
  - **認証**: Clerk (JWT Bearer認証)
- **アーキテクチャ**: Turborepo monorepo構成

## 基本設計原則
- **共通化ファースト**: 2回以上使われる可能性があるなら即座に共通化
- **Props設計**: variant, size, color等のオプションで拡張性重視
- **親からサイズ指定**: デフォルト値は定義せず、明示的にサイズを渡す
- **CSS-First アニメーション**: JavaScript制御よりCSS @keyframesを優先
- **段階的リファクタリング**: 既存機能を壊さず段階的に改善

## 主要システム

### カテゴリーシステム
- **スキーマ**: categories テーブル (id, name, userId, createdAt, updatedAt)
- **API**: /categories (CRUD操作、Clerk Bearer認証)
- **フック**: use-categories.ts (React Query)
- **UI**: CategorySelector (CustomSelector利用)

### ボードシステム ✅
- **スキーマ**: boards テーブル (id, name, slug, description, userId, position, archived, createdAt, updatedAt)
- **API**: 
  - `/boards` - ボード一覧・作成・更新・削除
  - `/boards/slug/{slug}` - slugからボード取得
  - `/boards/{id}/items` - ボード内アイテム取得・追加・削除
- **フック**: 
  - `useBoards()` - ボード一覧取得
  - `useBoardBySlug(slug)` - slugからボード取得
  - `useBoardWithItems(id)` - ボード詳細とアイテム取得
- **URL設計**: `/boards/{slug}` - SEOフレンドリーなslugベースURL
- **Slug生成**: 
  - 英数字: 名前をケバブケース変換
  - 日本語/特殊文字: ランダム6文字 (例: `fnlncz`)
  - 重複チェック: 自動で `-1`, `-2` 追加
- **UI機能**:
  - ✅ ボード一覧（カード表示）
  - ✅ ボード作成・編集・削除
  - ✅ ボード詳細画面（アイテム表示）
  - ✅ メモ・タスクのボード追加・削除
  - ✅ **タブ機能**: メモ（通常・削除済み）、タスク（未着手・進行中・完了・削除済み）
  - ✅ **右パネル編集**: アイテム選択で右パネルのエディター表示
  - ✅ **新規作成**: +ボタンで右パネルエディターによる新規作成
  - ✅ **レスポンシブ**: 右パネル開閉に応じたレイアウト調整


## 重要コンポーネント

### 共通基盤コンポーネント
- `domUtils.ts` - DOM順序取得とアイテム選択
- `ConfirmationModal` - 確認ダイアログ統一
- `BaseCard`, `BaseViewer` - レイアウト共通化
- `DeleteButton` - 削除ボタン統一（TrashIcon CSS化済み）
- `SaveButton` - 保存ボタン統一（変更検知対応、CSS化済み）
- `CustomSelector` - セレクター統一
- `CategorySelector` - カテゴリー選択コンポーネント
- `AddItemButton` - アイテム追加ボタン統一（サイズ・ツールチップ対応）
- `RightPanel` - 右パネル統一（エディター表示用）

### UIコントロール
- `TrashIcon` - ゴミ箱アイコン（CSS制御）

### 共通フック
- `use-categories` - カテゴリー操作フック（CRUD操作）
- `use-boards` - ボード操作フック（CRUD操作、slug対応）
- `useBoardWithItems` - ボード詳細とアイテム取得（タブ機能対応）
- `useRemoveItemFromBoard` - ボードからアイテム削除


## UI統一規則
- **タブ高さ**: すべてのタブは `h-7` (28px) で統一
- **タブ色**: 
  - メモ通常: `bg-gray-200` (アクティブ) / `bg-gray-500` (アイコン)
  - タスク未着手: `bg-zinc-200` (アクティブ) / `bg-zinc-400` (アイコン)
  - タスク進行中: `bg-blue-100` (アクティブ) / `bg-Blue` (アイコン)
  - タスク完了: `bg-Green/20` (アクティブ) / `bg-Green` (アイコン)
  - 削除済み: `bg-red-100` (アクティブ) / `TrashIcon` (アイコン)

## API認証パターン
```typescript
// Clerk Bearer認証（credentials: "include" 不要）
const response = await fetch(`${API_BASE_URL}/categories`, {
  headers: {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  },
});
```

## 開発コマンド
```bash
npm run check-types && npm run lint  # コミット前必須
```

## ボード詳細画面の最新仕様

### タブシステム
- **メモタブ**: 
  - 通常タブ（灰色アイコン・bg-gray-200）
  - 削除済みタブ（ゴミ箱アイコン・bg-red-100）
- **タスクタブ**:
  - 未着手タブ（灰色アイコン・bg-zinc-200）
  - 進行中タブ（青アイコン・bg-blue-100）
  - 完了タブ（緑アイコン・bg-Green/20）
  - 削除済みタブ（ゴミ箱アイコン・bg-red-100）

### 右パネル連動機能
- **タブテキスト制御**: 右パネル開閉に応じてタブのテキスト表示/非表示（300ms遅延）
- **×ボタン制御**: 右パネル閉じている時のみ×ボタン表示
- **新規作成**: +ボタンで右パネルエディターによる新規作成（モーダル廃止）
- **選択状態保持**: タブ切り替え時も選択状態を保持

### レイアウト最適化
- **UIスリム化**: パディング・マージン・フォントサイズの削減
- **タブ高さ統一**: すべてのタブを28px（h-7）で統一
- **背景色削除**: メモ・タスク列の背景色を削除してよりクリーンに
- **ボーダー削除**: 選択時のボーダーを削除してスペース節約

# 🚨 重要：開発制約と作業原則

## 🚫 絶対禁止事項（monorepo破壊防止）

### 1. パッケージ関連 - 絶対に触るな！
- ❌ **npmパッケージの追加・インストール**
- ❌ **package.jsonの変更**
- ❌ **pnpm-lock.yamlの変更**
- ❌ **依存関係の変更**
- ❌ **npm install, pnpm install等の実行**

**理由**: Turborepo monorepo構成が完全に壊れる

### 2. 確認不足による作業 - 毎回エラーの原因！
- ❌ **コードを読まずに修正提案**
- ❌ **変数・関数の存在確認をしない**
- ❌ **既存実装を理解せずに変更**
- ❌ **影響範囲を考えずに変更**

**理由**: 毎回型エラーやランタイムエラーが発生

### 3. 品質破壊
- ❌ **型エラーを残す**
- ❌ **lintエラーを残す**
- ❌ **テストを壊す**

## ✅ 必須作業手順（この順番で！）

### 1. 作業前の準備
```bash
# 1. 必ず既存コードを読む
Read/Grep/Task tools で関連ファイルを確認

# 2. 依存関係・変数の存在確認
import文、型定義、関数の存在を確認

# 3. 影響範囲の理解
変更による他ファイルへの影響を確認
```

### 2. 作業中
- **小さな変更から開始**
- **1つずつ確認しながら進める**
- **エラーが出たら即座に修正**

### 3. 作業後（必須！）
```bash
# 型チェック + lint実行（コミット前必須）
npm run check-types && npm run lint
```

## 🎯 作業時の心構え

### Claude側のチェックリスト
1. □ コードを読んだか？
2. □ 変数・関数の存在を確認したか？
3. □ 影響範囲を理解したか？
4. □ パッケージを触っていないか？
5. □ 型エラー・lintエラーはないか？

### ユーザーとのコミュニケーション
- **エラーが出たら**: 具体的なエラーメッセージを聞く
- **分からないことがあれば**: 必ず確認する
- **提案前に**: 既存コードの確認結果を伝える

## 📋 開発制約まとめ
- **新npmパッケージ追加禁止**
- **型エラー・lintエラー0維持**
- **セキュリティ重視（悪意コード禁止）**
- **Turborepoの設定変更禁止**


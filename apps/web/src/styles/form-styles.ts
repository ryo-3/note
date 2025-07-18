// フォーム要素の統一スタイル定数
export const FORM_STYLES = {
  // ラベル
  label: "block text-xs font-medium text-gray-600 mb-1 mt-1",

  // セレクター（ボタン部分）
  selector:
    "flex items-center cursor-pointer bg-white px-1 border border-gray-400 rounded-lg h-9",

  // セレクター内のテキスト
  selectorText:
    "px-1.5 text-sm hover:opacity-80 transition-opacity flex items-center gap-2 flex-1",

  // インプット（date, text等）
  input:
    "px-1.5 border border-gray-400 rounded-lg focus:border-DeepBlue outline-none h-9",

  // チェブロンアイコン
  chevron: "w-3 h-3 mr-1 transition-transform",
} as const;

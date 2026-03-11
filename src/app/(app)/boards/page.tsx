export default function BoardsPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <p className="text-4xl mb-4">📋</p>
        <h2 className="text-xl font-semibold text-slate-700 mb-2">
          ボードを選択してください
        </h2>
        <p className="text-slate-500 text-sm">
          左のサイドバーからボードを選ぶか、新しいボードを作成してください。
        </p>
      </div>
    </div>
  );
}

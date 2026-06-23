# アンケートCSVフォーマット（共通仕様）

`nextjs-app` / `django-app` の両実装で共通のCSV列定義です。列名は日本語・英語のどちらでも読み込めます。

| 列名 | 説明 | 例 |
|---|---|---|
| `response_id` / 回答ID | 回答の一意なID（任意） | 1 |
| `course_name` / 講座名 | 講座名 | Excel自動化基礎講座 |
| `client_name` / クライアント名 | 企業名 | 株式会社ABC |
| `respondent_dept` / 部署 | 部署（任意） | 営業部 |
| `answered_at` / 回答日 | 回答日 | 2026-06-01 |
| `time_unit` / 時間単位 | 月 / 日 / 年あたり | 月 |
| `time_value` / 時間 | 節約時間（数値） | 5 |
| `usage_type` / 用途 | 業務 / プライベート | 業務 |
| `satisfaction_score` / 満足度 | 1〜5 | 5 |
| `comprehension_score` / 理解度 | 1〜5 | 4 |
| `nps_score` / 推奨度 | 0〜10 | 9 |
| `instructor_score` / 講師評価 | 1〜5 | 5 |
| `difficulty_level` / 難易度 | 1〜5 | 2 |
| `would_apply` / 実践予定 | はい / いいえ / わからない | はい |
| `free_comment` / 自由記述 | コメント | 作業が早くなった |

## 年間換算ロジック（共通）

- 月あたり → ×12
- 年あたり → ×1
- 日あたり（業務） → 勤務日(260日) または 全日(365日)。ダッシュボードのトグルで切替
- 日あたり（プライベート） → 常に365日換算

サンプルCSVは `nextjs-app/public/sample.csv` を参照してください。

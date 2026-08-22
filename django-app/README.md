# 時間見えるくん ⏱（Django版）

> ## ⚠️ この実装はメンテナンスを終了しています
> Django版は初期の技術比較検証用に作成したものです。**今後の機能追加・修正は
> [`nextjs-app`](../nextjs-app)（正式版）にのみ行われます。** 最新の機能・仕様は
> Next.js版を参照してください。このディレクトリは過去の実装参考として残しており、
> Next.js版と機能差が生じている場合があります。

[`nextjs-app`](../nextjs-app) と同一機能を持つDjango実装として作成されました（比較検証用）。

## 主な機能（MVP）

- **CSVアップロード**: Googleフォーム等から出力したアンケート回答CSVを読み込み（列名は日本語・英語に対応）
- **KPIサマリー**: 総節約時間（年間換算）／1人あたり平均／回答件数／平均満足度／NPS
- **年間換算ロジック**: 月・日・年あたりの回答を年間時間に統一集計
  - 「日あたり業務利用」の換算係数は **勤務日(260日) / 全日(365日)** をトグルで切替可能
  - プライベート利用は常に365日換算
- **フィルタ**: クライアント・講座・用途（業務/プライベート）で絞り込み（総計も閲覧可）
- **時間効果タブ**: 講座別・クライアント別の総節約時間、月別トレンド、講座別サマリー表
- **講座評価タブ**: 満足度・理解度・難易度の分布、NPS内訳、実践予定、自由記述の頻出キーワード

## 技術構成

- Django 5（サーバーサイドでCSVを処理）
- Chart.js（CDN経由、グラフ描画）
- アップロードしたデータはDBの永続テーブルに保存せず、**セッション（django_session）** に保持

nextjs-app（ブラウザ上でCSVを処理するSPA）と異なり、こちらはCSVアップロード→サーバーで集計→HTML再描画というクラシックなDjango構成です。フィルタ変更・換算モード切替は画面再読込（GETパラメータ）で反映され、タブ切替のみJSでその場で切り替わります。

## セットアップ

```bash
cd django-app
python -m venv venv

# 有効化
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate           # Windows

pip install -r requirements.txt
python manage.py migrate        # セッション保存用テーブルを作成
python manage.py runserver      # http://localhost:8000
```

起動後、トップページの「サンプルデータで試す」ボタン、または `dashboard/static/dashboard/sample.csv` のアップロードで動作確認できます。

## CSVフォーマット

共通仕様は [`../docs/csv-format.md`](../docs/csv-format.md) を参照してください。

## 実装メモ（nextjs-appとの対応）

| nextjs-app | django-app | 役割 |
|---|---|---|
| `lib/types.ts` | （dict構造として実装） | アンケート回答の型 |
| `lib/parseCsv.ts` | `dashboard/parsing.py` | CSVパース・列名エイリアス解決 |
| `lib/aggregate.ts` | `dashboard/aggregate.py` | 年間換算・集計・NPS・キーワード抽出 |
| `lib/sampleData.ts` | `dashboard/sample_data.py` | デモ用サンプルデータ生成 |
| `components/*.tsx` | `dashboard/templates/dashboard/*.html` | 画面表示 |
| Recharts | Chart.js | グラフ描画 |

## 今後のロードマップ（次フェーズ）

- Googleフォーム/スプレッドシート自動連携（手動CSVアップロードの自動化）
- 認証・権限管理（社内スタッフ＝全閲覧・管理 / クライアント＝自社分のみ閲覧）
- ダッシュボードのカスタマイズ機能（ウィジェット自由配置）

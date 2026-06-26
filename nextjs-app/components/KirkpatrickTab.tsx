"use client";

import { useMemo } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { SurveyResponse, WorkdayMode } from "@/lib/types";
import { computeKpis, computeRoi } from "@/lib/aggregate";
import { RoiSettings } from "@/lib/types";
import { toYenUnit } from "@/lib/format";

interface Props {
  rows: SurveyResponse[];
  workdayMode: WorkdayMode;
  roi: RoiSettings;
}

// 各レベルのスコアを 0〜100 に正規化する係数
// Level 1 反応: 満足度平均(1-5) → (avg-1)/4*100
// Level 2 学習: 理解度平均(1-5) → (avg-1)/4*100
// Level 3 行動: 実践予定「はい」割合(0-1) → *100
// Level 4 結果: ROI換算 節約時間あり → 時間あり=60点固定ベース+充足度補正

function pct(v: number | null, min: number, max: number): number | null {
  if (v == null) return null;
  return Math.round(((v - min) / (max - min)) * 100);
}

function levelColor(score: number | null): string {
  if (score == null) return "#94a3b8";
  if (score >= 75) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function levelLabel(score: number | null): string {
  if (score == null) return "データなし";
  if (score >= 75) return "高い";
  if (score >= 50) return "普通";
  return "改善余地あり";
}

interface LevelCardProps {
  level: number;
  name: string;
  description: string;
  dataLabel: string;
  score: number | null;
  detail: string;
  guidance: string;
}

function LevelCard({ level, name, description, dataLabel, score, detail, guidance }: LevelCardProps) {
  const color = levelColor(score);
  return (
    <div className="kirk-card">
      <div className="kirk-card-header">
        <div className="kirk-level-badge" style={{ background: color }}>
          Level {level}
        </div>
        <div>
          <div className="kirk-card-title">{name}</div>
          <div className="muted" style={{ fontSize: 12 }}>{description}</div>
        </div>
      </div>

      <div className="kirk-gauge-wrap">
        <div className="kirk-gauge-bar">
          <div
            className="kirk-gauge-fill"
            style={{ width: `${score ?? 0}%`, background: color }}
          />
        </div>
        <div className="kirk-gauge-labels">
          <span className="muted" style={{ fontSize: 12 }}>{dataLabel}</span>
          <span style={{ fontWeight: 700, color }}>
            {score == null ? "—" : `${score} / 100`}
            <span className="muted" style={{ fontWeight: 400, fontSize: 12, marginLeft: 6 }}>
              {levelLabel(score)}
            </span>
          </span>
        </div>
      </div>

      <div className="kirk-detail muted">{detail}</div>
      <div className="kirk-guidance">{guidance}</div>
    </div>
  );
}

export function KirkpatrickTab({ rows, workdayMode, roi }: Props) {
  const kpis = useMemo(() => computeKpis(rows, workdayMode), [rows, workdayMode]);
  const roiResult = useMemo(
    () => computeRoi(kpis.totalAnnualHours, roi),
    [kpis.totalAnnualHours, roi]
  );

  // Level 1: 反応 — 満足度(1-5)を0-100に換算
  const l1Score = pct(kpis.avgSatisfaction, 1, 5);

  // Level 2: 学習 — 理解度(1-5)を0-100に換算
  const l2Score = pct(kpis.avgComprehension, 1, 5);

  // Level 3: 行動 — 実践予定「はい」割合
  const l3Score = useMemo(() => {
    const answered = rows.filter((r) => r.would_apply != null);
    if (!answered.length) return null;
    const yes = answered.filter((r) => r.would_apply === "はい").length;
    return Math.round((yes / answered.length) * 100);
  }, [rows]);

  // Level 4: 結果 — 1人あたり年間節約時間 > 0 であればスコア化
  // 目安: 24h/年(=月2h)で50点、120h/年(=月10h)で100点 として線形補間
  const l4Score = useMemo(() => {
    if (!kpis.responseCount) return null;
    const avg = kpis.avgAnnualHoursPerPerson;
    if (avg <= 0) return 0;
    return Math.min(100, Math.round((avg / 120) * 100));
  }, [kpis]);

  const radarData = [
    { subject: "Level 1\n反応", score: l1Score ?? 0 },
    { subject: "Level 2\n学習", score: l2Score ?? 0 },
    { subject: "Level 3\n行動", score: l3Score ?? 0 },
    { subject: "Level 4\n結果", score: l4Score ?? 0 },
  ];

  // NPS補足
  const npsLabel = kpis.nps == null ? null : `NPS ${Math.round(kpis.nps)}`;

  if (!rows.length) {
    return <p className="muted">条件に合うデータがありません。</p>;
  }

  return (
    <div>
      {/* サマリーレーダー */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="chart-card-header">
          <div>
            <h3 style={{ margin: 0 }}>カークパトリックモデル 総合評価</h3>
            <p className="chart-caption" style={{ margin: "4px 0 0" }}>
              研修効果を4段階で可視化。各レベルを0〜100点に正規化したレーダーチャートです。
              スコアが高いほど講座の効果が高いことを示します。
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { label: "反応", score: l1Score },
              { label: "学習", score: l2Score },
              { label: "行動", score: l3Score },
              { label: "結果", score: l4Score },
            ].map(({ label, score }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: levelColor(score) }}>
                  {score ?? "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 12, fill: "var(--muted)" }}
            />
            <Radar
              dataKey="score"
              stroke="#2563eb"
              fill="#2563eb"
              fillOpacity={0.25}
            />
            <Tooltip formatter={(v: number) => [`${v} / 100`, "スコア"]} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 4段階カード */}
      <div className="kirk-grid">
        <LevelCard
          level={1}
          name="反応（Reaction）"
          description="受講者が研修にどう感じたか"
          dataLabel={`満足度平均 ${kpis.avgSatisfaction?.toFixed(1) ?? "—"} / 5${npsLabel ? `、${npsLabel}` : ""}`}
          score={l1Score}
          detail={`満足度平均 ${kpis.avgSatisfaction?.toFixed(1) ?? "—"} / 5 をもとにスコア化。5段階満足度を「1=0点・5=100点」に換算しています。${npsLabel ? `NPS: ${Math.round(kpis.nps!)}（-100〜+100）` : ""}`}
          guidance={
            l1Score == null
              ? "満足度データがありません。アンケートに満足度（1-5）を追加してください。"
              : l1Score >= 75
              ? "受講者の反応は良好です。この水準を維持しながら、学習効果の向上を目指しましょう。"
              : l1Score >= 50
              ? "満足度は標準的な水準です。講師の説明方法・演習量・資料品質を見直すと改善が期待できます。"
              : "満足度が低い傾向にあります。自由記述の頻出キーワードを参照し、具体的な不満点を特定してください。"
          }
        />

        <LevelCard
          level={2}
          name="学習（Learning）"
          description="知識・スキルがどれだけ身についたか"
          dataLabel={`理解度平均 ${kpis.avgComprehension?.toFixed(1) ?? "—"} / 5`}
          score={l2Score}
          detail={`理解度平均 ${kpis.avgComprehension?.toFixed(1) ?? "—"} / 5 をもとにスコア化。「1=0点・5=100点」に換算しています。`}
          guidance={
            l2Score == null
              ? "理解度データがありません。アンケートに理解度（1-5）を追加してください。"
              : l2Score >= 75
              ? "学習効果は高い水準です。内容の難易度・ペース配分が受講者に合っていると考えられます。"
              : l2Score >= 50
              ? "理解度は標準的です。難しかった部分のフォローアップ資料や事後演習が効果的です。"
              : "理解度が低い傾向にあります。難易度スコアと合わせて確認し、内容の簡素化や事前準備資料の提供を検討してください。"
          }
        />

        <LevelCard
          level={3}
          name="行動（Behavior）"
          description="学んだことを実務で実践しているか"
          dataLabel={`実践予定「はい」${l3Score ?? "—"}%`}
          score={l3Score}
          detail={
            (() => {
              const answered = rows.filter((r) => r.would_apply != null);
              const yes = answered.filter((r) => r.would_apply === "はい").length;
              const no = answered.filter((r) => r.would_apply === "いいえ").length;
              const dk = answered.filter((r) => r.would_apply === "わからない").length;
              return answered.length
                ? `実践予定の回答内訳: はい ${yes}件・いいえ ${no}件・わからない ${dk}件（合計 ${answered.length}件）`
                : "実践予定データがありません。";
            })()
          }
          guidance={
            l3Score == null
              ? "実践予定データがありません。アンケートに実践予定（はい/いいえ/わからない）を追加してください。"
              : l3Score >= 75
              ? "実践意欲は高い水準です。受講後のフォローアップ（1か月後調査）で実際の行動変容も測定できます。"
              : l3Score >= 50
              ? "実践を迷っている受講者が多い可能性があります。具体的な活用シーン・テンプレートを提供すると行動変容を後押しできます。"
              : "実践意欲が低い傾向にあります。講座内容と業務課題の結びつきを明確にすることが重要です。"
          }
        />

        <LevelCard
          level={4}
          name="結果（Results）"
          description="業務への定量的な成果・ROI"
          dataLabel={`1人あたり年間 ${Math.round(kpis.avgAnnualHoursPerPerson)} 時間削減${roiResult.roiPercent != null ? `、ROI ${Math.round(roiResult.roiPercent).toLocaleString("ja-JP")}%` : ""}`}
          score={l4Score}
          detail={
            `年間節約時間: 合計 ${Math.round(kpis.totalAnnualHours).toLocaleString("ja-JP")} 時間（1人あたり ${Math.round(kpis.avgAnnualHoursPerPerson)} 時間/年）。` +
            `コスト削減額: ${toYenUnit(roiResult.costSavings)}${roiResult.roiPercent != null ? `、ROI: ${Math.round(roiResult.roiPercent).toLocaleString("ja-JP")}%` : ""}。` +
            `スコアは1人あたり年間120時間削減を満点として算出。`
          }
          guidance={
            l4Score == null || l4Score === 0
              ? "節約時間データがありません。アンケートに節約時間・時間単位・用途を追加してください。"
              : l4Score >= 75
              ? "業務への定量的な効果は高い水準です。ROIをそのまま経営層への報告に活用できます。"
              : l4Score >= 50
              ? "一定の時間効率化効果があります。活用が進むにつれてスコアの向上が期待されます。受講後の継続的な活用促進施策を検討してください。"
              : "節約時間はまだ少ない傾向にあります。スキルの定着支援（演習・チェックリスト）や活用場面の明確化が有効です。"
          }
        />
      </div>
    </div>
  );
}

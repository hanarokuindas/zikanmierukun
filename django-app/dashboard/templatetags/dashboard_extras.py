from django import template

register = template.Library()


@register.filter
def jpnum(value):
    """3桁区切りの整数表記。nextjs-app/lib/format.ts の fmtHours と同じ表記。"""
    try:
        return f"{round(float(value)):,}"
    except (TypeError, ValueError):
        return "—"


@register.filter
def decimal1(value):
    if value is None:
        return "—"
    try:
        return f"{float(value):.1f}"
    except (TypeError, ValueError):
        return "—"


@register.filter
def persondays(hours):
    """大きな時間を人日/人年換算で補助表示する。"""
    try:
        h = float(hours)
    except (TypeError, ValueError):
        return ""
    days = h / 8
    if days >= 220:
        return f"約 {days / 220:.1f} 人年"
    return f"約 {round(days):,} 人日"


@register.filter
def scorepercent(value, max_score=5):
    """評価スコア（X / max）を達成率％に換算する。例: 4.0 / 5 → 80%。"""
    if value is None:
        return "—"
    try:
        return f"{round(float(value) / float(max_score) * 100)}%"
    except (TypeError, ValueError, ZeroDivisionError):
        return "—"


@register.filter
def yen(value):
    """円の3桁区切り表記。nextjs-app/lib/format.ts の fmtYen と同じ。"""
    try:
        return f"{round(float(value)):,}"
    except (TypeError, ValueError):
        return "—"


@register.filter
def yenunit(value):
    """円を万円/億円のざっくり表記に変換。fmtYen の toYenUnit と同じ。"""
    try:
        amount = float(value)
    except (TypeError, ValueError):
        return ""
    oku = amount / 100_000_000
    if abs(oku) >= 1:
        return f"約 {oku:.2f} 億円"
    man = amount / 10_000
    if abs(man) >= 1:
        return f"約 {man:.1f} 万円"
    return f"{round(amount):,} 円"


@register.filter
def isin(value, container):
    return value in container


@register.filter
def tagsize(count):
    """頻出キーワードタグの文字サイズ。nextjs-app の 12 + Math.min(count, 10) と同じ。"""
    try:
        return 12 + min(int(count), 10)
    except (TypeError, ValueError):
        return 12

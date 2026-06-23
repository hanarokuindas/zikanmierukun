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
def isin(value, container):
    return value in container


@register.filter
def tagsize(count):
    """頻出キーワードタグの文字サイズ。nextjs-app の 12 + Math.min(count, 10) と同じ。"""
    try:
        return 12 + min(int(count), 10)
    except (TypeError, ValueError):
        return 12

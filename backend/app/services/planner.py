"""Post planner: turns the wizard's schedule into post times.

Plain rules, no AI. Times are picked in Malaysia time (UTC+8, no daylight
saving) and returned in UTC.
"""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone

from app.schemas.campaigns import MAX_POSTS_PER_CAMPAIGN, ScheduleIn

MYT = timezone(timedelta(hours=8), "MYT")
WEEKDAYS = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")

# Launch sequence: day offset from the start date for each stage.
LAUNCH_OFFSETS = {"teaser": 0, "launch": 2, "reminder": 5, "last_chance": 7}

_STAGE_REASONS = {
    "teaser": "Teaser starts the week and gets people curious.",
    "launch": "Launch 2 days after the teaser, while people still remember it.",
    "reminder": "Reminder mid-week for people who missed the launch.",
    "last_chance": "Last call at the end of the week.",
}


class PlanError(ValueError):
    """The schedule can't be turned into posts (maps to 422)."""


@dataclass
class PlannedPost:
    platform: str
    stage: str | None
    scheduled_at: datetime  # UTC
    why_this_time: str


def today_myt(now: datetime) -> date:
    return now.astimezone(MYT).date()


def _parse_time(value: str) -> time:
    hour, minute = value.split(":")
    return time(int(hour), int(minute))


def _at(day: date, at: time) -> datetime:
    return datetime.combine(day, at, tzinfo=MYT).astimezone(timezone.utc)


def _time_reason(at: time) -> str:
    if 19 <= at.hour <= 22:
        return "Evenings after dinner are when most people scroll."
    if 11 <= at.hour <= 14:
        return "Lunch break is a busy time on social media."
    if 7 <= at.hour <= 9:
        return "Morning commute is a good time to be seen."
    return "This is the time you picked."


def _label(at: time) -> str:
    return datetime.combine(date.today(), at).strftime("%-I:%M %p")


def plan_posts(
    schedule: ScheduleIn, platforms: list[str], now: datetime
) -> list[PlannedPost]:
    """One post per platform per slot, sorted by time."""
    at = _parse_time(schedule.time)
    start = schedule.start_date or today_myt(now) + timedelta(days=1)

    slots: list[tuple[str | None, datetime, str]] = []
    if schedule.mode == "launch_sequence":
        for stage, offset in LAUNCH_OFFSETS.items():
            slots.append(
                (stage, _at(start + timedelta(days=offset), at),
                 f"{_STAGE_REASONS[stage]} {_time_reason(at)}")
            )
    elif schedule.mode == "weekly":
        days = [d for d in WEEKDAYS if d in schedule.days]
        why = f"Weekly post every {', '.join(days)} at {_label(at)}. {_time_reason(at)}"
        for offset in range(schedule.weeks * 7):
            day = start + timedelta(days=offset)
            when = _at(day, at)
            if WEEKDAYS[day.weekday()] in days and when > now:
                slots.append((None, when, why))
    else:
        times = [
            (s if s.tzinfo else s.replace(tzinfo=MYT)).astimezone(timezone.utc)
            for s in schedule.slots
        ]
        times += [_at(d, at) for d in schedule.dates]
        for when in sorted(set(times)):
            slots.append((None, when, "You picked this date and time."))

    if not slots:
        raise PlanError("schedule has no future post times")
    if len(slots) * len(platforms) > MAX_POSTS_PER_CAMPAIGN:
        raise PlanError(
            f"too many posts ({len(slots) * len(platforms)}); "
            f"keep it to {MAX_POSTS_PER_CAMPAIGN} or fewer"
        )

    posts = [
        PlannedPost(platform=p, stage=stage, scheduled_at=when, why_this_time=why)
        for stage, when, why in slots
        for p in platforms
    ]
    posts.sort(key=lambda p: p.scheduled_at)
    return posts


def describe_schedule(schedule: ScheduleIn, now: datetime) -> dict:
    """The schedule as stored on the campaign (start date filled in)."""
    start = schedule.start_date or today_myt(now) + timedelta(days=1)
    data = {"mode": schedule.mode, "time": schedule.time, "timezone": "Asia/Kuala_Lumpur"}
    if schedule.mode in ("launch_sequence", "weekly"):
        data["start_date"] = start.isoformat()
    if schedule.mode == "weekly":
        data |= {"days": list(schedule.days), "weeks": schedule.weeks}
    if schedule.mode == "custom":
        data["dates"] = [d.isoformat() for d in schedule.dates]
        data["slots"] = [s.isoformat() for s in schedule.slots]
    return data

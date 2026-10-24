from sqlalchemy.orm import Session

from app.models import ACTIVITY_ACTIONS, ActivityLog


def log_activity(
    db: Session,
    *,
    action: str,
    entity_type: str,
    entity_id: int | None,
    summary: str,
    actor: str,
    business_id: int | None = None,
    detail: dict | None = None,
) -> ActivityLog:
    if action not in ACTIVITY_ACTIONS:
        raise ValueError(f"Unknown activity action: {action}")
    entry = ActivityLog(
        business_id=business_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        summary=summary,
        detail=detail,
        actor=actor,
    )
    db.add(entry)
    return entry

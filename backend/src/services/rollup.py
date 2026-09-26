from __future__ import annotations

from collections import defaultdict
from datetime import UTC, date

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.config import settings
from models import Answer, AnswerMention, Competitor, MetricDaily, Prompt


def rollup_answers(
    db: Session,
    *,
    workspace_id: str,
    answer_ids: list[str] | None = None,
) -> list[MetricDaily]:
    query = (
        select(Answer, Prompt.category_id)
        .join(Prompt, Prompt.id == Answer.prompt_id)
        .where(Answer.workspace_id == workspace_id)
    )
    if answer_ids:
        query = query.where(Answer.id.in_(answer_ids))

    rows = db.execute(query).all()
    groups: dict[tuple[date, str, str | None], list[Answer]] = defaultdict(list)
    category_by_answer: dict[str, str | None] = {}
    for answer, category_id in rows:
        created = answer.created_at
        day = created.astimezone(UTC).date() if created.tzinfo else created.date()
        groups[(day, answer.model_id, category_id)].append(answer)
        category_by_answer[answer.id] = category_id

    metrics: list[MetricDaily] = []
    for (day, model_id, category_id), answers in groups.items():
        sample_size = len(answers)
        brand_mentions = sum(1 for answer in answers if answer.outcome != "absent")
        recommendations = sum(1 for answer in answers if answer.outcome == "recommended")
        metrics.append(
            _upsert_metric(
                db,
                workspace_id=workspace_id,
                day=day,
                metric_key="inclusion_rate",
                model_id=model_id,
                category_id=category_id,
                competitor_id=None,
                value=brand_mentions / sample_size,
                sample_size=sample_size,
            )
        )
        metrics.append(
            _upsert_metric(
                db,
                workspace_id=workspace_id,
                day=day,
                metric_key="recommendation_share",
                model_id=model_id,
                category_id=category_id,
                competitor_id=None,
                value=recommendations / sample_size,
                sample_size=sample_size,
            )
        )

    if answer_ids:
        mention_rows = db.execute(
            select(AnswerMention, Answer)
            .join(Answer, Answer.id == AnswerMention.answer_id)
            .where(Answer.workspace_id == workspace_id, Answer.id.in_(answer_ids))
        ).all()
        competitor_groups: dict[tuple[date, str, str | None, str], list[bool]] = defaultdict(list)
        for mention, answer in mention_rows:
            created = answer.created_at
            day = created.astimezone(UTC).date() if created.tzinfo else created.date()
            competitor_groups[
                (day, answer.model_id, category_by_answer.get(answer.id), mention.competitor_id)
            ].append(mention.mentioned)

        for (day, model_id, category_id, competitor_id), values in competitor_groups.items():
            metrics.append(
                _upsert_metric(
                    db,
                    workspace_id=workspace_id,
                    day=day,
                    metric_key="inclusion_rate",
                    model_id=model_id,
                    category_id=category_id,
                    competitor_id=competitor_id,
                    value=sum(1 for value in values if value) / len(values),
                    sample_size=len(values),
                )
            )

        # Share of voice: brand vs. named competitors, aggregated across models/
        # categories so competitors_overview can read one value per entity per day.
        brand_row = db.scalar(
            select(Competitor).where(
                Competitor.workspace_id == workspace_id,
                Competitor.is_brand.is_(True),
            )
        )
        brand_counts: dict[date, int] = defaultdict(int)
        for answer, _category_id in rows:
            created = answer.created_at
            day = created.astimezone(UTC).date() if created.tzinfo else created.date()
            if answer.outcome != "absent":
                brand_counts[day] += 1

        competitor_day_counts: dict[date, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        for mention, answer in mention_rows:
            if not mention.mentioned:
                continue
            created = answer.created_at
            day = created.astimezone(UTC).date() if created.tzinfo else created.date()
            competitor_day_counts[day][mention.competitor_id] += 1

        for day in set(brand_counts) | set(competitor_day_counts):
            comp_counts = competitor_day_counts.get(day, {})
            total = brand_counts.get(day, 0) + sum(comp_counts.values())
            if total <= 0:
                continue
            if brand_row is not None:
                metrics.append(
                    _upsert_metric(
                        db,
                        workspace_id=workspace_id,
                        day=day,
                        metric_key="share_of_voice",
                        model_id=None,
                        category_id=None,
                        competitor_id=brand_row.id,
                        value=brand_counts.get(day, 0) / total,
                        sample_size=total,
                    )
                )
            for competitor_id, count in comp_counts.items():
                metrics.append(
                    _upsert_metric(
                        db,
                        workspace_id=workspace_id,
                        day=day,
                        metric_key="share_of_voice",
                        model_id=None,
                        category_id=None,
                        competitor_id=competitor_id,
                        value=count / total,
                        sample_size=total,
                    )
                )

    return metrics


def _upsert_metric(
    db: Session,
    *,
    workspace_id: str,
    day: date,
    metric_key: str,
    model_id: str | None,
    category_id: str | None,
    competitor_id: str | None,
    value: float,
    sample_size: int,
) -> MetricDaily:
    row = (
        db.query(MetricDaily)
        .filter(
            MetricDaily.workspace_id == workspace_id,
            MetricDaily.date == day,
            MetricDaily.metric_key == metric_key,
            MetricDaily.model_id.is_(None) if model_id is None else MetricDaily.model_id == model_id,
            MetricDaily.category_id.is_(None)
            if category_id is None
            else MetricDaily.category_id == category_id,
            MetricDaily.competitor_id.is_(None)
            if competitor_id is None
            else MetricDaily.competitor_id == competitor_id,
        )
        .one_or_none()
    )
    if row is None:
        row = MetricDaily(
            workspace_id=workspace_id,
            date=day,
            metric_key=metric_key,
            model_id=model_id,
            category_id=category_id,
            competitor_id=competitor_id,
            value=value,
            sample_size=sample_size,
            parser_version=settings.PARSER_VERSION,
        )
        db.add(row)
    else:
        row.value = value
        row.sample_size = sample_size
        row.parser_version = settings.PARSER_VERSION
    return row

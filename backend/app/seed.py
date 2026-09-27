from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from .models import NodeStatus, NodeType, ResultRow, Task, TaskStatus, WorkflowEdge, WorkflowNode


def seed_demo_data(db: Session) -> None:
    # Check if demo tasks already exist
    existing = db.query(Task).filter(Task.prompt.like("Find 15 companies that sponsor student hackathons%")).first()
    if existing:
        return

    now = datetime.utcnow()

    # --- Demo Task 1: Fintech Sponsors ---
    t1 = Task(
        prompt="Find 15 companies that sponsor student hackathons in fintech",
        status=TaskStatus.DONE,
        created_at=now - timedelta(hours=2),
    )
    db.add(t1)
    db.flush()

    n1_1 = WorkflowNode(
        task_id=t1.id,
        type=NodeType.SOURCE,
        label="Search: fintech hackathon sponsors",
        config_json={
            "connector": "web_search",
            "queries": [
                "fintech hackathon sponsors 2025 2026",
                "companies sponsoring student fintech hackathons",
            ],
        },
        status=NodeStatus.DONE,
        position_x=0.0,
        position_y=0.0,
        started_at=now - timedelta(hours=2, seconds=45),
        completed_at=now - timedelta(hours=2, seconds=40),
    )
    n1_2 = WorkflowNode(
        task_id=t1.id,
        type=NodeType.FETCH,
        label="Fetch top result pages",
        config_json={"max_urls_per_query": 8},
        status=NodeStatus.DONE,
        position_x=220.0,
        position_y=0.0,
        started_at=now - timedelta(hours=2, seconds=40),
        completed_at=now - timedelta(hours=2, seconds=30),
    )
    n1_3 = WorkflowNode(
        task_id=t1.id,
        type=NodeType.EXTRACT,
        label="Extract sponsor details",
        config_json={"fields": ["company_name", "website", "why_relevant", "contact_hint"]},
        status=NodeStatus.DONE,
        position_x=440.0,
        position_y=0.0,
        started_at=now - timedelta(hours=2, seconds=30),
        completed_at=now - timedelta(hours=2, seconds=20),
    )
    n1_4 = WorkflowNode(
        task_id=t1.id,
        type=NodeType.CLEAN,
        label="Normalize + dedupe by domain",
        config_json={"dedupe_on": ["company_name", "website"], "threshold": 0.85},
        status=NodeStatus.DONE,
        position_x=660.0,
        position_y=0.0,
        started_at=now - timedelta(hours=2, seconds=20),
        completed_at=now - timedelta(hours=2, seconds=15),
    )
    n1_5 = WorkflowNode(
        task_id=t1.id,
        type=NodeType.VALIDATE,
        label="Flag incomplete rows",
        config_json={"required_fields": ["company_name", "website"]},
        status=NodeStatus.DONE,
        position_x=880.0,
        position_y=0.0,
        started_at=now - timedelta(hours=2, seconds=15),
        completed_at=now - timedelta(hours=2, seconds=10),
    )
    n1_6 = WorkflowNode(
        task_id=t1.id,
        type=NodeType.OUTPUT,
        label="Sponsor leads dataset",
        config_json={},
        status=NodeStatus.DONE,
        position_x=1100.0,
        position_y=0.0,
        started_at=now - timedelta(hours=2, seconds=10),
        completed_at=now - timedelta(hours=2),
    )

    t1_nodes = [n1_1, n1_2, n1_3, n1_4, n1_5, n1_6]
    db.add_all(t1_nodes)
    db.flush()

    for idx in range(len(t1_nodes) - 1):
        db.add(
            WorkflowEdge(
                task_id=t1.id,
                from_node_id=t1_nodes[idx].id,
                to_node_id=t1_nodes[idx + 1].id,
            )
        )

    db.add_all([
        ResultRow(
            task_id=t1.id,
            fields_json={
                "company_name": "Stripe",
                "website": "https://stripe.com",
                "why_relevant": "Maintains dedicated university developer sponsorship budget and student hackathon mentorship pool.",
                "contact_hint": "community@stripe.com",
            },
            source_url="https://stripe.com/community/hackathons",
            confidence=0.96,
            needs_review=False,
            created_at=now - timedelta(hours=2),
        ),
        ResultRow(
            task_id=t1.id,
            fields_json={
                "company_name": "Plaid",
                "website": "https://plaid.com",
                "why_relevant": "Provides student API access credits and prize bounties for financial infrastructure hacks.",
                "contact_hint": "partnerships@plaid.com",
            },
            source_url="https://plaid.com/community/students",
            confidence=0.92,
            needs_review=False,
            created_at=now - timedelta(hours=2),
        ),
        ResultRow(
            task_id=t1.id,
            fields_json={
                "company_name": "Brex",
                "website": "https://brex.com",
                "why_relevant": "Sponsors tier-1 collegiate hackathons across North America with cash prize tracks.",
                "contact_hint": "university-relations@brex.com",
            },
            source_url="https://brex.com/careers/university",
            confidence=0.88,
            needs_review=False,
            created_at=now - timedelta(hours=2),
        ),
        ResultRow(
            task_id=t1.id,
            fields_json={
                "company_name": "Robinhood",
                "website": "https://robinhood.com",
                "why_relevant": "Actively participates as track sponsor for retail investment and crypto hackathons.",
                "contact_hint": "recruiting@robinhood.com",
            },
            source_url="https://robinhood.com/us/en/support",
            confidence=0.85,
            needs_review=False,
            created_at=now - timedelta(hours=2),
        ),
    ])

    # --- Demo Task 2: Remote DevOps Jobs ---
    t2 = Task(
        prompt="Collect open remote DevOps job listings posted this week with salary if available",
        status=TaskStatus.DONE,
        created_at=now - timedelta(hours=1),
    )
    db.add(t2)
    db.flush()

    n2_1 = WorkflowNode(
        task_id=t2.id,
        type=NodeType.SOURCE,
        label="RemoteOK: DevOps listings",
        config_json={"connector": "remoteok", "tags": ["devops"]},
        status=NodeStatus.DONE,
        position_x=0.0,
        position_y=0.0,
        started_at=now - timedelta(hours=1, seconds=45),
        completed_at=now - timedelta(hours=1, seconds=40),
    )
    n2_2 = WorkflowNode(
        task_id=t2.id,
        type=NodeType.FETCH,
        label="Fetch listing details",
        config_json={},
        status=NodeStatus.DONE,
        position_x=220.0,
        position_y=0.0,
        started_at=now - timedelta(hours=1, seconds=40),
        completed_at=now - timedelta(hours=1, seconds=30),
    )
    n2_3 = WorkflowNode(
        task_id=t2.id,
        type=NodeType.EXTRACT,
        label="Extract job fields",
        config_json={"fields": ["job_title", "company_name", "salary", "location", "posted_date"]},
        status=NodeStatus.DONE,
        position_x=440.0,
        position_y=0.0,
        started_at=now - timedelta(hours=1, seconds=30),
        completed_at=now - timedelta(hours=1, seconds=20),
    )
    n2_4 = WorkflowNode(
        task_id=t2.id,
        type=NodeType.CLEAN,
        label="Filter to last 7 days, normalize salary",
        config_json={"date_field": "posted_date", "max_age_days": 7},
        status=NodeStatus.DONE,
        position_x=660.0,
        position_y=0.0,
        started_at=now - timedelta(hours=1, seconds=20),
        completed_at=now - timedelta(hours=1, seconds=15),
    )
    n2_5 = WorkflowNode(
        task_id=t2.id,
        type=NodeType.VALIDATE,
        label="Flag listings missing salary",
        config_json={"required_fields": ["job_title", "company_name", "salary"]},
        status=NodeStatus.DONE,
        position_x=880.0,
        position_y=0.0,
        started_at=now - timedelta(hours=1, seconds=15),
        completed_at=now - timedelta(hours=1, seconds=10),
    )
    n2_6 = WorkflowNode(
        task_id=t2.id,
        type=NodeType.OUTPUT,
        label="DevOps job listings dataset",
        config_json={},
        status=NodeStatus.DONE,
        position_x=1100.0,
        position_y=0.0,
        started_at=now - timedelta(hours=1, seconds=10),
        completed_at=now - timedelta(hours=1),
    )

    t2_nodes = [n2_1, n2_2, n2_3, n2_4, n2_5, n2_6]
    db.add_all(t2_nodes)
    db.flush()

    for idx in range(len(t2_nodes) - 1):
        db.add(
            WorkflowEdge(
                task_id=t2.id,
                from_node_id=t2_nodes[idx].id,
                to_node_id=t2_nodes[idx + 1].id,
            )
        )

    db.add_all([
        ResultRow(
            task_id=t2.id,
            fields_json={
                "job_title": "Senior Platform Engineer",
                "company_name": "GitLab",
                "salary": "$140,000 - $180,000",
                "location": "Remote (Global)",
                "posted_date": "2026-09-25",
            },
            source_url="https://remoteok.com/remote-jobs/senior-platform-engineer-gitlab",
            confidence=0.95,
            needs_review=False,
            created_at=now - timedelta(hours=1),
        ),
        ResultRow(
            task_id=t2.id,
            fields_json={
                "job_title": "Site Reliability Engineer",
                "company_name": "Automattic",
                "salary": "$135,000 - $170,000",
                "location": "Remote (US/Americas)",
                "posted_date": "2026-09-26",
            },
            source_url="https://remoteok.com/remote-jobs/sre-automattic",
            confidence=0.91,
            needs_review=False,
            created_at=now - timedelta(hours=1),
        ),
        ResultRow(
            task_id=t2.id,
            fields_json={
                "job_title": "Kubernetes Infrastructure Specialist",
                "company_name": "Supabase",
                "salary": "$150,000 - $190,000",
                "location": "Remote (Worldwide)",
                "posted_date": "2026-09-24",
            },
            source_url="https://remoteok.com/remote-jobs/kubernetes-specialist-supabase",
            confidence=0.90,
            needs_review=False,
            created_at=now - timedelta(hours=1),
        ),
        ResultRow(
            task_id=t2.id,
            fields_json={
                "job_title": "Junior DevOps Analyst",
                "company_name": "CloudOps Solutions",
                "salary": "",  # Missing salary -> flagged needs_review
                "location": "Remote",
                "posted_date": "2026-09-26",
            },
            source_url="https://remoteok.com/remote-jobs/junior-devops-analyst",
            confidence=0.68,
            needs_review=True,
            created_at=now - timedelta(hours=1),
        ),
    ])

    db.commit()

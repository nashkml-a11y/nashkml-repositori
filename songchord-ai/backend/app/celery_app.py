from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery("songchord", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_track_started=True,
    worker_send_task_events=True,
)

# `autodiscover_tasks` only looks for a submodule literally named `tasks.py`
# inside each listed package (Django-app convention); our task lives in
# `app/tasks/pipeline.py`, so it was never actually registered with the
# worker. Import it directly instead -- the @celery_app.task decorator in
# that module registers "analyze_song" as a side effect of the import.
import app.tasks.pipeline  # noqa: E402,F401

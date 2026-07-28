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
celery_app.autodiscover_tasks(["app.tasks"])

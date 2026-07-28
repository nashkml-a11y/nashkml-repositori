import os
import tempfile

_TEST_DB_PATH = os.path.join(tempfile.gettempdir(), "songchord_test.db")
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_TEST_DB_PATH}")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("OPENAI_API_KEY", "")

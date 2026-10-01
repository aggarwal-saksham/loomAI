import sys
from pathlib import Path

# Add repository root and backend directory to sys.path
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"

for path in [str(root_dir), str(backend_dir)]:
    if path not in sys.path:
        sys.path.insert(0, path)

from backend.app.main import app

# Export app for Vercel ASGI serverless handler
__all__ = ["app"]

from .auth import router as auth_router
from .components import router as components_router
from .transactions import router as transactions_router
from .chat import router as chat_router
from .dashboard import router as dashboard_router
from .kiosk import router as kiosk_router

__all__ = [
    "auth_router",
    "components_router",
    "transactions_router",
    "chat_router",
    "dashboard_router",
    "kiosk_router"
]

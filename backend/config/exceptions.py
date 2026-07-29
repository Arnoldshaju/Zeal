import logging

from rest_framework.views import exception_handler


logger = logging.getLogger(__name__)


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        logger.exception(
            "Unhandled API exception in %s",
            context.get("view"),
            exc_info=exc,
        )
        return None
    if isinstance(response.data, dict):
        response.data = {
            **response.data,
            "status_code": response.status_code,
        }
    return response

import os

from app.config import Settings


class UploadValidationError(ValueError):
    pass


def validate_upload(
    filename: str,
    content_type: str | None,
    size_bytes: int,
    settings: Settings,
) -> None:
    if not filename:
        raise UploadValidationError("El archivo no tiene nombre.")

    ext = os.path.splitext(filename)[1].lower()
    if ext not in settings.allowed_extensions:
        raise UploadValidationError(
            f"Formato no soportado: '{ext}'. Formatos permitidos: "
            f"{', '.join(settings.allowed_extensions)}."
        )

    if content_type and content_type not in settings.allowed_mime_types:
        raise UploadValidationError(
            f"Tipo MIME no soportado: '{content_type}'."
        )

    if size_bytes <= 0:
        raise UploadValidationError("El archivo está vacío.")

    if size_bytes > settings.max_upload_bytes:
        max_mb = settings.max_upload_bytes / (1024 * 1024)
        raise UploadValidationError(
            f"El archivo supera el tamaño máximo permitido ({max_mb:.0f} MB)."
        )

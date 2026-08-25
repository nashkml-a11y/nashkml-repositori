-- Foto opcional del objeto, como data URL base64 (JPEG comprimido en el
-- cliente a un ancho pequeño antes de subir, así que ocupa poco).
ALTER TABLE items ADD COLUMN photo TEXT;

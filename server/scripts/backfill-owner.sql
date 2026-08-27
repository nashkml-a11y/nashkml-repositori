-- Backfill de datos previos a la Fase 1 (multiusuario).
--
-- Uso:
-- 1. Regístrate primero en la app con tu email real (POST /api/auth/register,
--    o desde la pantalla de "Crear cuenta" del frontend).
-- 2. Sustituye REPLACE_WITH_YOUR_EMAIL por ese mismo email exacto.
-- 3. Pega este script en la Console de D1 (dashboard de Cloudflare, tu base
--    de datos → pestaña Console) y ejecútalo.
--
-- Es idempotente a propósito: el "WHERE user_id IS NULL" hace que ejecutarlo
-- dos veces no cambie nada la segunda vez (ya no quedará ninguna fila NULL).
-- Si el email no coincide con ningún usuario registrado, las tres UPDATE no
-- tocan ninguna fila (no falla, simplemente no hacen nada).

UPDATE locations
SET user_id = (SELECT id FROM users WHERE email = 'REPLACE_WITH_YOUR_EMAIL')
WHERE user_id IS NULL;

UPDATE items
SET user_id = (SELECT id FROM users WHERE email = 'REPLACE_WITH_YOUR_EMAIL')
WHERE user_id IS NULL;

UPDATE item_movements
SET user_id = (SELECT id FROM users WHERE email = 'REPLACE_WITH_YOUR_EMAIL')
WHERE user_id IS NULL;

-- Comprobación: debería devolver 0 filas en las tres si el backfill fue bien.
SELECT 'locations' as tabla, COUNT(*) as huerfanas FROM locations WHERE user_id IS NULL
UNION ALL
SELECT 'items', COUNT(*) FROM items WHERE user_id IS NULL
UNION ALL
SELECT 'item_movements', COUNT(*) FROM item_movements WHERE user_id IS NULL;

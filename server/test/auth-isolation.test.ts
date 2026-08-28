import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";

interface AuthResponse {
  token: string;
  user: { id: string; email: string; display_name: string | null };
}

const VALID_CODE = "test-registration-code";

async function register(email: string, password: string): Promise<AuthResponse> {
  const res = await SELF.fetch("https://example.com/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, code: VALID_CODE }),
  });
  expect(res.status).toBe(201);
  return res.json();
}

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

describe("registro y login", () => {
  it("rechaza un email duplicado", async () => {
    await register("dup@isolation-test.com", "password123");
    const res = await SELF.fetch("https://example.com/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dup@isolation-test.com", password: "otra12345", code: VALID_CODE }),
    });
    expect(res.status).toBe(409);
  });

  it("rechaza el registro sin código de invitación válido", async () => {
    const res = await SELF.fetch("https://example.com/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "sincodigo@isolation-test.com",
        password: "password123",
        code: "codigo-incorrecto",
      }),
    });
    expect(res.status).toBe(403);
  });

  it("rechaza una contraseña incorrecta", async () => {
    await register("wrongpass@isolation-test.com", "password123");
    const res = await SELF.fetch("https://example.com/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "wrongpass@isolation-test.com", password: "incorrecta" }),
    });
    expect(res.status).toBe(401);
  });

  it("acepta credenciales correctas y /me devuelve el usuario", async () => {
    const { token, user } = await register("me@isolation-test.com", "password123");
    const res = await SELF.fetch("https://example.com/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; email: string };
    expect(body.id).toBe(user.id);
    expect(body.email).toBe("me@isolation-test.com");
  });

  it("no deja usar la API sin token", async () => {
    const res = await SELF.fetch("https://example.com/api/locations");
    expect(res.status).toBe(401);
  });
});

describe("aislamiento de datos entre usuarios", () => {
  it("un usuario no ve las ubicaciones ni objetos de otro", async () => {
    const a = await register("a@isolation-test.com", "password123");
    const b = await register("b@isolation-test.com", "password456");

    const createLoc = await SELF.fetch("https://example.com/api/locations", {
      method: "POST",
      headers: authHeaders(a.token),
      body: JSON.stringify({ name: "Baúl de A" }),
    });
    expect(createLoc.status).toBe(201);

    const bLocations = (await (
      await SELF.fetch("https://example.com/api/locations", { headers: authHeaders(b.token) })
    ).json()) as unknown[];
    expect(bLocations).toEqual([]);

    const createItem = await SELF.fetch("https://example.com/api/items", {
      method: "POST",
      headers: authHeaders(a.token),
      body: JSON.stringify({ name: "Objeto de A", location_name: "Baúl de A" }),
    });
    expect(createItem.status).toBe(201);

    const bItems = (await (
      await SELF.fetch("https://example.com/api/items", { headers: authHeaders(b.token) })
    ).json()) as unknown[];
    expect(bItems).toEqual([]);
  });

  it("no deja acceder a un item_id ajeno directamente por URL", async () => {
    const owner = await register("owner-item@isolation-test.com", "password123");
    const intruder = await register("intruder-item@isolation-test.com", "password456");

    await SELF.fetch("https://example.com/api/locations", {
      method: "POST",
      headers: authHeaders(owner.token),
      body: JSON.stringify({ name: "Cajón privado" }),
    });
    const createItem = await SELF.fetch("https://example.com/api/items", {
      method: "POST",
      headers: authHeaders(owner.token),
      body: JSON.stringify({ name: "Objeto privado", location_name: "Cajón privado" }),
    });
    const item = (await createItem.json()) as { id: number };

    // Ver por búsqueda directa (GET /api/search/item/:id)
    const intruderGet = await SELF.fetch(`https://example.com/api/search/item/${item.id}`, {
      headers: authHeaders(intruder.token),
    });
    expect(intruderGet.status).toBe(404);

    // Borrar
    const intruderDelete = await SELF.fetch(`https://example.com/api/items/${item.id}`, {
      method: "DELETE",
      headers: authHeaders(intruder.token),
    });
    expect(intruderDelete.status).toBe(404);

    // Ver historial de movimientos
    const intruderMovements = await SELF.fetch(`https://example.com/api/items/${item.id}/movements`, {
      headers: authHeaders(intruder.token),
    });
    expect(intruderMovements.status).toBe(404);

    // El dueño real sigue pudiendo verlo y borrarlo
    const ownerGet = await SELF.fetch(`https://example.com/api/search/item/${item.id}`, {
      headers: authHeaders(owner.token),
    });
    expect(ownerGet.status).toBe(200);
  });

  it("no deja editar ni borrar una ubicación ajena", async () => {
    const owner = await register("owner-loc@isolation-test.com", "password123");
    const intruder = await register("intruder-loc@isolation-test.com", "password456");

    const created = (await (
      await SELF.fetch("https://example.com/api/locations", {
        method: "POST",
        headers: authHeaders(owner.token),
        body: JSON.stringify({ name: "Estantería ajena" }),
      })
    ).json()) as { id: number };

    const intruderUpdate = await SELF.fetch(`https://example.com/api/locations/${created.id}`, {
      method: "PUT",
      headers: authHeaders(intruder.token),
      body: JSON.stringify({ name: "Renombrada por el intruso" }),
    });
    expect(intruderUpdate.status).toBe(404);

    const intruderDelete = await SELF.fetch(`https://example.com/api/locations/${created.id}`, {
      method: "DELETE",
      headers: authHeaders(intruder.token),
    });
    expect(intruderDelete.status).toBe(404);

    // Sigue existiendo con su nombre original para el dueño
    const ownerItems = (await (
      await SELF.fetch(`https://example.com/api/locations/${created.id}/items`, {
        headers: authHeaders(owner.token),
      })
    ).json()) as unknown[];
    expect(ownerItems).toEqual([]);
  });

  it("no deja mover un objeto ajeno a una ubicación propia", async () => {
    const owner = await register("owner-move@isolation-test.com", "password123");
    const intruder = await register("intruder-move@isolation-test.com", "password456");

    await SELF.fetch("https://example.com/api/locations", {
      method: "POST",
      headers: authHeaders(owner.token),
      body: JSON.stringify({ name: "Ubicación original" }),
    });
    const item = (await (
      await SELF.fetch("https://example.com/api/items", {
        method: "POST",
        headers: authHeaders(owner.token),
        body: JSON.stringify({ name: "Objeto a robar", location_name: "Ubicación original" }),
      })
    ).json()) as { id: number };

    await SELF.fetch("https://example.com/api/locations", {
      method: "POST",
      headers: authHeaders(intruder.token),
      body: JSON.stringify({ name: "Ubicación del intruso" }),
    });

    const stealAttempt = await SELF.fetch("https://example.com/api/items", {
      method: "POST",
      headers: authHeaders(intruder.token),
      body: JSON.stringify({
        name: "Objeto a robar",
        location_name: "Ubicación del intruso",
        existing_item_id: item.id,
        is_location_update: true,
      }),
    });
    // El intruso no ve item.id como suyo (items.get está filtrado por
    // user_id), así que la actualización debe fallar en vez de "robar" el
    // objeto a la ubicación del intruso.
    expect(stealAttempt.status).toBe(404);
  });
});

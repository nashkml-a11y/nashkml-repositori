import { Hono } from "hono";
import { z } from "zod";
import type { Env, Variables } from "../types.js";
import { createToken, verifyToken } from "../auth.js";
import { hashPassword, verifyPassword } from "../password.js";
import { createUsersRepository } from "../users.js";
import { timingSafeEqual } from "../crypto-utils.js";

export const authRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

function publicUser(user: { id: string; email: string; display_name: string | null }) {
  return { id: user.id, email: user.email, display_name: user.display_name };
}

const RegisterBody = z.object({
  email: z.string().email("Email no válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  display_name: z.string().min(1).nullable().optional(),
  code: z.string().min(1, "Falta el código de invitación"),
});

authRouter.post("/register", async (c) => {
  const parsed = RegisterBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, 400);
  }
  if (!timingSafeEqual(parsed.data.code, c.env.REGISTRATION_CODE)) {
    return c.json({ error: "Código de invitación incorrecto" }, 403);
  }
  const users = createUsersRepository(c.env.DB);
  const email = parsed.data.email.toLowerCase();
  if (await users.findByEmail(email)) {
    return c.json({ error: "Ya existe una cuenta con ese email" }, 409);
  }
  const passwordHash = await hashPassword(parsed.data.password);
  const user = await users.create({
    email,
    passwordHash,
    displayName: parsed.data.display_name ?? null,
  });
  const token = await createToken(c.env.AUTH_SECRET, user.id);
  return c.json({ token, user: publicUser(user) }, 201);
});

const LoginBody = z.object({ email: z.string().email(), password: z.string().min(1) });

authRouter.post("/login", async (c) => {
  const parsed = LoginBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Email y contraseña son obligatorios" }, 400);
  }
  const users = createUsersRepository(c.env.DB);
  const user = await users.findByEmail(parsed.data.email.toLowerCase());
  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
    return c.json({ error: "Email o contraseña incorrectos" }, 401);
  }
  const token = await createToken(c.env.AUTH_SECRET, user.id);
  return c.json({ token, user: publicUser(user) });
});

authRouter.post("/logout", (c) => {
  // El token es autocontenido y sin estado en servidor: "cerrar sesión" es
  // que el cliente lo borre. Este endpoint existe para que el frontend
  // tenga un sitio claro al que llamar, no porque haga falta invalidar
  // nada aquí.
  return c.json({ ok: true });
});

authRouter.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const verified = await verifyToken(c.env.AUTH_SECRET, token);
  if (!verified) {
    return c.json({ error: "No autenticado" }, 401);
  }
  const users = createUsersRepository(c.env.DB);
  const user = await users.get(verified.userId);
  if (!user) {
    return c.json({ error: "No autenticado" }, 401);
  }
  return c.json(publicUser(user));
});

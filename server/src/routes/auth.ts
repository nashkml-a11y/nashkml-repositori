import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../types.js";
import { createToken, timingSafeEqual } from "../auth.js";

export const authRouter = new Hono<{ Bindings: Env }>();

const LoginBody = z.object({ password: z.string().min(1) });

authRouter.post("/login", async (c) => {
  const parsed = LoginBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Falta la contraseña" }, 400);
  }
  if (!timingSafeEqual(parsed.data.password, c.env.APP_PASSWORD)) {
    return c.json({ error: "Contraseña incorrecta" }, 401);
  }
  const token = await createToken(c.env.AUTH_SECRET);
  return c.json({ token });
});

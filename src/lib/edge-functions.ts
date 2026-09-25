/** Mensaje real que devolvió una Edge Function: ante un status no-2xx, supabase-js solo expone
 * "Edge Function returned a non-2xx status code" y el cuerpo queda en `error.context`. */
export async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: Response } | null)?.context;
  if (context && typeof context.json === "function") {
    const body = await context.json().catch(() => null);
    if (body?.error && typeof body.error === "string") return body.error;
  }
  return fallback;
}

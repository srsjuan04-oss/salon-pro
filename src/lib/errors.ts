import { toast } from "sonner";

const DEFAULT_FALLBACK = "Ocurrió un error inesperado. Intenta de nuevo.";

// Códigos de Postgres/PostgREST cuyo texto crudo no es apto para mostrar
// al usuario final (referencian nombres de tabla/columna internos).
// Referencia: https://www.postgresql.org/docs/current/errcodes-appendix.html
const POSTGRES_ERROR_MESSAGES: Record<string, string> = {
  "23505": "Ya existe un registro con esos datos.",
  "23503": "No se puede completar la operación: hay datos relacionados que lo impiden.",
  "23502": "Falta completar un campo requerido.",
  "42501": "No tienes permisos para realizar esta acción.",
  PGRST301: "No tienes permisos para realizar esta acción.",
};

interface PostgrestErrorLike {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

interface EdgeFunctionErrorLike {
  context?: { json?: () => Promise<unknown> };
  message?: string;
}

function isPostgrestError(error: unknown): error is PostgrestErrorLike {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    "details" in error
  );
}

function isEdgeFunctionError(error: unknown): error is EdgeFunctionErrorLike {
  return typeof error === "object" && error !== null && "context" in error;
}

/**
 * Convierte cualquier error capturado (Postgrest, Supabase Edge Function,
 * Error nativo, string) en un mensaje seguro y legible en español.
 *
 * Las Edge Functions invocadas con supabase.functions.invoke() devuelven un
 * error.message genérico ("Edge Function returned a non-2xx status code")
 * cuando el status no es 2xx; el cuerpo real ({ error: "..." }) sigue
 * disponible en error.context (el Response), por eso hay que leerlo aparte.
 */
export async function getErrorMessage(error: unknown, fallback = DEFAULT_FALLBACK): Promise<string> {
  if (isEdgeFunctionError(error)) {
    const body = (await error.context?.json?.().catch(() => null)) as { error?: string } | null;
    if (body?.error) return body.error;
    if (error.message && !/non-2xx/i.test(error.message)) return error.message;
    return fallback;
  }

  if (isPostgrestError(error)) {
    if (error.code && POSTGRES_ERROR_MESSAGES[error.code]) {
      return POSTGRES_ERROR_MESSAGES[error.code];
    }
    return error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

/**
 * Registra el error en consola (para debugging) y muestra un toast con un
 * mensaje seguro. Punto único de manejo de errores async de la app —
 * reemplaza los `toast.error(error.message)` / try-catch ad hoc dispersos
 * en páginas y componentes.
 */
export async function reportError(error: unknown, fallback = DEFAULT_FALLBACK): Promise<string> {
  const message = await getErrorMessage(error, fallback);
  console.error(error);
  toast.error(message);
  return message;
}

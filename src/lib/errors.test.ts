import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { getErrorMessage, reportError } from "./errors";

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockRestore();
});

describe("getErrorMessage", () => {
  it("returns the fallback for an empty/unknown error", () => {
    return getErrorMessage(null).then((msg) =>
      expect(msg).toBe("Ocurrió un error inesperado. Intenta de nuevo.")
    );
  });

  it("returns a custom fallback when provided", async () => {
    expect(await getErrorMessage(undefined, "Mensaje custom")).toBe("Mensaje custom");
  });

  it("returns a plain string error as-is", async () => {
    expect(await getErrorMessage("Algo salió mal")).toBe("Algo salió mal");
  });

  it("returns a native Error's message", async () => {
    expect(await getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("maps a known Postgres error code to a friendly message", async () => {
    const pgError = { code: "23505", message: 'duplicate key value violates unique constraint "customers_email_key"', details: null };
    expect(await getErrorMessage(pgError)).toBe("Ya existe un registro con esos datos.");
  });

  it("maps an RLS permission error code to a friendly message", async () => {
    const pgError = { code: "42501", message: "new row violates row-level security policy", details: null };
    expect(await getErrorMessage(pgError)).toBe("No tienes permisos para realizar esta acción.");
  });

  it("falls back to the raw message for an unmapped Postgres error code", async () => {
    const pgError = { code: "99999", message: "unmapped db error", details: null };
    expect(await getErrorMessage(pgError)).toBe("unmapped db error");
  });

  it("reads the real message from an Edge Function error's context body", async () => {
    const edgeError = {
      message: "Edge Function returned a non-2xx status code",
      context: { json: () => Promise.resolve({ error: "El email ya está en uso" }) },
    };
    expect(await getErrorMessage(edgeError)).toBe("El email ya está en uso");
  });

  it("falls back safely when an Edge Function error's context body can't be parsed", async () => {
    const edgeError = {
      message: "Edge Function returned a non-2xx status code",
      context: { json: () => Promise.reject(new Error("not json")) },
    };
    expect(await getErrorMessage(edgeError, "Fallback custom")).toBe("Fallback custom");
  });
});

describe("reportError", () => {
  it("shows a toast with the resolved message and logs to console", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const message = await reportError(new Error("algo falló"));
    expect(message).toBe("algo falló");
    expect(toast.error).toHaveBeenCalledWith("algo falló");
    expect(consoleSpy).toHaveBeenCalled();
  });
});

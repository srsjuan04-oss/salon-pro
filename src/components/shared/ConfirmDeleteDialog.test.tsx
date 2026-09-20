import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("ConfirmDeleteDialog", () => {
  it("calls onConfirm and closes when confirmed", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDeleteDialog
        open
        onOpenChange={onOpenChange}
        description="Esta acción no se puede deshacer."
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("reports the error and keeps the dialog open when onConfirm rejects", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("No se pudo eliminar"));
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDeleteDialog open onOpenChange={onOpenChange} description="¿Eliminar este registro?" onConfirm={onConfirm} />,
    );

    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("No se pudo eliminar"));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("does not call onConfirm when cancelled", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDeleteDialog open onOpenChange={() => {}} description="¿Eliminar?" onConfirm={onConfirm} />,
    );

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

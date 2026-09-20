import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { toast } from "sonner";
import { EntityFormDialog } from "./EntityFormDialog";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const schema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido"),
});

function renderDialog(onSubmit: (values: z.infer<typeof schema>) => Promise<void>) {
  return render(
    <EntityFormDialog
      open
      onOpenChange={() => {}}
      title="Nuevo cliente"
      schema={schema}
      defaultValues={{ name: "" }}
      onSubmit={onSubmit}
    >
      {(form) => (
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </EntityFormDialog>,
  );
}

describe("EntityFormDialog", () => {
  it("blocks submission and shows a validation message when the schema fails", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderDialog(onSubmit);

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByText("El nombre es requerido")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with the parsed values when the form is valid", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderDialog(onSubmit);

    await user.type(screen.getByLabelText("Nombre"), "Ana");
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "Ana" }));
  });

  it("reports the error via toast and keeps the dialog open when onSubmit rejects", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("No se pudo guardar"));
    const user = userEvent.setup();
    renderDialog(onSubmit);

    await user.type(screen.getByLabelText("Nombre"), "Ana");
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("No se pudo guardar"));
  });
});

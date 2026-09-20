import { ReactNode, useEffect } from "react";
import { DefaultValues, useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { reportError } from "@/lib/errors";

interface EntityFormDialogProps<TSchema extends z.ZodTypeAny> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  schema: TSchema;
  defaultValues: DefaultValues<z.infer<TSchema>>;
  // Required<...>: los campos con .default() en el schema quedan marcados
  // opcionales por z.infer bajo Zod 3 aunque en el output nunca falten
  // (zodResolver ya corrió antes de que handleSubmit dispare este callback).
  onSubmit: (values: Required<z.infer<TSchema>>) => Promise<void>;
  submitLabel?: string;
  submittingLabel?: string;
  className?: string;
  children: (form: UseFormReturn<z.infer<TSchema>>) => ReactNode;
}

/**
 * Dialog genérico de Create/Edit sobre ui/form.tsx + react-hook-form +
 * zodResolver. Reemplaza los ~12 modales que hoy manejan su formulario a
 * mano con useState + validación manual, cada uno con su propio criterio
 * de loading/disabled y de mensaje de error.
 */
export function EntityFormDialog<TSchema extends z.ZodTypeAny>({
  open,
  onOpenChange,
  title,
  description,
  schema,
  defaultValues,
  onSubmit,
  submitLabel = "Guardar",
  submittingLabel = "Guardando...",
  className,
  children,
}: EntityFormDialogProps<TSchema>) {
  const form = useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (open) form.reset(defaultValues);
    // Solo se re-sincroniza al abrir el dialog, no en cada cambio de
    // defaultValues mientras está abierto (eso pisaría lo que el usuario
    // esté escribiendo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values as Required<z.infer<TSchema>>);
      onOpenChange(false);
    } catch (error) {
      await reportError(error);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !form.formState.isSubmitting && onOpenChange(next)}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className={description ? undefined : "sr-only"}>
            {description ?? title}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {children(form)}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {form.formState.isSubmitting ? submittingLabel : submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

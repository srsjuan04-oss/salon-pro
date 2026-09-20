import { z } from "zod";

export const expenseSchema = z.object({
  description: z.string().trim().min(1, "La descripción es requerida"),
  category: z.string().trim().min(1, "Selecciona una categoría"),
  amount: z.coerce.number({ invalid_type_error: "Ingresa un monto válido" }).positive("El monto debe ser mayor a 0"),
  paymentMethod: z.string().trim().optional().default(""),
  type: z.enum(["fixed", "variable"]).default("variable"),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

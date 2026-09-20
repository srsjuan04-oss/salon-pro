import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido"),
  email: z.string().trim().min(1, "El correo es requerido").email("Correo inválido"),
  phone: z.string().trim().min(1, "El teléfono es requerido"),
  identificationNumber: z.string().trim().optional().default(""),
  vip: z.boolean().default(false),
  preferredServices: z.array(z.string()).default([]),
});

export type ClientFormValues = z.infer<typeof clientSchema>;

export const registerPaymentSchema = z.object({
  amount: z.coerce.number({ invalid_type_error: "Ingresa un monto válido" }).positive("El monto debe ser mayor a 0"),
  method: z.string().trim().min(1, "Selecciona un método de pago"),
  note: z.string().trim().optional().default(""),
});

export type RegisterPaymentFormValues = z.infer<typeof registerPaymentSchema>;

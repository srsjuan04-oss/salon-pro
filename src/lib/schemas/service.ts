import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido"),
  description: z.string().trim().optional().default(""),
  benefits: z.string().trim().optional().default(""),
  duration_minutes: z.coerce.number({ invalid_type_error: "Ingresa una duración válida" }).positive("La duración debe ser mayor a 0"),
  price: z.coerce.number({ invalid_type_error: "Ingresa un precio válido" }).min(0, "El precio no puede ser negativo"),
  is_active: z.boolean().default(true),
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;

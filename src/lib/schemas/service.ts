import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido"),
  description: z.string().trim().optional().default(""),
  benefits: z.string().trim().optional().default(""),
  // "service": se agenda con duración y barbero. "product": se vende sin
  // cita (ej: un negocio que no agenda, solo vende productos); no usa
  // duration_minutes, que queda en 0 y se ignora en el resto de la app.
  item_type: z.enum(["service", "product"]).default("service"),
  duration_minutes: z.coerce.number({ invalid_type_error: "Ingresa una duración válida" }).nonnegative("La duración no puede ser negativa"),
  price: z.coerce.number({ invalid_type_error: "Ingresa un precio válido" }).min(0, "El precio no puede ser negativo"),
  is_active: z.boolean().default(true),
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;

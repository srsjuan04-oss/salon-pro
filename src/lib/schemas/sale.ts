import { z } from "zod";

export const saleSchema = z.object({
  client: z.string().trim().min(1, "El nombre del cliente es requerido"),
  service: z.string().trim().min(1, "Selecciona un servicio"),
  amount: z.coerce.number({ invalid_type_error: "Ingresa un monto válido" }).positive("El monto debe ser mayor a 0"),
  paymentMethod: z.string().trim().optional().default(""),
});

export type SaleFormValues = z.infer<typeof saleSchema>;

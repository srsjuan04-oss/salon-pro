import { z } from "zod";

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const appointmentSchema = z
  .object({
    customerId: z.string().trim().optional().default(""),
    newCustomerName: z.string().trim().optional().default(""),
    newCustomerPhone: z.string().trim().optional().default(""),
    serviceId: z.string().trim().min(1, "Selecciona un servicio"),
    barberId: z.string().trim().min(1, "Selecciona un barbero/estilista"),
    time: z.string().trim().regex(TIME_REGEX, "Hora inválida (HH:MM)"),
    notes: z.string().trim().optional().default(""),
  })
  .refine((data) => data.customerId || (data.newCustomerName && data.newCustomerPhone), {
    message: "Selecciona un cliente existente o completa nombre y teléfono para uno nuevo",
    path: ["customerId"],
  });

export type AppointmentFormValues = z.infer<typeof appointmentSchema>;

export const cancelAppointmentSchema = z.object({
  preset: z.string().trim().optional().default(""),
  reason: z.string().trim().min(1, "Indica el motivo de la cancelación"),
});

export type CancelAppointmentFormValues = z.infer<typeof cancelAppointmentSchema>;

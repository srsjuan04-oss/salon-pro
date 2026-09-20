import { z } from "zod";

export const staffMemberSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido"),
  email: z.string().trim().optional().default(""),
  phone: z.string().trim().optional().default(""),
  specialty: z.string().trim().optional().default(""),
});

export type StaffMemberFormValues = z.infer<typeof staffMemberSchema>;

// Usado tanto por el dialog "Crear acceso" de StaffPage como por el de
// TeamAccountsCard (src/components/settings/TeamAccountsCard.tsx), que hoy
// duplican esta misma validación y llaman al mismo edge function
// create-team-account.
export const teamAccessSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido"),
  email: z.string().trim().min(1, "El correo es requerido").email("Correo inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  role: z.enum(["admin", "staff", "barber"]).default("staff"),
});

export type TeamAccessFormValues = z.infer<typeof teamAccessSchema>;

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EntityFormDialog } from "@/components/shared/EntityFormDialog";
import { appointmentSchema } from "@/lib/schemas/appointment";

interface NewAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: { id: string; name: string; phone: string }[];
  services: { id: string; name: string; price: number; duration_minutes: number }[];
  barbers: { id: string; name: string }[];
  onSubmit: (values: ReturnType<typeof appointmentSchema.parse>) => Promise<void>;
}

export function NewAppointmentDialog({ open, onOpenChange, customers, services, barbers, onSubmit }: NewAppointmentDialogProps) {
  return (
    <EntityFormDialog<typeof appointmentSchema>
      open={open}
      onOpenChange={onOpenChange}
      title="Nueva Cita"
      schema={appointmentSchema}
      defaultValues={{ customerId: "", newCustomerName: "", newCustomerPhone: "", serviceId: "", barberId: "", time: "", notes: "" }}
      onSubmit={onSubmit}
      submitLabel="Agendar Cita"
      submittingLabel="Agendando..."
      className="max-w-md"
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue("newCustomerName", "");
                    form.setValue("newCustomerPhone", "");
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente existente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {!form.watch("customerId") && (
            <div className="space-y-2 p-3 rounded-lg bg-secondary/50">
              <p className="text-sm font-medium">O crear nuevo cliente:</p>
              <FormField
                control={form.control}
                name="newCustomerName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Nombre del cliente" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newCustomerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Teléfono" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          )}

          <FormField
            control={form.control}
            name="serviceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Servicio *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar servicio" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - ${service.price} ({service.duration_minutes} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="barberId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Barbero *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar barbero" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {barbers.map((barber) => (
                      <SelectItem key={barber.id} value={barber.id}>
                        {barber.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora *</FormLabel>
                <FormControl>
                  <Input type="time" step={60} {...field} />
                </FormControl>
                <p className="text-xs text-muted-foreground">Puedes elegir cualquier hora manualmente.</p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas</FormLabel>
                <FormControl>
                  <Textarea placeholder="Notas adicionales..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormDialog>
  );
}

import { Banknote, Check, CreditCard, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { EntityFormDialog } from "@/components/shared/EntityFormDialog";
import { useRegisterPayment } from "@/hooks/useCustomers";
import { registerPaymentSchema } from "@/lib/schemas/client";
import { cn } from "@/lib/utils";
import type { Client } from "@/data/clients";
import { toast } from "sonner";

interface RegisterPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

const paymentMethods = [
  { id: "efectivo", label: "Efectivo", icon: Banknote },
  { id: "tarjeta", label: "Tarjeta", icon: CreditCard },
  { id: "transferencia", label: "Transferencia", icon: DollarSign },
];

export function RegisterPaymentDialog({ open, onOpenChange, client }: RegisterPaymentDialogProps) {
  const registerPayment = useRegisterPayment();

  if (!client) return null;

  return (
    <EntityFormDialog<typeof registerPaymentSchema>
      open={open}
      onOpenChange={onOpenChange}
      title="Registrar Pago"
      description={`Registrar un pago para ${client.name}`}
      schema={registerPaymentSchema}
      defaultValues={{ amount: String(client.balance) as unknown as number, method: "efectivo", note: "" }}
      onSubmit={async (values) => {
        await registerPayment.mutateAsync({
          customerId: client.id,
          amount: values.amount,
          method: values.method,
          note: values.note || undefined,
        });
        toast.success("Pago registrado");
      }}
      submitLabel="Confirmar Pago"
      className="sm:max-w-[400px]"
    >
      {(form) => {
        const amount = parseFloat(String(form.watch("amount") || "0"));
        return (
          <>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <img src={client.avatar} alt={client.name} className="w-10 h-10 rounded-full object-cover" />
              <div>
                <p className="font-medium">{client.name}</p>
                <p className="text-sm text-destructive font-semibold">Saldo: ${client.balance.toLocaleString()}</p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto a pagar</FormLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <FormControl>
                      <Input type="number" min="0" max={client.balance} step="0.01" placeholder="0.00" className="pl-9" {...field} />
                    </FormControl>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => form.setValue("amount", String(client.balance) as unknown as number)}
                    >
                      Pago Total
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => form.setValue("amount", String(client.balance / 2) as unknown as number)}
                    >
                      50%
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de pago</FormLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <Button
                          key={method.id}
                          type="button"
                          variant={field.value === method.id ? "default" : "outline"}
                          className={cn("flex flex-col gap-1 h-auto py-3", field.value === method.id && "ring-2 ring-primary")}
                          onClick={() => field.onChange(method.id)}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-xs">{method.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Abono parcial, pago con tarjeta..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {amount > 0 && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Saldo actual:</span>
                  <span className="font-medium">${client.balance.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pago:</span>
                  <span className="font-medium text-green-600">-${amount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2 mt-2 border-t border-green-500/20">
                  <span className="font-medium">Nuevo saldo:</span>
                  <span className="font-bold">${Math.max(0, client.balance - amount).toLocaleString()}</span>
                </div>
              </div>
            )}
          </>
        );
      }}
    </EntityFormDialog>
  );
}

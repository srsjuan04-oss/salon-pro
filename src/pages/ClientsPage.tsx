import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useClients, useCreateClient, usePipelineStages, useUpdateCustomer } from "@/hooks/useCustomers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Search, Download, Loader2 } from "lucide-react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { EntityFormDialog } from "@/components/shared/EntityFormDialog";
import { EntityPicker } from "@/components/shared/EntityPicker";
import { ClientCard } from "@/components/clients/ClientCard";
import { ClientHistoryDialog } from "@/components/clients/ClientHistoryDialog";
import { RegisterPaymentDialog } from "@/components/clients/RegisterPaymentDialog";
import { ClientDebtChart } from "@/components/clients/ClientDebtChart";
import { TopClientsCard } from "@/components/clients/TopClientsCard";
import { ClientsAcquiredChart } from "@/components/clients/ClientsAcquiredChart";
import { clientSchema } from "@/lib/schemas/client";
import { reportError } from "@/lib/errors";
import { toast } from "sonner";
import type { Client } from "@/data/clients";

const initialServices = [
  "Corte de cabello",
  "Corte + Tinte",
  "Corte + Barba",
  "Manicure",
  "Pedicure",
  "Tratamiento capilar",
  "Coloración",
  "Fade",
];

export default function ClientsPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const { data: clients = [], isLoading: loading } = useClients();
  const { data: pipelineStages = [] } = usePipelineStages();
  const createClient = useCreateClient();
  const updateCustomer = useUpdateCustomer();
  const [stageFilter, setStageFilter] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [services] = useState(initialServices);

  const handleOpenAdd = () => {
    setEditingClient(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setIsDialogOpen(true);
  };

  const handleOpenPayment = (client: Client) => {
    setSelectedClient(client);
    setPaymentDialogOpen(true);
  };

  const handleOpenHistory = (client: Client) => {
    setSelectedClient(client);
    setHistoryDialogOpen(true);
  };

  const handleStageChange = async (clientId: string, stageId: string) => {
    try {
      await updateCustomer.mutateAsync({ id: clientId, pipeline_stage_id: stageId });
    } catch (error) {
      await reportError(error, "No se pudo cambiar la etapa");
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.identificationNumber.includes(searchTerm)
  );

  const visibleClients = stageFilter ? filteredClients.filter((c) => c.pipelineStageId === stageFilter) : filteredClients;

  const handleExportCsv = () => {
    const headers = ["Nombre", "Email", "Teléfono", "Identificación", "Visitas", "Total gastado", "Saldo", "Última visita"];
    const rows = clients.map((c) => [
      c.name,
      c.email,
      c.phone,
      c.identificationNumber,
      String(c.visits),
      String(c.totalSpent),
      String(c.balance),
      c.lastVisit,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Clientes</h1>
            <p className="text-muted-foreground mt-1">Gestiona tu base de clientes • {clients.length} clientes totales</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleExportCsv}>
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
            <Button className="gradient-gold shadow-gold gap-2" onClick={handleOpenAdd}>
              <UserPlus className="w-4 h-4" />
              Agregar Cliente
            </Button>
          </div>
        </div>

        <ClientDebtChart clients={clients} />
        <TopClientsCard clients={clients} />
        <ClientsAcquiredChart clients={clients} />

        {/* Search and Filters */}
        <div className="bg-card rounded-2xl border shadow-soft p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o teléfono..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant={stageFilter === null ? "default" : "outline"} size="sm" onClick={() => setStageFilter(null)}>
                Todos
              </Button>
              {pipelineStages.map((stage) => (
                <Button
                  key={stage.id}
                  variant={stageFilter === stage.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStageFilter(stage.id)}
                >
                  {stage.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Clients Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                pipelineStages={pipelineStages}
                onStageChange={handleStageChange}
                onViewHistory={handleOpenHistory}
                onViewProfile={(c) => navigate(`/clients/${c.id}`)}
                onEdit={handleOpenEdit}
                onRegisterPayment={handleOpenPayment}
              />
            ))}
          </div>
        )}
      </div>

      <EntityFormDialog<typeof clientSchema>
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingClient(null);
        }}
        title={editingClient ? "Editar Cliente" : "Agregar Cliente"}
        schema={clientSchema}
        defaultValues={
          editingClient
            ? {
                name: editingClient.name,
                email: editingClient.email,
                phone: editingClient.phone,
                vip: editingClient.vip,
                preferredServices: editingClient.tags,
                identificationNumber: editingClient.identificationNumber,
              }
            : { name: "", email: "", phone: "", vip: false, preferredServices: [], identificationNumber: "" }
        }
        onSubmit={async (values) => {
          if (editingClient) {
            await updateCustomer.mutateAsync({
              id: editingClient.id,
              name: values.name,
              email: values.email,
              phone: values.phone,
              identification_number: values.identificationNumber || null,
            });
            toast.success("Cliente actualizado");
          } else {
            await createClient.mutateAsync({
              name: values.name,
              email: values.email,
              phone: values.phone,
              identificationNumber: values.identificationNumber,
            });
            toast.success("Cliente creado");
          }
        }}
        submitLabel={editingClient ? "Guardar Cambios" : "Guardar Cliente"}
        className="sm:max-w-[500px]"
      >
        {(form) => (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="identificationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de identificación</FormLabel>
                    <FormControl>
                      <Input placeholder="Cédula o DNI" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="correo@ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+52 55 1234 5678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferredServices"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Servicios preferidos</FormLabel>
                  <EntityPicker options={services} selected={field.value} onChange={field.onChange} placeholder="Seleccionar servicios..." />
                  {field.value.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {field.value.map((service) => (
                        <span key={service} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          {service}
                        </span>
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vip"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <FormLabel>Cliente VIP</FormLabel>
                    <p className="text-sm text-muted-foreground">Marcar como cliente preferencial</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        )}
      </EntityFormDialog>

      <ClientHistoryDialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen} client={selectedClient} />
      <RegisterPaymentDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen} client={selectedClient} />
    </DashboardLayout>
  );
}

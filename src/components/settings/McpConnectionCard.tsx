import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Server, Copy, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function McpConnectionCard() {
  const [showToken, setShowToken] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data: config, isLoading, error } = useQuery({
    queryKey: ["mcp-connection"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("mcp-connection");
      if (error) throw error;
      return data as {
        url: string;
        name: string;
        auth_type: string;
        token: string;
      };
    },
  });

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success("Copiado al portapapeles");
  };

  return (
    <Card className="rounded-2xl border shadow-soft">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Server className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Conexión MCP (Whapify)</CardTitle>
            <CardDescription>
              Datos necesarios para conectar Whapify / Chatrace con tu agenda.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando configuración...
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            No se pudo cargar la configuración. Asegúrate de tener rol de administrador.
          </div>
        )}

        {config && (
          <>
            <div className="space-y-2">
              <Label>URL del servidor MCP</Label>
              <div className="flex gap-2">
                <Input value={config.url} readOnly />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copy(config.url, "url")}
                >
                  {copiedKey === "url" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nombre recomendado en Whapify</Label>
              <Input value={config.name} readOnly />
            </div>

            <div className="space-y-2">
              <Label>Tipo de autenticación</Label>
              <Input value="Bearer Token" readOnly />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Token Bearer</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1"
                  onClick={() => setShowToken((s) => !s)}
                >
                  {showToken ? (
                    <EyeOff className="w-3 h-3" />
                  ) : (
                    <Eye className="w-3 h-3" />
                  )}
                  {showToken ? "Ocultar" : "Mostrar"}
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  type={showToken ? "text" : "password"}
                  value={config.token}
                  readOnly
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copy(config.token, "token")}
                >
                  {copiedKey === "token" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                No compartas este token. Es la clave que permite a Whapify operar tu agenda.
              </p>
            </div>

            <div className="rounded-xl bg-secondary/50 p-4 space-y-2">
              <p className="font-medium">¿Dónde se configura?</p>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>Entra a <strong>Whapify / Chatrace</strong> → Integraciones → <strong>MCP</strong></li>
                <li>Crea una nueva conexión MCP</li>
                <li>Pega la <strong>URL</strong> de arriba</li>
                <li>Selecciona autenticación <strong>Bearer Token</strong></li>
                <li>Pega el <strong>Token Bearer</strong></li>
                <li>Guarda y prueba con el bot</li>
              </ol>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

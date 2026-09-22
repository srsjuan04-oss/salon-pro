import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, CreditCard, Loader2, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

const emailSchema = z.string().email("Email inválido");
const passwordSchema = z.string().min(6, "La contraseña debe tener al menos 6 caracteres");
const nameSchema = z.string().min(2, "Este campo es obligatorio");

const WOMPI_ENV = import.meta.env.VITE_WOMPI_ENV;
const WOMPI_PUBLIC_KEY = import.meta.env.VITE_WOMPI_PUBLIC_KEY as string;
const WOMPI_BASE = WOMPI_ENV === "production" ? "https://production.wompi.co/v1" : "https://sandbox.wompi.co/v1";

interface Plan {
  code: string;
  name: string;
  amount_in_cents: number;
  currency: string;
}

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

async function wompiPublicFetch(path: string, body: unknown) {
  const res = await fetch(`${WOMPI_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WOMPI_PUBLIC_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = json?.error?.messages
      ? Object.values(json.error.messages).flat().join(" ")
      : json?.error?.reason ?? json?.error?.type ?? res.statusText;
    throw new Error(String(reason));
  }
  return json.data;
}

export default function PlansPage() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [salonName, setSalonName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardExpMonth, setCardExpMonth] = useState("");
  const [cardExpYear, setCardExpYear] = useState("");
  const [cardHolder, setCardHolder] = useState("");

  const [status, setStatus] = useState<"idle" | "processing" | "confirming" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("code, name, amount_in_cents, currency")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Plan[];
    },
  });

  const pollSubscriptionStatus = async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise((r) => setTimeout(r, 2000));
      const { data } = await supabase.rpc("get_my_subscription");
      const sub = Array.isArray(data) ? data[0] : null;
      if (sub?.status === "active") return true;
      if (sub?.status === "past_due") return false;
    }
    return null; // sigue pendiente, el webhook puede tardar un poco más
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPlan) return setError("Selecciona un plan.");
    try {
      nameSchema.parse(salonName);
      nameSchema.parse(adminName);
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) return setError(err.errors[0].message);
    }
    if (!cardNumber || !cardCvc || !cardExpMonth || !cardExpYear || !cardHolder) {
      return setError("Completa los datos de la tarjeta.");
    }

    setStatus("processing");
    setStatusMessage("Creando tu cuenta...");
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: adminName, salon_name: salonName } },
      });
      if (signUpError) {
        throw new Error(
          signUpError.message.includes("already registered")
            ? "Este correo ya está registrado. Inicia sesión en vez de crear una cuenta nueva."
            : signUpError.message
        );
      }
      if (!signUpData.session) {
        throw new Error("Tu cuenta se creó pero necesitas confirmar tu correo antes de continuar. Revísalo e inicia sesión.");
      }

      setStatusMessage("Verificando tarjeta...");
      const merchant = await fetch(`${WOMPI_BASE}/merchants/${WOMPI_PUBLIC_KEY}`).then((r) => r.json());
      const acceptanceToken = merchant?.data?.presigned_acceptance?.acceptance_token;
      const personalAuthToken = merchant?.data?.presigned_personal_data_auth?.acceptance_token;
      if (!acceptanceToken || !personalAuthToken) throw new Error("No se pudo preparar el pago. Intenta de nuevo.");

      const cardToken = await wompiPublicFetch("/tokens/cards", {
        number: cardNumber.replace(/\s+/g, ""),
        cvc: cardCvc,
        exp_month: cardExpMonth,
        exp_year: cardExpYear,
        card_holder: cardHolder,
      });

      setStatusMessage("Procesando el pago...");
      const { data: result, error: fnError } = await supabase.functions.invoke("wompi-create-subscription", {
        body: {
          plan_code: selectedPlan.code,
          payment_type: "CARD",
          token: cardToken.id,
          acceptance_token: acceptanceToken,
          accept_personal_auth: personalAuthToken,
          customer_email: email,
          installments: 1,
        },
      });
      if (fnError) throw new Error(fnError.message);
      if (result?.error) throw new Error(result.error);

      if (result.status === "APPROVED") {
        setStatus("success");
        setTimeout(() => navigate("/"), 1500);
        return;
      }

      setStatus("confirming");
      setStatusMessage("Confirmando el pago con tu banco...");
      const approved = await pollSubscriptionStatus();
      if (approved === true) {
        setStatus("success");
        setTimeout(() => navigate("/"), 1500);
      } else if (approved === false) {
        throw new Error("El pago fue rechazado. Puedes iniciar sesión y volver a intentarlo con otro medio de pago.");
      } else {
        setStatus("success");
        setStatusMessage("Tu pago está siendo confirmado. Ya puedes ingresar a tu cuenta; te avisaremos cuando quede activa.");
      }
    } catch (err) {
      setStatus("error");
      setStatusMessage(null);
      setError((err as Error).message);
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
            <h2 className="text-xl font-bold">¡Listo!</h2>
            <p className="text-muted-foreground">{statusMessage ?? "Tu suscripción quedó activa. Te llevamos a tu panel..."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl gradient-gold shadow-gold flex items-center justify-center">
              <Scissors className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Elige tu plan</h1>
          <p className="text-muted-foreground">Activa CharlIA para tu negocio en minutos</p>
        </div>

        {plansLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <button
                key={plan.code}
                type="button"
                onClick={() => setSelectedPlan(plan)}
                className={cn(
                  "text-left rounded-2xl border-2 p-5 transition-all bg-card",
                  selectedPlan?.code === plan.code ? "border-primary shadow-gold" : "border-border hover:border-primary/40"
                )}
              >
                <p className="font-semibold">{plan.name}</p>
                <p className="text-2xl font-bold mt-2">{currency.format(plan.amount_in_cents / 100)}</p>
                <p className="text-xs text-muted-foreground">/ mes</p>
              </button>
            ))}
          </div>
        )}

        {selectedPlan && (
          <Card>
            <CardHeader>
              <CardTitle>Completa tu registro y pago</CardTitle>
              <CardDescription>
                Plan {selectedPlan.name} — {currency.format(selectedPlan.amount_in_cents / 100)}/mes, renovación automática
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plan-salon-name">Nombre del negocio</Label>
                    <Input id="plan-salon-name" value={salonName} onChange={(e) => setSalonName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plan-admin-name">Tu nombre</Label>
                    <Input id="plan-admin-name" value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plan-email">Correo electrónico</Label>
                    <Input id="plan-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plan-password">Contraseña</Label>
                    <Input id="plan-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Datos de la tarjeta
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="card-number">Número de tarjeta</Label>
                      <Input id="card-number" inputMode="numeric" placeholder="4242 4242 4242 4242" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="card-holder">Nombre del titular</Label>
                      <Input id="card-holder" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="card-cvc">CVC</Label>
                      <Input id="card-cvc" inputMode="numeric" maxLength={4} value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="card-exp-month">Mes de vencimiento (MM)</Label>
                      <Input id="card-exp-month" inputMode="numeric" maxLength={2} placeholder="08" value={cardExpMonth} onChange={(e) => setCardExpMonth(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="card-exp-year">Año de vencimiento (AA)</Label>
                      <Input id="card-exp-year" inputMode="numeric" maxLength={2} placeholder="29" value={cardExpYear} onChange={(e) => setCardExpYear(e.target.value)} required />
                    </div>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <p className="text-xs text-muted-foreground">
                  Al continuar autorizas el cobro mensual automático de tu suscripción. Puedes cancelar cuando quieras.
                </p>

                <Button type="submit" className="w-full gradient-gold shadow-gold" disabled={status === "processing" || status === "confirming"}>
                  {(status === "processing" || status === "confirming") && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {statusMessage ?? `Pagar ${currency.format(selectedPlan.amount_in_cents / 100)}`}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

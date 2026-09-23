import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Scissors,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

const emailSchema = z.string().email("Email inválido");
const passwordSchema = z.string().min(6, "La contraseña debe tener al menos 6 caracteres");
const nameSchema = z.string().min(2, "Este campo es obligatorio");
const COL_PHONE_RE = /^3\d{9}$/;

const WOMPI_ENV = import.meta.env.VITE_WOMPI_ENV;
const IS_SANDBOX = WOMPI_ENV !== "production";
const WOMPI_PUBLIC_KEY = import.meta.env.VITE_WOMPI_PUBLIC_KEY as string;
const WOMPI_BASE = WOMPI_ENV === "production" ? "https://production.wompi.co/v1" : "https://sandbox.wompi.co/v1";

type PaymentType = "CARD" | "NEQUI" | "BANCOLOMBIA_TRANSFER";

interface Plan {
  code: string;
  name: string;
  amount_in_cents: number;
  currency: string;
  target_audience: string | null;
  features: string[];
  included_bookings: number | null;
  implementation_fee_cents: number;
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

/** Consulta un token de Nequi/Bancolombia hasta que quede APPROVED, DECLINED o ERROR. */
async function pollWompiToken(path: string, id: string, maxAttempts = 40, intervalMs = 3000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const res = await fetch(`${WOMPI_BASE}${path}/${id}`, {
      headers: { Authorization: `Bearer ${WOMPI_PUBLIC_KEY}` },
    });
    const json = await res.json().catch(() => ({}));
    const status = json?.data?.status;
    if (status === "APPROVED") return json.data;
    if (status === "DECLINED") throw new Error("El medio de pago fue rechazado.");
    if (status === "ERROR") throw new Error("No se pudo validar el medio de pago.");
  }
  throw new Error("Se agotó el tiempo de espera esperando la aprobación. Intenta de nuevo.");
}

type AsyncMethodStatus = "idle" | "verifying" | "approved" | "error";

export default function PlansPage() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [salonName, setSalonName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentType>("CARD");

  // Tarjeta: se tokeniza al enviar el formulario (es síncrono).
  const [cardNumber, setCardNumber] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardExpMonth, setCardExpMonth] = useState("");
  const [cardExpYear, setCardExpYear] = useState("");
  const [cardHolder, setCardHolder] = useState("");

  // Nequi: hay que verificar (esperar aprobación en la app) antes de poder pagar.
  const [nequiPhone, setNequiPhone] = useState("");
  const [nequiStatus, setNequiStatus] = useState<AsyncMethodStatus>("idle");
  const [nequiError, setNequiError] = useState<string | null>(null);
  const [nequiTokenId, setNequiTokenId] = useState<string | null>(null);

  // Bancolombia: autorización en ventana emergente.
  const [bcolStatus, setBcolStatus] = useState<AsyncMethodStatus>("idle");
  const [bcolError, setBcolError] = useState<string | null>(null);
  const [bcolTokenId, setBcolTokenId] = useState<string | null>(null);

  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("code, name, amount_in_cents, currency, target_audience, features, included_bookings, implementation_fee_cents")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Plan[];
    },
  });

  const handleVerifyNequi = async () => {
    setNequiError(null);
    if (!COL_PHONE_RE.test(nequiPhone)) {
      setNequiError("Ingresa un número de Nequi válido (10 dígitos, empieza en 3).");
      return;
    }
    setNequiStatus("verifying");
    try {
      const created = await wompiPublicFetch("/tokens/nequi", { phone_number: nequiPhone });
      const approved = await pollWompiToken("/tokens/nequi", created.id);
      setNequiTokenId(approved.id);
      setNequiStatus("approved");
    } catch (err) {
      setNequiStatus("error");
      setNequiError((err as Error).message);
    }
  };

  const handleAuthorizeBancolombia = async () => {
    setBcolError(null);
    setBcolStatus("verifying");
    try {
      const created = await wompiPublicFetch("/tokens/bancolombia_transfer", {
        redirect_url: `${window.location.origin}/planes`,
        type_auth: "TOKEN",
      });
      const popup = window.open(created.authorization_url, "_blank", "width=480,height=720");
      if (!popup) throw new Error("Habilita las ventanas emergentes en tu navegador para autorizar con Bancolombia.");
      const approved = await pollWompiToken("/tokens/bancolombia_transfer", created.id);
      setBcolTokenId(approved.id);
      setBcolStatus("approved");
    } catch (err) {
      setBcolStatus("error");
      setBcolError((err as Error).message);
    }
  };

  const canSubmit = (() => {
    if (!selectedPlan || !salonName || !adminName || !email || !password) return false;
    if (paymentMethod === "CARD") return Boolean(cardNumber && cardCvc && cardExpMonth && cardExpYear && cardHolder);
    if (paymentMethod === "NEQUI") return Boolean(nequiTokenId);
    return Boolean(bcolTokenId);
  })();

  const trialEndDateLabel = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toLocaleDateString("es-CO", { day: "numeric", month: "long" });
  })();

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
    if (paymentMethod === "CARD" && (!cardNumber || !cardCvc || !cardExpMonth || !cardExpYear || !cardHolder)) {
      return setError("Completa los datos de la tarjeta.");
    }
    if (paymentMethod === "NEQUI" && !nequiTokenId) return setError("Verifica tu Nequi antes de continuar.");
    if (paymentMethod === "BANCOLOMBIA_TRANSFER" && !bcolTokenId) return setError("Autoriza tu cuenta Bancolombia antes de continuar.");

    setStatus("processing");
    setStatusMessage("Creando tu cuenta...");
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: adminName, salon_name: salonName } },
      });
      if (signUpError) {
        if (!signUpError.message.includes("already registered")) throw new Error(signUpError.message);
        // Probablemente es un reintento tras un pago fallido: la cuenta ya se
        // había creado en el primer intento, así que iniciamos sesión con los
        // mismos datos en vez de dejar al usuario sin salida.
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError || !signInData.session) {
          throw new Error("Este correo ya está registrado con otra contraseña. Inicia sesión desde tu cuenta y completa el pago ahí.");
        }
      } else if (!signUpData.session) {
        throw new Error("Tu cuenta se creó pero necesitas confirmar tu correo antes de continuar. Revísalo e inicia sesión.");
      }

      setStatusMessage("Verificando tu medio de pago...");
      const merchant = await fetch(`${WOMPI_BASE}/merchants/${WOMPI_PUBLIC_KEY}`).then((r) => r.json());
      const acceptanceToken = merchant?.data?.presigned_acceptance?.acceptance_token;
      const personalAuthToken = merchant?.data?.presigned_personal_data_auth?.acceptance_token;
      if (!acceptanceToken || !personalAuthToken) throw new Error("No se pudo verificar el medio de pago. Intenta de nuevo.");

      let token: string;
      if (paymentMethod === "CARD") {
        const cardToken = await wompiPublicFetch("/tokens/cards", {
          number: cardNumber.replace(/\s+/g, ""),
          cvc: cardCvc,
          exp_month: cardExpMonth,
          exp_year: cardExpYear,
          card_holder: cardHolder,
        });
        token = cardToken.id;
      } else if (paymentMethod === "NEQUI") {
        token = nequiTokenId!;
      } else {
        token = bcolTokenId!;
      }

      setStatusMessage("Activando tu prueba gratis...");
      // No se cobra nada aquí: solo se guarda el medio de pago tokenizado.
      // El primer cobro real (mensualidad + implementación) ocurre al
      // terminar los 15 días, salvo que canceles antes.
      const { data: result, error: fnError } = await supabase.functions.invoke("wompi-create-subscription", {
        body: {
          plan_code: selectedPlan.code,
          payment_type: paymentMethod,
          token,
          acceptance_token: acceptanceToken,
          accept_personal_auth: personalAuthToken,
          customer_email: email,
          // Se reenvía para crear la misma cuenta en Chat CharlIA (WhatsApp); el backend
          // solo la usa en memoria para ese alta y no la guarda.
          password,
        },
      });
      if (fnError) throw new Error(fnError.message);
      if (result?.error) throw new Error(result.error);

      setStatus("success");
      setStatusMessage(
        `Tu prueba gratis de 15 días comenzó. Te cobraremos el ${result.trial_ends_at} a menos que canceles antes.`
      );
      setTimeout(() => navigate("/"), 2500);
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
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl gradient-gold shadow-gold flex items-center justify-center">
              <Scissors className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">Elige el plan ideal para tu negocio</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            IA por WhatsApp, agenda automática y CRM en un solo lugar
          </p>
          <div className="inline-flex items-center gap-2 bg-success/10 text-success border border-success/20 rounded-full px-4 py-1.5 text-sm font-semibold">
            <Sparkles className="w-4 h-4" />
            Tu prueba gratis de 15 días empieza HOY — no se cobra nada ahora
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-1">
            <ShieldCheck className="w-4 h-4 text-success" />
            <span>
              Pago 100% seguro procesado por <span className="font-semibold text-foreground">Wompi</span>
            </span>
          </div>
        </div>

        {plansLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const isSelected = selectedPlan?.code === plan.code;
              const isRecommended = plan.code === "negocio";
              return (
                <button
                  key={plan.code}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={cn(
                    "relative text-left rounded-2xl border-2 p-6 transition-all bg-card flex flex-col",
                    isSelected
                      ? "border-primary shadow-gold sm:-translate-y-1"
                      : "border-border hover:border-primary/40 hover:shadow-soft"
                  )}
                >
                  {isRecommended && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-gold text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full shadow-gold whitespace-nowrap">
                      Más elegido
                    </span>
                  )}
                  <p className="font-semibold text-lg">{plan.name}</p>
                  {plan.target_audience && (
                    <p className="text-xs text-muted-foreground mt-0.5">{plan.target_audience}</p>
                  )}
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{currency.format(plan.amount_in_cents / 100)}</span>
                    <span className="text-sm text-muted-foreground">/mes</span>
                  </div>
                  {plan.included_bookings && (
                    <p className="text-xs font-medium text-primary mt-1">
                      {plan.included_bookings} agendamientos incluidos
                    </p>
                  )}
                  {plan.implementation_fee_cents > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      + {currency.format(plan.implementation_fee_cents / 100)} implementación (pago único)
                    </p>
                  )}
                  <ul className="mt-4 space-y-2 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div
                    className={cn(
                      "mt-5 text-center text-sm font-medium rounded-lg py-2 border transition-colors",
                      isSelected
                        ? "gradient-gold text-primary-foreground border-transparent"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {isSelected ? "Plan seleccionado" : "Elegir este plan"}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selectedPlan && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Completa tu registro y pago</CardTitle>
              <CardDescription>
                Plan {selectedPlan.name} — {currency.format(selectedPlan.amount_in_cents / 100)}/mes, renovación automática
                {selectedPlan.implementation_fee_cents > 0 && (
                  <> · + {currency.format(selectedPlan.implementation_fee_cents / 100)} implementación (pago único)</>
                )}
                <br />
                <span className="text-success font-medium">
                  Empieza hoy tu prueba gratis de 15 días — no se cobra nada en este paso.
                </span>
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
                  <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentType)}>
                    <TabsList className="grid grid-cols-3 w-full">
                      <TabsTrigger value="CARD" className="gap-1.5">
                        <CreditCard className="w-4 h-4" /> <span className="hidden sm:inline">Tarjeta</span>
                      </TabsTrigger>
                      <TabsTrigger value="NEQUI" className="gap-1.5">
                        <Smartphone className="w-4 h-4" /> <span className="hidden sm:inline">Nequi</span>
                      </TabsTrigger>
                      <TabsTrigger value="BANCOLOMBIA_TRANSFER" className="gap-1.5">
                        <Landmark className="w-4 h-4" /> <span className="hidden sm:inline">Bancolombia</span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="CARD" className="space-y-4 pt-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="card-number">Número de tarjeta</Label>
                          <Input id="card-number" inputMode="numeric" placeholder="4242 4242 4242 4242" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="card-holder">Nombre del titular</Label>
                          <Input id="card-holder" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="card-cvc">CVC</Label>
                          <Input id="card-cvc" inputMode="numeric" maxLength={4} value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="card-exp-month">Mes de vencimiento (MM)</Label>
                          <Input id="card-exp-month" inputMode="numeric" maxLength={2} placeholder="08" value={cardExpMonth} onChange={(e) => setCardExpMonth(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="card-exp-year">Año de vencimiento (AA)</Label>
                          <Input id="card-exp-year" inputMode="numeric" maxLength={2} placeholder="29" value={cardExpYear} onChange={(e) => setCardExpYear(e.target.value)} />
                        </div>
                      </div>
                      {IS_SANDBOX && (
                        <p className="text-xs text-muted-foreground">
                          Prueba: 4242 4242 4242 4242 (aprobada) o 4111 1111 1111 1111 (rechazada), cualquier fecha futura y CVC.
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="NEQUI" className="space-y-3 pt-4">
                      <div className="flex gap-2 items-end">
                        <div className="space-y-2 flex-1">
                          <Label htmlFor="nequi-phone">Número de Nequi</Label>
                          <Input
                            id="nequi-phone"
                            inputMode="numeric"
                            maxLength={10}
                            placeholder="3001234567"
                            value={nequiPhone}
                            onChange={(e) => { setNequiPhone(e.target.value); setNequiTokenId(null); setNequiStatus("idle"); }}
                            disabled={nequiStatus === "verifying"}
                          />
                        </div>
                        <Button type="button" variant="outline" onClick={handleVerifyNequi} disabled={nequiStatus === "verifying" || nequiStatus === "approved"}>
                          {nequiStatus === "verifying" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          {nequiStatus === "approved" ? "Verificado" : "Verificar"}
                        </Button>
                      </div>
                      {nequiStatus === "verifying" && (
                        <p className="text-sm text-muted-foreground">Abre tu app Nequi y aprueba la suscripción...</p>
                      )}
                      {nequiStatus === "approved" && (
                        <p className="text-sm text-success flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Nequi verificado</p>
                      )}
                      {nequiError && <p className="text-sm text-destructive">{nequiError}</p>}
                      {IS_SANDBOX && (
                        <p className="text-xs text-muted-foreground">Prueba: 3991111111 (aprobada) o 3992222222 (rechazada).</p>
                      )}
                    </TabsContent>

                    <TabsContent value="BANCOLOMBIA_TRANSFER" className="space-y-3 pt-4">
                      <p className="text-sm text-muted-foreground">
                        Se abrirá una ventana para autorizar el cobro recurrente desde tu cuenta Bancolombia.
                      </p>
                      <Button type="button" variant="outline" onClick={handleAuthorizeBancolombia} disabled={bcolStatus === "verifying" || bcolStatus === "approved"}>
                        {bcolStatus === "verifying" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {bcolStatus === "approved" ? "Autorizado" : "Autorizar con Bancolombia"}
                      </Button>
                      {bcolStatus === "verifying" && (
                        <p className="text-sm text-muted-foreground">Completa la autorización en la ventana emergente...</p>
                      )}
                      {bcolStatus === "approved" && (
                        <p className="text-sm text-success flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Cuenta Bancolombia autorizada</p>
                      )}
                      {bcolError && <p className="text-sm text-destructive">{bcolError}</p>}
                    </TabsContent>
                  </Tabs>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <p className="text-xs text-muted-foreground">
                  No se cobra nada hoy. El {trialEndDateLabel} se cobrarán{" "}
                  {currency.format((selectedPlan.amount_in_cents + selectedPlan.implementation_fee_cents) / 100)}{" "}
                  ({currency.format(selectedPlan.amount_in_cents / 100)} del plan
                  {selectedPlan.implementation_fee_cents > 0 && (
                    <> + {currency.format(selectedPlan.implementation_fee_cents / 100)} de implementación</>
                  )}
                  ), a menos que canceles antes.
                </p>

                <p className="text-xs text-muted-foreground">
                  Al continuar aceptas nuestros{" "}
                  <a href="https://www.charliacrm.com/terminos-y-condiciones.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                    Términos y condiciones
                  </a>
                  , la{" "}
                  <a href="https://www.charliacrm.com/politica-de-privacidad.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                    Política de privacidad
                  </a>{" "}
                  y el{" "}
                  <a href="https://www.charliacrm.com/tratamiento-de-datos.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                    Tratamiento de datos
                  </a>
                  .
                </p>

                <Button
                  type="submit"
                  className="w-full gradient-gold shadow-gold"
                  disabled={!canSubmit || status === "processing"}
                >
                  {status === "processing" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {statusMessage ?? "Empezar prueba gratis de 15 días"}
                </Button>
                <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-success" />
                  Transacción cifrada y procesada de forma segura por Wompi
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <a href="https://www.charliacrm.com/terminos-y-condiciones.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            Términos y condiciones
          </a>
          <a href="https://www.charliacrm.com/politica-de-privacidad.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            Política de privacidad
          </a>
          <a href="https://www.charliacrm.com/tratamiento-de-datos.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            Tratamiento de datos
          </a>
        </p>
      </div>
    </div>
  );
}

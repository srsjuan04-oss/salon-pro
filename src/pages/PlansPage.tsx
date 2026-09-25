import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Loader2, Scissors, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { useWompiPaymentMethod, WompiPaymentMethodFields } from "@/components/billing/WompiPaymentMethodFields";
import { functionErrorMessage } from "@/lib/edge-functions";

const emailSchema = z.string().email("Email inválido");
const passwordSchema = z.string().min(6, "La contraseña debe tener al menos 6 caracteres");
const nameSchema = z.string().min(2, "Este campo es obligatorio");
const COL_PHONE_RE = /^3\d{9}$/;

// Países para el WhatsApp de contacto. `digits` es la cantidad de dígitos del número
// nacional sin el prefijo (rango, porque en varios países varía).
const PHONE_COUNTRIES = [
  { code: "CO", name: "Colombia", flag: "🇨🇴", dial: "57", digits: [10, 10] },
  { code: "MX", name: "México", flag: "🇲🇽", dial: "52", digits: [10, 10] },
  { code: "EC", name: "Ecuador", flag: "🇪🇨", dial: "593", digits: [9, 9] },
  { code: "PE", name: "Perú", flag: "🇵🇪", dial: "51", digits: [9, 9] },
  { code: "VE", name: "Venezuela", flag: "🇻🇪", dial: "58", digits: [10, 10] },
  { code: "PA", name: "Panamá", flag: "🇵🇦", dial: "507", digits: [8, 8] },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷", dial: "506", digits: [8, 8] },
  { code: "GT", name: "Guatemala", flag: "🇬🇹", dial: "502", digits: [8, 8] },
  { code: "SV", name: "El Salvador", flag: "🇸🇻", dial: "503", digits: [8, 8] },
  { code: "HN", name: "Honduras", flag: "🇭🇳", dial: "504", digits: [8, 8] },
  { code: "DO", name: "República Dominicana", flag: "🇩🇴", dial: "1", digits: [10, 10] },
  { code: "CL", name: "Chile", flag: "🇨🇱", dial: "56", digits: [9, 9] },
  { code: "AR", name: "Argentina", flag: "🇦🇷", dial: "54", digits: [10, 11] },
  { code: "BO", name: "Bolivia", flag: "🇧🇴", dial: "591", digits: [8, 8] },
  { code: "PY", name: "Paraguay", flag: "🇵🇾", dial: "595", digits: [9, 9] },
  { code: "UY", name: "Uruguay", flag: "🇺🇾", dial: "598", digits: [8, 9] },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸", dial: "1", digits: [10, 10] },
  { code: "ES", name: "España", flag: "🇪🇸", dial: "34", digits: [9, 9] },
] as const;
type PhoneCountryCode = (typeof PHONE_COUNTRIES)[number]["code"];

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

export default function PlansPage() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [salonName, setSalonName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountryCode>("CO");
  const [phoneNumber, setPhoneNumber] = useState("");
  const phoneCountryInfo = PHONE_COUNTRIES.find((c) => c.code === phoneCountry)!;
  const phoneDigits = phoneNumber.replace(/\D/g, "");

  const pm = useWompiPaymentMethod("/planes");

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

  const canSubmit = (() => {
    if (!selectedPlan || !salonName || !adminName || !email || !password || !phoneDigits) return false;
    return pm.isComplete;
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
    const [minDigits, maxDigits] = phoneCountryInfo.digits;
    if (phoneDigits.length < minDigits || phoneDigits.length > maxDigits) {
      return setError(
        minDigits === maxDigits
          ? `El WhatsApp de ${phoneCountryInfo.name} debe tener ${minDigits} dígitos (sin el +${phoneCountryInfo.dial}).`
          : `El WhatsApp de ${phoneCountryInfo.name} debe tener entre ${minDigits} y ${maxDigits} dígitos (sin el +${phoneCountryInfo.dial}).`
      );
    }
    if (phoneCountry === "CO" && !COL_PHONE_RE.test(phoneDigits)) {
      return setError("El celular de Colombia debe empezar por 3 y tener 10 dígitos.");
    }
    const contactPhone = `+${phoneCountryInfo.dial}${phoneDigits}`;
    const paymentMissing = pm.missingMessage();
    if (paymentMissing) return setError(paymentMissing);

    setStatus("processing");
    setStatusMessage("Creando tu cuenta...");
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: adminName, salon_name: salonName, contact_phone: contactPhone } },
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
      const paymentMethod = await pm.tokenize();

      setStatusMessage("Activando tu prueba gratis...");
      // No se cobra nada aquí: solo se guarda el medio de pago tokenizado.
      // El primer cobro real (mensualidad + implementación) ocurre al
      // terminar los 15 días, salvo que canceles antes.
      const { data: result, error: fnError } = await supabase.functions.invoke("wompi-create-subscription", {
        body: {
          plan_code: selectedPlan.code,
          ...paymentMethod,
          customer_email: email,
          // Se reenvía para crear la misma cuenta en Chat CharlIA (WhatsApp); el backend
          // solo la usa en memoria para ese alta y no la guarda.
          password,
        },
      });
      if (fnError) throw new Error(await functionErrorMessage(fnError, fnError.message));
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
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="plan-phone">WhatsApp de contacto</Label>
                    <div className="flex gap-2">
                      <Select value={phoneCountry} onValueChange={(v) => setPhoneCountry(v as PhoneCountryCode)}>
                        <SelectTrigger className="w-[150px] shrink-0" aria-label="País">
                          <SelectValue>
                            {phoneCountryInfo.flag} +{phoneCountryInfo.dial}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {PHONE_COUNTRIES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.flag} {c.name} (+{c.dial})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="plan-phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        placeholder={phoneCountry === "CO" ? "3001234567" : "Número sin el prefijo"}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Primero elige el país; escribe el número sin el prefijo.</p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <WompiPaymentMethodFields pm={pm} />
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

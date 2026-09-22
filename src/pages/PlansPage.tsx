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
  Smartphone,
  Wallet,
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

type PaymentType = "CARD" | "NEQUI" | "DAVIPLATA" | "BANCOLOMBIA_TRANSFER";

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

  // DaviPlata: token -> envío de OTP -> confirmación de OTP.
  const [davDocType, setDavDocType] = useState("CC");
  const [davDocNumber, setDavDocNumber] = useState("");
  const [davPhone, setDavPhone] = useState("");
  const [davStatus, setDavStatus] = useState<AsyncMethodStatus | "otp_sent">("idle");
  const [davError, setDavError] = useState<string | null>(null);
  const [davOtpCode, setDavOtpCode] = useState("");
  const [davTokenId, setDavTokenId] = useState<string | null>(null);
  const davIdRef = useRef<string | null>(null);
  const davValidateUrlRef = useRef<string | null>(null);
  const davAccessTokenRef = useRef<string | null>(null);

  // Bancolombia: autorización en ventana emergente.
  const [bcolStatus, setBcolStatus] = useState<AsyncMethodStatus>("idle");
  const [bcolError, setBcolError] = useState<string | null>(null);
  const [bcolTokenId, setBcolTokenId] = useState<string | null>(null);

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

  const handleStartDaviplata = async () => {
    setDavError(null);
    if (!davDocNumber.trim() || !COL_PHONE_RE.test(davPhone)) {
      setDavError("Completa el documento y un número DaviPlata válido.");
      return;
    }
    setDavStatus("verifying");
    try {
      const created = await wompiPublicFetch("/tokens/daviplata", {
        type_document: davDocType,
        number_document: davDocNumber.trim(),
        product_number: davPhone,
      });
      davIdRef.current = created.id;
      davValidateUrlRef.current = created.url_services?.code_otp_validate ?? null;

      const sendRes = await fetch(created.url_services.code_otp_send, {
        method: "POST",
        headers: { Authorization: `Bearer ${created.url_services.token}` },
      });
      const sendJson = await sendRes.json().catch(() => ({}));
      if (!sendRes.ok) throw new Error(sendJson?.message ?? "No se pudo enviar el código OTP.");
      davAccessTokenRef.current = sendJson?.authorization?.access_token ?? null;
      setDavStatus("otp_sent");
    } catch (err) {
      setDavStatus("error");
      setDavError((err as Error).message);
    }
  };

  const handleConfirmDaviplataOtp = async () => {
    setDavError(null);
    if (!davOtpCode.trim()) {
      setDavError("Ingresa el código que recibiste por SMS.");
      return;
    }
    if (!davValidateUrlRef.current || !davAccessTokenRef.current) {
      setDavError("La sesión expiró, vuelve a solicitar el código.");
      setDavStatus("error");
      return;
    }
    try {
      const res = await fetch(davValidateUrlRef.current, {
        method: "POST",
        headers: { Authorization: `Bearer ${davAccessTokenRef.current}`, "Content-Type": "application/json" },
        body: JSON.stringify({ code: davOtpCode.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      // El access_token es de un solo uso: cada respuesta trae el siguiente.
      davAccessTokenRef.current = json?.authorization?.access_token ?? davAccessTokenRef.current;
      const subStatus = json?.data?.subscription?.status;
      if (subStatus === "APPROVED") {
        setDavTokenId(davIdRef.current);
        setDavStatus("approved");
      } else if (subStatus === "DECLINED") {
        setDavStatus("error");
        setDavError("DaviPlata rechazó la suscripción. Intenta el proceso de nuevo.");
      } else {
        setDavError("Código incorrecto. Verifica e inténtalo otra vez.");
      }
    } catch (err) {
      setDavError((err as Error).message);
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
    if (paymentMethod === "DAVIPLATA") return Boolean(davTokenId);
    return Boolean(bcolTokenId);
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
    if (paymentMethod === "DAVIPLATA" && !davTokenId) return setError("Verifica tu DaviPlata antes de continuar.");
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

      setStatusMessage("Preparando el pago...");
      const merchant = await fetch(`${WOMPI_BASE}/merchants/${WOMPI_PUBLIC_KEY}`).then((r) => r.json());
      const acceptanceToken = merchant?.data?.presigned_acceptance?.acceptance_token;
      const personalAuthToken = merchant?.data?.presigned_personal_data_auth?.acceptance_token;
      if (!acceptanceToken || !personalAuthToken) throw new Error("No se pudo preparar el pago. Intenta de nuevo.");

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
      } else if (paymentMethod === "DAVIPLATA") {
        token = davTokenId!;
      } else {
        token = bcolTokenId!;
      }

      setStatusMessage("Procesando el pago...");
      const { data: result, error: fnError } = await supabase.functions.invoke("wompi-create-subscription", {
        body: {
          plan_code: selectedPlan.code,
          payment_type: paymentMethod,
          token,
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
                  <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentType)}>
                    <TabsList className="grid grid-cols-4 w-full">
                      <TabsTrigger value="CARD" className="gap-1.5">
                        <CreditCard className="w-4 h-4" /> <span className="hidden sm:inline">Tarjeta</span>
                      </TabsTrigger>
                      <TabsTrigger value="NEQUI" className="gap-1.5">
                        <Smartphone className="w-4 h-4" /> <span className="hidden sm:inline">Nequi</span>
                      </TabsTrigger>
                      <TabsTrigger value="DAVIPLATA" className="gap-1.5">
                        <Wallet className="w-4 h-4" /> <span className="hidden sm:inline">DaviPlata</span>
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

                    <TabsContent value="DAVIPLATA" className="space-y-3 pt-4">
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="dav-doc-type">Tipo de documento</Label>
                          <select
                            id="dav-doc-type"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={davDocType}
                            onChange={(e) => setDavDocType(e.target.value)}
                            disabled={davStatus === "verifying" || davStatus === "otp_sent" || davStatus === "approved"}
                          >
                            <option value="CC">CC</option>
                            <option value="CE">CE</option>
                            <option value="NIT">NIT</option>
                            <option value="PP">Pasaporte</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dav-doc-number">Número de documento</Label>
                          <Input
                            id="dav-doc-number"
                            value={davDocNumber}
                            onChange={(e) => setDavDocNumber(e.target.value)}
                            disabled={davStatus === "verifying" || davStatus === "otp_sent" || davStatus === "approved"}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dav-phone">Número DaviPlata</Label>
                          <Input
                            id="dav-phone"
                            inputMode="numeric"
                            maxLength={10}
                            placeholder="3001234567"
                            value={davPhone}
                            onChange={(e) => setDavPhone(e.target.value)}
                            disabled={davStatus === "verifying" || davStatus === "otp_sent" || davStatus === "approved"}
                          />
                        </div>
                      </div>

                      {davStatus !== "otp_sent" && davStatus !== "approved" && (
                        <Button type="button" variant="outline" onClick={handleStartDaviplata} disabled={davStatus === "verifying"}>
                          {davStatus === "verifying" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Enviar código de verificación
                        </Button>
                      )}

                      {davStatus === "otp_sent" && (
                        <div className="flex gap-2 items-end">
                          <div className="space-y-2 flex-1">
                            <Label htmlFor="dav-otp">Código recibido por SMS</Label>
                            <Input id="dav-otp" inputMode="numeric" maxLength={6} value={davOtpCode} onChange={(e) => setDavOtpCode(e.target.value)} />
                          </div>
                          <Button type="button" variant="outline" onClick={handleConfirmDaviplataOtp}>Confirmar código</Button>
                        </div>
                      )}

                      {davStatus === "approved" && (
                        <p className="text-sm text-success flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> DaviPlata verificado</p>
                      )}
                      {davError && <p className="text-sm text-destructive">{davError}</p>}
                      {IS_SANDBOX && (
                        <p className="text-xs text-muted-foreground">
                          Prueba: número 3991111111, código OTP 574829 (aprobado) o 932016 (declinado).
                        </p>
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
                  Al continuar autorizas el cobro mensual automático de tu suscripción. Puedes cancelar cuando quieras.
                </p>

                <Button
                  type="submit"
                  className="w-full gradient-gold shadow-gold"
                  disabled={!canSubmit || status === "processing" || status === "confirming"}
                >
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

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, CreditCard, Landmark, Loader2, Smartphone } from "lucide-react";

const WOMPI_ENV = import.meta.env.VITE_WOMPI_ENV;
export const IS_SANDBOX = WOMPI_ENV !== "production";
const WOMPI_PUBLIC_KEY = import.meta.env.VITE_WOMPI_PUBLIC_KEY as string;
const WOMPI_BASE = WOMPI_ENV === "production" ? "https://production.wompi.co/v1" : "https://sandbox.wompi.co/v1";
const COL_PHONE_RE = /^3\d{9}$/;

export type PaymentType = "CARD" | "NEQUI" | "BANCOLOMBIA_TRANSFER";
type AsyncMethodStatus = "idle" | "verifying" | "approved" | "error";

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

class TokenWaitTimeoutError extends Error {}

/**
 * Consulta un token de Nequi/Bancolombia hasta que quede APPROVED, DECLINED o ERROR.
 * El límite es por tiempo real y no por intentos: en el celular el navegador pausa
 * los timers mientras el cliente está en la app de Nequi aprobando.
 */
async function pollWompiToken(path: string, id: string, maxWaitMs = 5 * 60_000, intervalMs = 3000) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
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
  throw new TokenWaitTimeoutError(
    "Todavía no vemos la aprobación. Si ya aprobaste, toca \"Ya aprobé, revisar de nuevo\"."
  );
}

export interface TokenizedPaymentMethod {
  payment_type: PaymentType;
  token: string;
  acceptance_token: string;
  accept_personal_auth: string;
}

/**
 * Estado del formulario de medio de pago de Wompi (tarjeta, Nequi o Bancolombia).
 * `redirectPath` es a dónde vuelve la ventana de autorización de Bancolombia.
 */
export function useWompiPaymentMethod(redirectPath: string) {
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
  // Token creado pero sin aprobación vista aún: se puede volver a revisar sin
  // mandarle al cliente otra solicitud a su app.
  const [nequiPendingId, setNequiPendingId] = useState<string | null>(null);

  // Bancolombia: autorización en ventana emergente.
  const [bcolStatus, setBcolStatus] = useState<AsyncMethodStatus>("idle");
  const [bcolError, setBcolError] = useState<string | null>(null);
  const [bcolTokenId, setBcolTokenId] = useState<string | null>(null);
  const [bcolPendingId, setBcolPendingId] = useState<string | null>(null);

  const handleVerifyNequi = async () => {
    setNequiError(null);
    if (!COL_PHONE_RE.test(nequiPhone)) {
      setNequiError("Ingresa un número de Nequi válido (10 dígitos, empieza en 3).");
      return;
    }
    setNequiStatus("verifying");
    try {
      const pendingId = nequiPendingId ?? (await wompiPublicFetch("/tokens/nequi", { phone_number: nequiPhone })).id;
      setNequiPendingId(pendingId);
      const approved = await pollWompiToken("/tokens/nequi", pendingId);
      setNequiTokenId(approved.id);
      setNequiPendingId(null);
      setNequiStatus("approved");
    } catch (err) {
      if (!(err instanceof TokenWaitTimeoutError)) setNequiPendingId(null);
      setNequiStatus("error");
      setNequiError((err as Error).message);
    }
  };

  const resetNequi = (phone: string) => {
    setNequiPhone(phone);
    setNequiTokenId(null);
    setNequiPendingId(null);
    setNequiStatus("idle");
    setNequiError(null);
  };

  const handleAuthorizeBancolombia = async () => {
    setBcolError(null);
    setBcolStatus("verifying");
    try {
      let pendingId = bcolPendingId;
      if (!pendingId) {
        const created = await wompiPublicFetch("/tokens/bancolombia_transfer", {
          redirect_url: `${window.location.origin}${redirectPath}`,
          type_auth: "TOKEN",
        });
        const popup = window.open(created.authorization_url, "_blank", "width=480,height=720");
        if (!popup) throw new Error("Habilita las ventanas emergentes en tu navegador para autorizar con Bancolombia.");
        pendingId = created.id as string;
        setBcolPendingId(pendingId);
      }
      const approved = await pollWompiToken("/tokens/bancolombia_transfer", pendingId);
      setBcolTokenId(approved.id);
      setBcolPendingId(null);
      setBcolStatus("approved");
    } catch (err) {
      if (!(err instanceof TokenWaitTimeoutError)) setBcolPendingId(null);
      setBcolStatus("error");
      setBcolError((err as Error).message);
    }
  };

  const isComplete =
    paymentMethod === "CARD"
      ? Boolean(cardNumber && cardCvc && cardExpMonth && cardExpYear && cardHolder)
      : paymentMethod === "NEQUI"
        ? Boolean(nequiTokenId)
        : Boolean(bcolTokenId);

  /** Mensaje de lo que falta, o null si el medio de pago está listo para tokenizar. */
  const missingMessage = (): string | null => {
    if (paymentMethod === "CARD" && !isComplete) return "Completa los datos de la tarjeta.";
    if (paymentMethod === "NEQUI" && !isComplete) return "Verifica tu Nequi antes de continuar.";
    if (paymentMethod === "BANCOLOMBIA_TRANSFER" && !isComplete) return "Autoriza tu cuenta Bancolombia antes de continuar.";
    return null;
  };

  /** Tokeniza el medio de pago y trae los tokens de aceptación del comercio. */
  const tokenize = async (): Promise<TokenizedPaymentMethod> => {
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
    return {
      payment_type: paymentMethod,
      token,
      acceptance_token: acceptanceToken,
      accept_personal_auth: personalAuthToken,
    };
  };

  return {
    paymentMethod, setPaymentMethod,
    cardNumber, setCardNumber, cardCvc, setCardCvc, cardExpMonth, setCardExpMonth,
    cardExpYear, setCardExpYear, cardHolder, setCardHolder,
    nequiPhone, resetNequi, nequiStatus, nequiError, nequiPendingId, handleVerifyNequi,
    bcolStatus, bcolError, bcolPendingId, handleAuthorizeBancolombia,
    isComplete, missingMessage, tokenize,
  };
}

export type WompiPaymentMethodState = ReturnType<typeof useWompiPaymentMethod>;

export function WompiPaymentMethodFields({ pm }: { pm: WompiPaymentMethodState }) {
  return (
    <Tabs value={pm.paymentMethod} onValueChange={(v) => pm.setPaymentMethod(v as PaymentType)}>
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
            <Input id="card-number" inputMode="numeric" placeholder="4242 4242 4242 4242" value={pm.cardNumber} onChange={(e) => pm.setCardNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-holder">Nombre del titular</Label>
            <Input id="card-holder" value={pm.cardHolder} onChange={(e) => pm.setCardHolder(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-cvc">CVC</Label>
            <Input id="card-cvc" inputMode="numeric" maxLength={4} value={pm.cardCvc} onChange={(e) => pm.setCardCvc(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-exp-month">Mes de vencimiento (MM)</Label>
            <Input id="card-exp-month" inputMode="numeric" maxLength={2} placeholder="08" value={pm.cardExpMonth} onChange={(e) => pm.setCardExpMonth(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-exp-year">Año de vencimiento (AA)</Label>
            <Input id="card-exp-year" inputMode="numeric" maxLength={2} placeholder="29" value={pm.cardExpYear} onChange={(e) => pm.setCardExpYear(e.target.value)} />
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
            <div className="flex">
              {/* Nequi solo existe en Colombia: el prefijo es fijo. */}
              <span className="inline-flex items-center whitespace-nowrap rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                🇨🇴 +57
              </span>
              <Input
                id="nequi-phone"
                className="rounded-l-none"
                inputMode="numeric"
                maxLength={10}
                placeholder="3001234567"
                value={pm.nequiPhone}
                onChange={(e) => pm.resetNequi(e.target.value)}
                disabled={pm.nequiStatus === "verifying"}
              />
            </div>
          </div>
          <Button type="button" variant="outline" onClick={pm.handleVerifyNequi} disabled={pm.nequiStatus === "verifying" || pm.nequiStatus === "approved"}>
            {pm.nequiStatus === "verifying" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {pm.nequiStatus === "approved" ? "Verificado" : pm.nequiPendingId ? "Ya aprobé, revisar de nuevo" : "Verificar"}
          </Button>
        </div>
        {pm.nequiStatus === "verifying" && (
          <p className="text-sm text-muted-foreground">Abre tu app Nequi y aprueba la suscripción...</p>
        )}
        {pm.nequiStatus === "approved" && (
          <p className="text-sm text-success flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Nequi verificado</p>
        )}
        {pm.nequiError && <p className="text-sm text-destructive">{pm.nequiError}</p>}
        {IS_SANDBOX && (
          <p className="text-xs text-muted-foreground">Prueba: 3991111111 (aprobada) o 3992222222 (rechazada).</p>
        )}
      </TabsContent>

      <TabsContent value="BANCOLOMBIA_TRANSFER" className="space-y-3 pt-4">
        <p className="text-sm text-muted-foreground">
          Se abrirá una ventana para autorizar el cobro recurrente desde tu cuenta Bancolombia.
        </p>
        <Button type="button" variant="outline" onClick={pm.handleAuthorizeBancolombia} disabled={pm.bcolStatus === "verifying" || pm.bcolStatus === "approved"}>
          {pm.bcolStatus === "verifying" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {pm.bcolStatus === "approved" ? "Autorizado" : pm.bcolPendingId ? "Ya autoricé, revisar de nuevo" : "Autorizar con Bancolombia"}
        </Button>
        {pm.bcolStatus === "verifying" && (
          <p className="text-sm text-muted-foreground">Completa la autorización en la ventana emergente...</p>
        )}
        {pm.bcolStatus === "approved" && (
          <p className="text-sm text-success flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Cuenta Bancolombia autorizada</p>
        )}
        {pm.bcolError && <p className="text-sm text-destructive">{pm.bcolError}</p>}
      </TabsContent>
    </Tabs>
  );
}

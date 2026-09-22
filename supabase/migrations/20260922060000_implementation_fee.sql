-- Cobro único de implementación ($297.000, oferta de lanzamiento), plano
-- para los 3 planes. Se cobra como una transacción SEPARADA de la primera
-- mensualidad (misma fuente de pago, mismo día) para que el monto recurrente
-- mensual (organization_subscriptions.amount_in_cents) nunca se contamine
-- con un cargo que solo debe cobrarse una vez.
ALTER TABLE public.subscription_plans
  ADD COLUMN implementation_fee_cents bigint NOT NULL DEFAULT 0;

UPDATE public.subscription_plans SET implementation_fee_cents = 29700000;

COMMENT ON COLUMN public.subscription_plans.implementation_fee_cents IS 'Cobro único de implementación, cobrado como transacción separada al momento de la primera suscripción. 0 = sin cobro de implementación.';

-- Distingue el pago recurrente de un cobro único (como el de implementación)
-- para que el webhook solo active/extienda la suscripción con el pago que
-- realmente corresponde al ciclo mensual.
ALTER TABLE public.subscription_payments
  ADD COLUMN kind text NOT NULL DEFAULT 'subscription' CHECK (kind IN ('subscription', 'implementation_fee'));

COMMENT ON COLUMN public.subscription_payments.kind IS 'subscription = cobro recurrente mensual (activa/extiende la suscripción). implementation_fee = cobro único, no afecta el estado de la suscripción.';

-- Tabla de barberos/estilistas
CREATE TABLE public.barbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  specialty TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de servicios
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de horarios de trabajo de cada barbero
CREATE TABLE public.barber_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Domingo, 1=Lunes, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de clientes (para WhatsApp)
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  whatsapp_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de citas
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  google_event_id TEXT,
  apple_event_id TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'whatsapp', 'web')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de conversaciones de WhatsApp
CREATE TABLE public.whatsapp_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_booking', 'completed', 'archived')),
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de mensajes de WhatsApp
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'document')),
  content TEXT NOT NULL,
  whatsapp_message_id TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Políticas públicas de lectura (el negocio puede ver todo)
CREATE POLICY "Allow public read for barbers" ON public.barbers FOR SELECT USING (true);
CREATE POLICY "Allow public read for services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Allow public read for barber_schedules" ON public.barber_schedules FOR SELECT USING (true);
CREATE POLICY "Allow public read for customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Allow public read for appointments" ON public.appointments FOR SELECT USING (true);
CREATE POLICY "Allow public read for whatsapp_conversations" ON public.whatsapp_conversations FOR SELECT USING (true);
CREATE POLICY "Allow public read for whatsapp_messages" ON public.whatsapp_messages FOR SELECT USING (true);

-- Políticas de inserción pública (para edge functions y webhooks)
CREATE POLICY "Allow public insert for barbers" ON public.barbers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert for services" ON public.services FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert for barber_schedules" ON public.barber_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert for customers" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert for appointments" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert for whatsapp_conversations" ON public.whatsapp_conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert for whatsapp_messages" ON public.whatsapp_messages FOR INSERT WITH CHECK (true);

-- Políticas de actualización pública
CREATE POLICY "Allow public update for barbers" ON public.barbers FOR UPDATE USING (true);
CREATE POLICY "Allow public update for services" ON public.services FOR UPDATE USING (true);
CREATE POLICY "Allow public update for barber_schedules" ON public.barber_schedules FOR UPDATE USING (true);
CREATE POLICY "Allow public update for customers" ON public.customers FOR UPDATE USING (true);
CREATE POLICY "Allow public update for appointments" ON public.appointments FOR UPDATE USING (true);
CREATE POLICY "Allow public update for whatsapp_conversations" ON public.whatsapp_conversations FOR UPDATE USING (true);
CREATE POLICY "Allow public update for whatsapp_messages" ON public.whatsapp_messages FOR UPDATE USING (true);

-- Políticas de eliminación pública
CREATE POLICY "Allow public delete for barbers" ON public.barbers FOR DELETE USING (true);
CREATE POLICY "Allow public delete for services" ON public.services FOR DELETE USING (true);
CREATE POLICY "Allow public delete for barber_schedules" ON public.barber_schedules FOR DELETE USING (true);
CREATE POLICY "Allow public delete for customers" ON public.customers FOR DELETE USING (true);
CREATE POLICY "Allow public delete for appointments" ON public.appointments FOR DELETE USING (true);
CREATE POLICY "Allow public delete for whatsapp_conversations" ON public.whatsapp_conversations FOR DELETE USING (true);
CREATE POLICY "Allow public delete for whatsapp_messages" ON public.whatsapp_messages FOR DELETE USING (true);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_barbers_updated_at BEFORE UPDATE ON public.barbers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_conversations_updated_at BEFORE UPDATE ON public.whatsapp_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime para citas
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
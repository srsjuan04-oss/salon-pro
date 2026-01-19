import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssistantRequest {
  message: string;
  phone_number: string;
  conversation_context?: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface Barber {
  id: string;
  name: string;
  specialty: string | null;
}

interface BarberSchedule {
  barber_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface Appointment {
  id: string;
  barber_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, phone_number, conversation_context }: AssistantRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch business data for context
    const [servicesRes, barbersRes, schedulesRes] = await Promise.all([
      supabase.from("services").select("*").eq("is_active", true),
      supabase.from("barbers").select("*").eq("is_active", true),
      supabase.from("barber_schedules").select("*").eq("is_available", true),
    ]);

    const services: Service[] = servicesRes.data || [];
    const barbers: Barber[] = barbersRes.data || [];
    const schedules: BarberSchedule[] = schedulesRes.data || [];

    // Get today and next 7 days appointments for availability check
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const { data: existingAppointments } = await supabase
      .from("appointments")
      .select("*")
      .gte("appointment_date", today.toISOString().split("T")[0])
      .lte("appointment_date", nextWeek.toISOString().split("T")[0])
      .neq("status", "cancelled");

    const appointments: Appointment[] = existingAppointments || [];

    // Check if customer exists
    const { data: customer } = await supabase
      .from("customers")
      .select("*")
      .eq("phone", phone_number)
      .maybeSingle();

    // Get upcoming appointments for this customer
    let upcomingAppointments: any[] = [];
    if (customer) {
      const { data: customerAppointments } = await supabase
        .from("appointments")
        .select(`
          *,
          barber:barbers(name),
          service:services(name, price)
        `)
        .eq("customer_id", customer.id)
        .gte("appointment_date", today.toISOString().split("T")[0])
        .neq("status", "cancelled")
        .order("appointment_date", { ascending: true })
        .limit(5);
      upcomingAppointments = customerAppointments || [];
    }

    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    // Build availability info for each barber for the next 3 days
    const availabilityInfo = buildAvailabilityInfo(barbers, schedules, appointments, today);

    const systemPrompt = `Eres un asistente virtual amigable y profesional para una barbería. Tu nombre es "Asistente StyleBook".

INFORMACIÓN DEL NEGOCIO:
- Horario: Lunes a Viernes 9:00 AM - 8:00 PM, Sábados 9:00 AM - 6:00 PM, Domingos cerrado
- Hoy es ${dayNames[today.getDay()]} ${today.toLocaleDateString("es-MX")}

SERVICIOS DISPONIBLES:
${services.map(s => `- ${s.name}: $${s.price} MXN (${s.duration_minutes} min)`).join("\n")}

BARBEROS DISPONIBLES:
${barbers.map(b => `- ${b.name}${b.specialty ? ` (Especialidad: ${b.specialty})` : ""}`).join("\n")}

DISPONIBILIDAD PRÓXIMOS DÍAS:
${availabilityInfo}

${customer ? `CLIENTE: ${customer.name}` : "CLIENTE: Nuevo cliente"}

${upcomingAppointments.length > 0 ? `
PRÓXIMAS CITAS DEL CLIENTE:
${upcomingAppointments.map(a => `- ${a.appointment_date} a las ${a.start_time} con ${a.barber?.name} (${a.service?.name})`).join("\n")}
` : ""}

INSTRUCCIONES:
1. Saluda amablemente y ayuda a agendar citas
2. Cuando el cliente quiera agendar, pregunta por:
   - Servicio deseado
   - Barbero preferido (o sugerir según disponibilidad)
   - Fecha y hora preferida
3. IMPORTANTE: Verifica la disponibilidad antes de confirmar. Si el horario está ocupado, sugiere alternativas.
4. Confirma toda la información antes de agendar
5. Si el cliente tiene citas próximas, infórmale
6. Responde siempre en español de México
7. Sé conciso pero amable (máximo 3-4 líneas por respuesta)
8. Usa emojis con moderación (💈, ✂️, 📅, ✅)

CUANDO TENGAS TODOS LOS DATOS PARA AGENDAR Y HAYAS VERIFICADO DISPONIBILIDAD, responde con un formato especial:
[AGENDAR_CITA]
servicio: <nombre del servicio exacto>
barbero: <nombre del barbero exacto>
fecha: <YYYY-MM-DD>
hora: <HH:MM>
[/AGENDAR_CITA]

SOLO usa el formato de agendar si:
1. Tienes servicio, barbero, fecha Y hora confirmados por el cliente
2. El horario está disponible según la información de disponibilidad

Si el cliente quiere cancelar una cita, responde con:
[CANCELAR_CITA]
fecha: <YYYY-MM-DD>
[/CANCELAR_CITA]

${conversation_context ? `CONTEXTO DE LA CONVERSACIÓN:\n${conversation_context}` : ""}`;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            response: "Lo siento, estamos experimentando alta demanda. Por favor intenta de nuevo en unos minutos. 🙏",
            action: null
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content || 
      "Lo siento, no pude procesar tu mensaje. ¿Podrías intentarlo de nuevo?";

    console.log("AI Response:", assistantMessage);

    // Parse actions from response
    let action = null;
    let cleanResponse = assistantMessage;

    // Check for booking action
    const bookingMatch = assistantMessage.match(/\[AGENDAR_CITA\]([\s\S]*?)\[\/AGENDAR_CITA\]/);
    if (bookingMatch) {
      const bookingData = bookingMatch[1];
      const servicioMatch = bookingData.match(/servicio:\s*(.+)/i);
      const barberoMatch = bookingData.match(/barbero:\s*(.+)/i);
      const fechaMatch = bookingData.match(/fecha:\s*(\d{4}-\d{2}-\d{2})/i);
      const horaMatch = bookingData.match(/hora:\s*(\d{2}:\d{2})/i);

      if (servicioMatch && barberoMatch && fechaMatch && horaMatch) {
        const serviceName = servicioMatch[1].trim();
        const barberName = barberoMatch[1].trim();
        const date = fechaMatch[1];
        const time = horaMatch[1];

        // Find service and barber
        const service = services.find(s => 
          s.name.toLowerCase().includes(serviceName.toLowerCase()) ||
          serviceName.toLowerCase().includes(s.name.toLowerCase())
        );
        const barber = barbers.find(b => 
          b.name.toLowerCase().includes(barberName.toLowerCase()) ||
          barberName.toLowerCase().includes(b.name.toLowerCase())
        );

        if (service && barber) {
          // Check if slot is available
          const isAvailable = checkAvailability(barber.id, date, time, service.duration_minutes, appointments);

          if (!isAvailable) {
            cleanResponse = `😔 Lo siento, ese horario ya está ocupado. ¿Te gustaría que te sugiera otros horarios disponibles con ${barber.name}?`;
          } else {
            // Create or get customer
            let customerId = customer?.id;
            if (!customerId) {
              const { data: newCustomer } = await supabase
                .from("customers")
                .insert({ name: "Cliente WhatsApp", phone: phone_number, whatsapp_id: phone_number })
                .select()
                .single();
              customerId = newCustomer?.id;
            }

            if (customerId) {
              // Calculate end time
              const [hours, minutes] = time.split(":").map(Number);
              const endMinutes = hours * 60 + minutes + service.duration_minutes;
              const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;

              // Create appointment
              const { data: appointment, error: appointmentError } = await supabase
                .from("appointments")
                .insert({
                  customer_id: customerId,
                  barber_id: barber.id,
                  service_id: service.id,
                  appointment_date: date,
                  start_time: time,
                  end_time: endTime,
                  status: "confirmed",
                  source: "whatsapp",
                })
                .select()
                .single();

              if (appointmentError) {
                console.error("Error creating appointment:", appointmentError);
                cleanResponse = "Hubo un problema al agendar tu cita. Por favor intenta de nuevo o contacta directamente al salón. 😔";
              } else {
                action = { type: "booking_created", appointment };
                const formattedDate = new Date(date + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
                cleanResponse = `✅ ¡Cita agendada con éxito!\n\n📅 ${formattedDate} a las ${time}\n💈 ${service.name} con ${barber.name}\n💵 $${service.price} MXN\n\n¡Te esperamos! 🙌`;
              }
            }
          }
        }
      }
      
      // Remove the booking tags from response if we handled it
      cleanResponse = cleanResponse.replace(/\[AGENDAR_CITA\][\s\S]*?\[\/AGENDAR_CITA\]/g, "").trim() || cleanResponse;
    }

    // Check for cancellation action
    const cancelMatch = assistantMessage.match(/\[CANCELAR_CITA\]([\s\S]*?)\[\/CANCELAR_CITA\]/);
    if (cancelMatch && customer) {
      const cancelData = cancelMatch[1];
      const fechaMatch = cancelData.match(/fecha:\s*(\d{4}-\d{2}-\d{2})/i);

      if (fechaMatch) {
        const date = fechaMatch[1];
        const { data: cancelled, error: cancelError } = await supabase
          .from("appointments")
          .update({ status: "cancelled" })
          .eq("customer_id", customer.id)
          .eq("appointment_date", date)
          .neq("status", "cancelled")
          .select()
          .maybeSingle();

        if (cancelled && !cancelError) {
          action = { type: "booking_cancelled", appointment: cancelled };
          cleanResponse = `✅ Tu cita del ${date} ha sido cancelada. Si deseas reagendar, estoy aquí para ayudarte. 📅`;
        } else {
          cleanResponse = `No encontré una cita activa para esa fecha. ¿Podrías verificar la fecha?`;
        }
      }
      
      cleanResponse = cleanResponse.replace(/\[CANCELAR_CITA\][\s\S]*?\[\/CANCELAR_CITA\]/g, "").trim() || cleanResponse;
    }

    return new Response(
      JSON.stringify({ response: cleanResponse, action }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("AI Assistant error:", error);
    return new Response(
      JSON.stringify({ 
        response: "Disculpa, tuve un problema técnico. Por favor intenta de nuevo. 🔧",
        action: null,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildAvailabilityInfo(
  barbers: Barber[], 
  schedules: BarberSchedule[], 
  appointments: Appointment[],
  today: Date
): string {
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const lines: string[] = [];

  // Check next 3 days
  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    const dateStr = date.toISOString().split("T")[0];
    const dayOfWeek = date.getDay();
    const dayName = dayNames[dayOfWeek];

    if (dayOfWeek === 0) continue; // Sunday - closed

    lines.push(`\n${dayName} ${date.getDate()}:`);

    for (const barber of barbers) {
      const dayAppointments = appointments.filter(
        a => a.barber_id === barber.id && a.appointment_date === dateStr
      );

      const busyTimes = dayAppointments.map(a => `${a.start_time.slice(0, 5)}-${a.end_time.slice(0, 5)}`);
      
      if (busyTimes.length === 0) {
        lines.push(`  - ${barber.name}: Disponible todo el día (9:00-${dayOfWeek === 6 ? "18:00" : "20:00"})`);
      } else {
        lines.push(`  - ${barber.name}: Ocupado ${busyTimes.join(", ")}`);
      }
    }
  }

  return lines.join("\n");
}

function checkAvailability(
  barberId: string,
  date: string,
  time: string,
  durationMinutes: number,
  appointments: Appointment[]
): boolean {
  const [hour, minute] = time.split(":").map(Number);
  const startMinutes = hour * 60 + minute;
  const endMinutes = startMinutes + durationMinutes;

  const barberAppointments = appointments.filter(
    a => a.barber_id === barberId && a.appointment_date === date && a.status !== "cancelled"
  );

  for (const apt of barberAppointments) {
    const [aptStartH, aptStartM] = apt.start_time.split(":").map(Number);
    const [aptEndH, aptEndM] = apt.end_time.split(":").map(Number);
    const aptStart = aptStartH * 60 + aptStartM;
    const aptEnd = aptEndH * 60 + aptEndM;

    // Check for overlap
    if (startMinutes < aptEnd && endMinutes > aptStart) {
      return false;
    }
  }

  return true;
}

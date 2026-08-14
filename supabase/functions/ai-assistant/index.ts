import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Precio de claude-haiku-4-5 (el modelo que usa este asistente): $1.00 / $5.00 por millón de tokens.
const HAIKU_INPUT_PRICE_PER_MTOK = 1.0;
const HAIKU_OUTPUT_PRICE_PER_MTOK = 5.0;
const MONTHLY_AI_CAP_USD = 10;

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
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY")!;
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

    // Resolver la organización dueña de esta conversación para limitar su gasto de IA.
    // El asistente aún es de un solo negocio por despliegue (whapify_settings es global por ahora),
    // así que si el cliente todavía no existe usamos la organización configurada en whapify_settings.
    let organizationId: string | null = customer?.organization_id ?? null;
    if (!organizationId) {
      const { data: waSettings } = await supabase
        .from("whapify_settings")
        .select("organization_id")
        .eq("singleton", true)
        .maybeSingle();
      organizationId = waSettings?.organization_id ?? null;
    }

    if (organizationId) {
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);

      const { data: usageRows } = await supabase
        .from("ai_usage_log")
        .select("cost_usd")
        .eq("organization_id", organizationId)
        .gte("created_at", monthStart.toISOString());

      const monthlySpend = (usageRows ?? []).reduce((sum, r) => sum + Number(r.cost_usd), 0);

      if (monthlySpend >= MONTHLY_AI_CAP_USD) {
        return new Response(
          JSON.stringify({
            response: "Hemos alcanzado el límite mensual de uso del asistente de IA para este negocio. Por favor contacta directamente al negocio para continuar.",
            action: null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
${upcomingAppointments.map(a => `- ID: ${a.id} | ${a.appointment_date} a las ${a.start_time} con ${a.barber?.name} (${a.service?.name})`).join("\n")}
` : ""}

INSTRUCCIONES:
1. Saluda amablemente y ayuda a agendar, reagendar o cancelar citas
2. Cuando el cliente quiera agendar, pregunta por:
   - Servicio deseado
   - Barbero preferido (o sugerir según disponibilidad)
   - Fecha y hora preferida
3. IMPORTANTE: Verifica la disponibilidad antes de confirmar. Si el horario está ocupado, sugiere alternativas.
4. ANTES de confirmar la cita, pregunta por el correo electrónico del cliente para enviarle recordatorio y agregarlo a su calendario
5. Confirma toda la información antes de agendar
6. Si el cliente tiene citas próximas, infórmale y ofrece reagendar si lo desea
7. Responde siempre en español de México
8. Sé conciso pero amable (máximo 3-4 líneas por respuesta)
9. Usa emojis con moderación (💈, ✂️, 📅, ✅, 🔄)

FLUJO DE AGENDADO:
1. Recopilar: servicio, barbero, fecha, hora
2. Verificar disponibilidad
3. Pedir correo electrónico (obligatorio para el recordatorio de calendario)
4. Confirmar todos los datos con el cliente
5. Solo entonces usar el formato de agendar

FLUJO DE REAGENDADO:
1. Identificar qué cita quiere cambiar (si tiene varias, preguntar cuál)
2. Preguntar nueva fecha y hora deseada
3. Verificar disponibilidad del nuevo horario
4. Confirmar el cambio con el cliente
5. Usar el formato de reagendar

CUANDO TENGAS TODOS LOS DATOS PARA AGENDAR Y HAYAS VERIFICADO DISPONIBILIDAD, responde con un formato especial:
[AGENDAR_CITA]
servicio: <nombre del servicio exacto>
barbero: <nombre del barbero exacto>
fecha: <YYYY-MM-DD>
hora: <HH:MM>
email: <correo del cliente>
[/AGENDAR_CITA]

SOLO usa el formato de agendar si:
1. Tienes servicio, barbero, fecha, hora Y email confirmados por el cliente
2. El horario está disponible según la información de disponibilidad
3. El cliente ha confirmado que todos los datos son correctos

Si el cliente quiere REAGENDAR una cita existente, responde con:
[REAGENDAR_CITA]
cita_original: <fecha original YYYY-MM-DD>
nueva_fecha: <YYYY-MM-DD>
nueva_hora: <HH:MM>
barbero: <nombre del barbero, puede ser el mismo o diferente>
[/REAGENDAR_CITA]

SOLO usa el formato de reagendar si:
1. El cliente tiene una cita existente que quiere cambiar
2. Has verificado disponibilidad del nuevo horario
3. El cliente ha confirmado el cambio

Si el cliente quiere cancelar una cita, PRIMERO pregúntale el motivo de la cancelación y luego responde con:
[CANCELAR_CITA]
fecha: <YYYY-MM-DD>
motivo: <motivo indicado por el cliente>
[/CANCELAR_CITA]

SIEMPRE que la conversación termine (el cliente se despide, se agenda/cancela/reagenda una cita, o se resuelve su consulta), añade al final de tu respuesta un resumen interno con este formato (el cliente NO lo verá):
[NOTA_CLIENTE]
resumen: <2-3 líneas: qué pidió el cliente, qué se le respondió y el resultado>
[/NOTA_CLIENTE]

${conversation_context ? `CONTEXTO DE LA CONVERSACIÓN:\n${conversation_context}` : ""}`;

    // Call Anthropic (Claude) directly
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        system: systemPrompt,
        messages: [
          { role: "user", content: message },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Anthropic API error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({
            response: "Lo siento, estamos experimentando alta demanda. Por favor intenta de nuevo en unos minutos. 🙏",
            action: null
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Anthropic API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.content?.[0]?.text ||
      "Lo siento, no pude procesar tu mensaje. ¿Podrías intentarlo de nuevo?";

    console.log("AI Response:", assistantMessage);

    if (organizationId && aiData.usage) {
      const inputTokens = aiData.usage.input_tokens ?? 0;
      const outputTokens = aiData.usage.output_tokens ?? 0;
      const costUsd =
        (inputTokens / 1_000_000) * HAIKU_INPUT_PRICE_PER_MTOK +
        (outputTokens / 1_000_000) * HAIKU_OUTPUT_PRICE_PER_MTOK;

      const { error: usageLogError } = await supabase.from("ai_usage_log").insert({
        organization_id: organizationId,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: costUsd,
      });
      if (usageLogError) console.error("Error registrando uso de IA:", usageLogError);
    }

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

      const emailMatch = bookingData.match(/email:\s*(.+)/i);

      if (servicioMatch && barberoMatch && fechaMatch && horaMatch && emailMatch) {
        const serviceName = servicioMatch[1].trim();
        const barberName = barberoMatch[1].trim();
        const date = fechaMatch[1];
        const time = horaMatch[1];
        const email = emailMatch[1].trim();

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
            // Create or get customer (and update email if exists)
            let customerId = customer?.id;
            if (!customerId) {
              const { data: newCustomer } = await supabase
                .from("customers")
                .insert({ name: "Cliente WhatsApp", phone: phone_number, whatsapp_id: phone_number, email })
                .select()
                .single();
              customerId = newCustomer?.id;
            } else if (email && email !== customer?.email) {
              // Update customer email if different
              await supabase
                .from("customers")
                .update({ email })
                .eq("id", customer.id);
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
      const motivoMatch = cancelData.match(/motivo:\s*(.+)/i);

      if (fechaMatch) {
        const date = fechaMatch[1];
        const reason = motivoMatch ? motivoMatch[1].trim() : "No especificado por el cliente";
        const { data: cancelled, error: cancelError } = await supabase
          .from("appointments")
          .update({ status: "cancelled", cancellation_reason: reason })
          .eq("customer_id", customer.id)
          .eq("appointment_date", date)
          .neq("status", "cancelled")
          .select()
          .maybeSingle();

        if (cancelled && !cancelError) {
          action = { type: "booking_cancelled", appointment: cancelled };
          await supabase.from("customer_notes").insert({
            customer_id: customer.id,
            organization_id: customer.organization_id,
            note_type: "cancellation",
            source: "whatsapp",
            content: `Canceló la cita del ${date}. Motivo: ${reason}`,
          });
          cleanResponse = `✅ Tu cita del ${date} ha sido cancelada. Si deseas reagendar, estoy aquí para ayudarte. 📅`;
        } else {
          cleanResponse = `No encontré una cita activa para esa fecha. ¿Podrías verificar la fecha?`;
        }
      }
      
      cleanResponse = cleanResponse.replace(/\[CANCELAR_CITA\][\s\S]*?\[\/CANCELAR_CITA\]/g, "").trim() || cleanResponse;
    }

    // Check for reschedule action
    const rescheduleMatch = assistantMessage.match(/\[REAGENDAR_CITA\]([\s\S]*?)\[\/REAGENDAR_CITA\]/);
    if (rescheduleMatch && customer) {
      const rescheduleData = rescheduleMatch[1];
      const citaOriginalMatch = rescheduleData.match(/cita_original:\s*(\d{4}-\d{2}-\d{2})/i);
      const nuevaFechaMatch = rescheduleData.match(/nueva_fecha:\s*(\d{4}-\d{2}-\d{2})/i);
      const nuevaHoraMatch = rescheduleData.match(/nueva_hora:\s*(\d{2}:\d{2})/i);
      const barberoMatch = rescheduleData.match(/barbero:\s*(.+)/i);

      if (citaOriginalMatch && nuevaFechaMatch && nuevaHoraMatch) {
        const originalDate = citaOriginalMatch[1];
        const newDate = nuevaFechaMatch[1];
        const newTime = nuevaHoraMatch[1];
        const barberName = barberoMatch ? barberoMatch[1].trim() : null;

        // Find the original appointment
        const { data: originalAppointment } = await supabase
          .from("appointments")
          .select(`
            *,
            barber:barbers(id, name),
            service:services(id, name, price, duration_minutes)
          `)
          .eq("customer_id", customer.id)
          .eq("appointment_date", originalDate)
          .neq("status", "cancelled")
          .maybeSingle();

        if (originalAppointment) {
          // Determine barber (same or different)
          let targetBarberId = originalAppointment.barber_id;
          let targetBarberName = originalAppointment.barber?.name;
          
          if (barberName) {
            const newBarber = barbers.find(b => 
              b.name.toLowerCase().includes(barberName.toLowerCase()) ||
              barberName.toLowerCase().includes(b.name.toLowerCase())
            );
            if (newBarber) {
              targetBarberId = newBarber.id;
              targetBarberName = newBarber.name;
            }
          }

          // Check availability for new slot (excluding the original appointment)
          const durationMinutes = originalAppointment.service?.duration_minutes || 30;
          const otherAppointments = appointments.filter(a => a.id !== originalAppointment.id);
          const isAvailable = checkAvailability(targetBarberId, newDate, newTime, durationMinutes, otherAppointments);

          if (!isAvailable) {
            cleanResponse = `😔 Lo siento, ese nuevo horario ya está ocupado. ¿Te gustaría que te sugiera otros horarios disponibles?`;
          } else {
            // Calculate new end time
            const [hours, minutes] = newTime.split(":").map(Number);
            const endMinutes = hours * 60 + minutes + durationMinutes;
            const newEndTime = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;

            // Update the appointment (keeps history by updating, not deleting)
            const { data: updatedAppointment, error: updateError } = await supabase
              .from("appointments")
              .update({
                appointment_date: newDate,
                start_time: newTime,
                end_time: newEndTime,
                barber_id: targetBarberId,
                status: "confirmed",
                notes: `Reagendado desde ${originalDate} ${originalAppointment.start_time}. ${originalAppointment.notes || ""}`
              })
              .eq("id", originalAppointment.id)
              .select()
              .single();

            if (updateError) {
              console.error("Error rescheduling appointment:", updateError);
              cleanResponse = "Hubo un problema al reagendar tu cita. Por favor intenta de nuevo. 😔";
            } else {
              action = { 
                type: "booking_rescheduled", 
                appointment: updatedAppointment,
                previous_date: originalDate,
                previous_time: originalAppointment.start_time
              };
              const formattedNewDate = new Date(newDate + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
              cleanResponse = `🔄 ¡Cita reagendada con éxito!\n\n📅 Nueva fecha: ${formattedNewDate} a las ${newTime}\n💈 Con ${targetBarberName}\n\n¡Te esperamos! 🙌`;
            }
          }
        } else {
          cleanResponse = `No encontré una cita activa para el ${originalDate}. ¿Podrías verificar la fecha de tu cita original?`;
        }
      }

      cleanResponse = cleanResponse.replace(/\[REAGENDAR_CITA\][\s\S]*?\[\/REAGENDAR_CITA\]/g, "").trim() || cleanResponse;
    }

    // Conversation summary note -> saved into the customer's history
    const noteMatch = assistantMessage.match(/\[NOTA_CLIENTE\]([\s\S]*?)\[\/NOTA_CLIENTE\]/);
    if (noteMatch) {
      const resumenMatch = noteMatch[1].match(/resumen:\s*([\s\S]+)/i);
      const summary = (resumenMatch ? resumenMatch[1] : noteMatch[1]).trim();
      // Resolve the customer (it may have been created during this conversation)
      let noteCustomer = customer;
      if (!noteCustomer) {
        const { data: c } = await supabase
          .from("customers").select("id, organization_id")
          .eq("phone", phone_number).maybeSingle();
        noteCustomer = c as any;
      }
      if (noteCustomer && summary) {
        const { error: noteError } = await supabase.from("customer_notes").insert({
          customer_id: noteCustomer.id,
          organization_id: noteCustomer.organization_id,
          content: summary,
          note_type: "chat_summary",
          source: "whatsapp",
        });
        if (noteError) console.error("Error saving customer note:", noteError);
      }
      cleanResponse = cleanResponse
        .replace(/\[NOTA_CLIENTE\][\s\S]*?\[\/NOTA_CLIENTE\]/g, "").trim() || cleanResponse;
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

import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "staff" | "barber" | null;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isSubscriptionCanceled, setIsSubscriptionCanceled] = useState(false);
  const [isSubscriptionSuspended, setIsSubscriptionSuspended] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role fetch to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setIsPlatformAdmin(false);
          setIsSubscriptionCanceled(false);
          setIsSubscriptionSuspended(false);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const [{ data, error }, { data: platformAdmin }, { data: subscriptionRows }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
        supabase.rpc("is_platform_admin"),
        supabase.rpc("get_my_subscription"),
      ]);

      if (error) {
        console.error("Error fetching role:", error);
        setRole(null);
      } else {
        setRole(data?.role as UserRole ?? null);
      }
      setIsPlatformAdmin(Boolean(platformAdmin));
      // Sin fila de suscripción (orgs creadas antes de este sistema, o el
      // admin de plataforma) = acceso sin restricción. Solo bloquea cuando
      // la organización tiene una suscripción y quedó explícitamente
      // 'canceled', o 'suspended' por falta de pago (ver wompi-charge-subscriptions).
      const subscription = Array.isArray(subscriptionRows) ? subscriptionRows[0] : null;
      setIsSubscriptionCanceled(!platformAdmin && subscription?.status === "canceled");
      setIsSubscriptionSuspended(!platformAdmin && subscription?.status === "suspended");
    } catch (err) {
      console.error("Error fetching role:", err);
      setRole(null);
      setIsPlatformAdmin(false);
      setIsSubscriptionCanceled(false);
      setIsSubscriptionSuspended(false);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string, salonName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name, salon_name: salonName },
      },
    });

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    role,
    loading,
    isAuthenticated: !!user,
    isAdmin: role === "admin",
    isStaff: role === "staff" || role === "admin",
    isBarber: role === "barber",
    isPlatformAdmin,
    isSubscriptionCanceled,
    isSubscriptionSuspended,
    signIn,
    signUp,
    signOut,
  };
}

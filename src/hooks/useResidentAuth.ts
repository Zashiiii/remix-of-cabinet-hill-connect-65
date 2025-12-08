import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface ResidentProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  contactNumber?: string;
  address?: string;
  householdId?: string;
  birthDate?: string;
  civilStatus?: string;
  gender?: string;
  occupation?: string;
  religion?: string;
  educationAttainment?: string;
  employmentStatus?: string;
}

export const useResidentAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ResidentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("residents")
        .select(`
          *,
          households (
            id,
            household_number,
            address,
            barangay,
            city,
            province
          )
        `)
        .eq("user_id", userId)
        .maybeSingle();

      if (data) {
        setProfile({
          id: data.id,
          userId: data.user_id || userId,
          firstName: data.first_name || "",
          lastName: data.last_name || "",
          fullName: `${data.first_name} ${data.middle_name ? data.middle_name + ' ' : ''}${data.last_name}${data.suffix ? ' ' + data.suffix : ''}`.trim(),
          email: data.email || "",
          contactNumber: data.contact_number || undefined,
          address: data.households 
            ? `${data.households.address || ''}, ${data.households.barangay || ''}, ${data.households.city || ''}`
            : undefined,
          householdId: data.household_id || undefined,
          birthDate: data.birth_date || undefined,
          civilStatus: data.civil_status || undefined,
          gender: data.gender || undefined,
          occupation: data.occupation || undefined,
          religion: data.religion || undefined,
          educationAttainment: data.education_attainment || undefined,
          employmentStatus: data.employment_status || undefined,
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return {
    user,
    session,
    profile,
    isAuthenticated: !!user,
    isLoading,
    logout,
    refetchProfile: () => user && fetchProfile(user.id),
  };
};

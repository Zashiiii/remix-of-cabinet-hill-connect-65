import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getResidentCount, getPendingRegistrationCount } from "@/utils/staffApi";
import { useStaffAuthContext } from "@/context/StaffAuthContext";

interface AgeGroups {
  "0-14": number;
  "15-24": number;
  "25-44": number;
  "45-59": number;
  "60+": number;
}

interface IncidentSummary {
  total: number;
  byType: { [key: string]: number };
  resolved: number;
  pending: number;
}

interface BarangayStats {
  totalResidents: number;
  totalHouseholds: number;
  maleCount: number;
  femaleCount: number;
  ageGroups: AgeGroups;
  incidentSummary: IncidentSummary;
  pendingRegistrationCount: number;
  isLoading: boolean;
}

interface BarangayStatsContextType extends BarangayStats {
  refreshStats: () => Promise<void>;
}

const defaultStats: BarangayStats = {
  totalResidents: 0,
  totalHouseholds: 0,
  maleCount: 0,
  femaleCount: 0,
  ageGroups: {
    "0-14": 0,
    "15-24": 0,
    "25-44": 0,
    "45-59": 0,
    "60+": 0,
  },
  incidentSummary: {
    total: 0,
    byType: {},
    resolved: 0,
    pending: 0,
  },
  pendingRegistrationCount: 0,
  isLoading: true,
};

const BarangayStatsContext = createContext<BarangayStatsContextType | undefined>(undefined);

// Helper to calculate age from birth date
const calculateAge = (birthDate: string | null): number => {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export const BarangayStatsProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useStaffAuthContext();
  const [stats, setStats] = useState<BarangayStats>(defaultStats);

  const refreshStats = useCallback(async () => {
    if (!isAuthenticated) return;

    setStats((prev) => ({ ...prev, isLoading: true }));

    try {
      // Fetch all data in parallel
      const [
        residentCountResult,
        pendingCountResult,
        householdsResult,
        residentsResult,
        incidentsResult,
      ] = await Promise.all([
        getResidentCount(),
        getPendingRegistrationCount(),
        supabase.rpc("get_all_households_for_staff"),
        supabase.rpc("get_all_residents_for_staff"),
        supabase.rpc("get_all_incidents_for_staff", {
          p_approval_status: "approved",
          p_status: null,
        }),
      ]);

      // Calculate demographics from residents data
      let maleCount = 0;
      let femaleCount = 0;
      const ageGroups: AgeGroups = {
        "0-14": 0,
        "15-24": 0,
        "25-44": 0,
        "45-59": 0,
        "60+": 0,
      };

      const residents = residentsResult.data || [];
      residents.forEach((r: any) => {
        // Gender counts
        const gender = r.gender?.toLowerCase();
        if (gender === "male") maleCount++;
        else if (gender === "female") femaleCount++;

        // Age group counts
        const age = calculateAge(r.birth_date);
        if (age <= 14) ageGroups["0-14"]++;
        else if (age <= 24) ageGroups["15-24"]++;
        else if (age <= 44) ageGroups["25-44"]++;
        else if (age <= 59) ageGroups["45-59"]++;
        else ageGroups["60+"]++;
      });

      // Calculate incident summary
      const incidentsData = incidentsResult.data || [];
      const byType: { [key: string]: number } = {};
      let resolved = 0;
      let pending = 0;

      incidentsData.forEach((incident: any) => {
        byType[incident.incident_type] = (byType[incident.incident_type] || 0) + 1;
        if (incident.status === "resolved" || incident.status === "closed") {
          resolved++;
        } else {
          pending++;
        }
      });

      setStats({
        totalResidents: residentCountResult || residents.length,
        totalHouseholds: householdsResult.data?.length || 0,
        maleCount,
        femaleCount,
        ageGroups,
        incidentSummary: {
          total: incidentsData.length,
          byType,
          resolved,
          pending,
        },
        pendingRegistrationCount: pendingCountResult || 0,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error refreshing barangay stats:", error);
      setStats((prev) => ({ ...prev, isLoading: false }));
    }
  }, [isAuthenticated]);

  // Initial load when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshStats();
    }
  }, [isAuthenticated, refreshStats]);

  // Real-time subscriptions
  useEffect(() => {
    if (!isAuthenticated) return;

    // Subscribe to residents table changes
    const residentsChannel = supabase
      .channel("barangay-stats-residents")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "residents",
        },
        () => {
          console.log("Residents changed, refreshing stats...");
          refreshStats();
        }
      )
      .subscribe();

    // Subscribe to households table changes
    const householdsChannel = supabase
      .channel("barangay-stats-households")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "households",
        },
        () => {
          console.log("Households changed, refreshing stats...");
          refreshStats();
        }
      )
      .subscribe();

    // Subscribe to incidents table changes
    const incidentsChannel = supabase
      .channel("barangay-stats-incidents")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "incidents",
        },
        () => {
          console.log("Incidents changed, refreshing stats...");
          refreshStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(residentsChannel);
      supabase.removeChannel(householdsChannel);
      supabase.removeChannel(incidentsChannel);
    };
  }, [isAuthenticated, refreshStats]);

  return (
    <BarangayStatsContext.Provider value={{ ...stats, refreshStats }}>
      {children}
    </BarangayStatsContext.Provider>
  );
};

export const useBarangayStats = () => {
  const context = useContext(BarangayStatsContext);
  if (context === undefined) {
    throw new Error("useBarangayStats must be used within a BarangayStatsProvider");
  }
  return context;
};

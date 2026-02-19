import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CertificateTypeOption {
  id: string;
  name: string;
}

export function useCertificateTypes() {
  const [types, setTypes] = useState<CertificateTypeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const { data, error } = await supabase
          .from("certificate_types")
          .select("id, name")
          .eq("is_active", true)
          .order("name");

        if (error) throw error;
        setTypes(data || []);
      } catch (err) {
        console.error("Error fetching certificate types:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTypes();
  }, []);

  return { types, isLoading };
}

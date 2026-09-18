import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export function useSessionUser() {
  return useQuery({
    queryKey: ["session-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return null;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      return {
        id: user.id,
        email: user.email ?? "",
        name: (user.user_metadata?.["full_name"] as string | undefined) ?? user.email ?? "",
        role: roles?.[0]?.role ?? "staff",
      };
    },
  });
}

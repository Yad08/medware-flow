import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Item = Database["public"]["Tables"]["items"]["Row"];
export type Pallet = Database["public"]["Tables"]["pallets"]["Row"];
export type Container = Database["public"]["Tables"]["containers"]["Row"];
export type PalletContainer = Database["public"]["Tables"]["pallet_container"]["Row"];

export { supabase };

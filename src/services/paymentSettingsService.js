import supabase from "../config/supabase.js";

export const getTelebirrSettings = async () => {
  const { data, error } = await supabase
    .from("payment_settings")
    .select("phone_number, account_name")
    .eq("payment_method", "TELEBIRR")
    .single();

  if (error) {
    console.error("❌ Failed to get Telebirr settings:", error);
    throw error;
  }

  return data;
};

export const updateTelebirrPhone = async (phoneNumber) => {
  const { data, error } = await supabase
    .from("payment_settings")
    .update({
      phone_number: phoneNumber,
      updated_at: new Date().toISOString(),
    })
    .eq("payment_method", "TELEBIRR")
    .select("phone_number, account_name")
    .single();

  if (error) {
    console.error("❌ Failed to update Telebirr phone:", error);
    throw error;
  }

  return data;
};

export const updateTelebirrAccountName = async (accountName) => {
  const { data, error } = await supabase
    .from("payment_settings")
    .update({
      account_name: accountName,
      updated_at: new Date().toISOString(),
    })
    .eq("payment_method", "TELEBIRR")
    .select("phone_number, account_name")
    .single();

  if (error) {
    console.error("❌ Failed to update Telebirr account name:", error);
    throw error;
  }

  return data;
};

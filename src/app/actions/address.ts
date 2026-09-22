"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addUserAddress(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const label = formData.get("label") as string;
  const recipientName = formData.get("recipientName") as string;
  const phone = formData.get("phone") as string;
  const streetAddress = formData.get("streetAddress") as string;
  const barangay = formData.get("barangay") as string;
  const city = formData.get("city") as string;
  const province = formData.get("province") as string;
  const postalCode = formData.get("postalCode") as string;
  const isDefault = formData.get("isDefault") === "on";

  // If set to default, unset other default addresses for this user
  if (isDefault) {
    await supabase
      .from("user_addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);
  }

  const { error } = await supabase.from("user_addresses").insert({
    user_id: user.id,
    label,
    recipient_name: recipientName,
    phone,
    street_address: streetAddress,
    barangay,
    city,
    province,
    postal_code: postalCode,
    is_default: isDefault,
  });

  if (error) return { error: error.message };

  revalidatePath("/account");
  return { success: "Address added successfully!" };
}

export async function setDefaultAddress(addressId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Unset all
  await supabase
    .from("user_addresses")
    .update({ is_default: false })
    .eq("user_id", user.id);

  // Set selected
  const { error } = await supabase
    .from("user_addresses")
    .update({ is_default: true })
    .eq("id", addressId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/account");
  return { success: "Default address updated!" };
}

export async function deleteAddress(addressId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("user_addresses")
    .delete()
    .eq("id", addressId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/account");
  return { success: "Address deleted." };
}
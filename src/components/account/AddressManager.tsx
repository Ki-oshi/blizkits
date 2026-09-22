"use client";

import { useState, useTransition, useMemo } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import { MapPin, Plus, CheckCircle2, Trash2, Star, AlertCircle } from "lucide-react";

interface AddressManagerProps {
  initialAddresses: any[];
}

export default function AddressManager({ initialAddresses = [] }: AddressManagerProps) {
  const [addresses, setAddresses] = useState(initialAddresses || []);
  const [isAdding, setIsAdding] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  const [coords, setCoords] = useState({ lat: 14.5995, lng: 120.9842 });
  const supabase = createClient();

  const LocationMap = useMemo(() => dynamic(
    () => import("@/components/account/LocationMap"),
    { 
      ssr: false,
      loading: () => <div className="h-64 w-full rounded-xl bg-neutral-100 flex items-center justify-center text-xs text-neutral-400">Loading map...</div>
    }
  ), []);

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);

    const recipientName = formData.get("recipientName") as string;
    const phone = formData.get("phone") as string;
    const addressLine = formData.get("addressLine") as string;
    const city = formData.get("city") as string;
    const province = formData.get("province") as string;
    const postalCode = formData.get("postalCode") as string;
    const isDefault = formData.get("isDefault") === "on";

    startTransition(async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setMessage({ type: "error", text: "Unauthorized session. Please log in again." });
        return;
      }

      // If set to default, clear other defaults in the database first
      if (isDefault) {
        await supabase
          .from("addresses")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      // Mapped strictly to your 10 database columns
      const newAddressData = {
        user_id: user.id,
        recipient_name: recipientName,
        phone: phone,
        address_line: addressLine,
        city: city,
        province: province,
        postal_code: postalCode,
        is_default: isDefault,
      };

      console.log("Submitting address payload to 'addresses' table:", newAddressData);

      const { data, error } = await supabase
        .from("addresses")
        .insert(newAddressData)
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        setMessage({ type: "error", text: `Database Error: ${error.message}` });
      } else {
        console.log("Address saved successfully to Supabase:", data);
        if (isDefault) {
          setAddresses((prev: any[]) => (prev || []).map(a => ({ ...a, is_default: false })).concat(data));
        } else {
          setAddresses((prev: any[]) => [...(prev || []), data]);
        }
        
        setMessage({ type: "success", text: "Address added successfully!" });
        setIsAdding(false);
      }
    });
  };

  const handleSetDefault = async (id: string) => {
    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
      await supabase.from("addresses").update({ is_default: true }).eq("id", id);

      setAddresses((prev: any[]) => (prev || []).map(a => ({ ...a, is_default: a.id === id })));
      setMessage({ type: "success", text: "Default address updated!" });
    });
  };

  const handleDelete = async (id: string) => {
    startTransition(async () => {
      await supabase.from("addresses").delete().eq("id", id);
      setAddresses((prev: any[]) => (prev || []).filter(a => a.id !== id));
      setMessage({ type: "success", text: "Address deleted." });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Shipping Addresses</h2>
          <p className="text-xs text-neutral-500 mt-1">Manage delivery locations and set your default destination.</p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white flex items-center gap-1.5 cursor-pointer">
            <Plus className="h-4 w-4" /> Add New Address
          </Button>
        )}
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
          message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />} 
          {message.text}
        </div>
      )}

      {/* Add Address Form Modal / View */}
      {isAdding && (
        <form onSubmit={handleAddSubmit} className="rounded-2xl border border-pink-200 bg-white p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">New Shipping Address</h3>
            <button type="button" onClick={() => setIsAdding(false)} className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 cursor-pointer">Cancel</button>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-pink-500" /> Pin your delivery area:
            </label>
            <LocationMap 
              onLocationSelect={(lat, lng) => setCoords({ lat, lng })} 
              initialLat={coords.lat} 
              initialLng={coords.lng} 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">Recipient Full Name</label>
              <input name="recipientName" required placeholder="Juan Dela Cruz" className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-pink-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">Phone Number</label>
              <input name="phone" required placeholder="+63 912 345 6789" className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-pink-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-800 mb-1">Street Address / House No. / Barangay / Bldg</label>
            <input name="addressLine" required placeholder="123 Block 4, Brgy. San Antonio" className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-pink-500" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">City / Municipality</label>
              <input name="city" required placeholder="Pasig City" className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-pink-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">Province</label>
              <input name="province" required placeholder="Metro Manila" className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-pink-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">Postal Code</label>
              <input name="postalCode" required placeholder="1600" className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-pink-500" />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="isDefault" name="isDefault" className="h-4 w-4 accent-pink-500 rounded cursor-pointer" />
            <label htmlFor="isDefault" className="text-xs font-bold text-neutral-800 cursor-pointer">Set as default shipping address</label>
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={isPending} className="bg-pink-500 hover:bg-pink-600 text-white w-full sm:w-auto cursor-pointer">
              {isPending ? "Saving Address..." : "Save Address"}
            </Button>
          </div>
        </form>
      )}

      {/* Address List */}
      {(addresses || []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-8 text-center">
          <MapPin className="mx-auto h-8 w-8 text-neutral-400 mb-2" />
          <p className="text-sm font-medium text-neutral-900">No saved addresses</p>
          <p className="text-xs text-neutral-500 mt-1">Add your shipping destination to prepare for seamless checkout.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {(addresses || []).map((addr) => (
            <div key={addr.id} className={`p-5 rounded-2xl border transition-all ${addr.is_default ? "border-pink-500 bg-pink-50/10 shadow-sm" : "border-neutral-200 bg-white"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {addr.is_default && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-100">
                        <Star className="h-3 w-3 fill-pink-500" /> Default Address
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-neutral-900 pt-1">{addr.recipient_name} <span className="text-neutral-500 font-normal">({addr.phone})</span></p>
                  <p className="text-xs text-neutral-700 leading-relaxed">
                    {addr.address_line}, {addr.city}, {addr.province}, {addr.postal_code}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!addr.is_default && (
                    <button 
                      onClick={() => handleSetDefault(addr.id)}
                      disabled={isPending}
                      className="text-xs font-semibold text-neutral-700 hover:text-pink-500 underline cursor-pointer px-2 py-1"
                    >
                      Set Default
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(addr.id)}
                    disabled={isPending}
                    className="p-2 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                    title="Delete Address"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
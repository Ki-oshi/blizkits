import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Fetch quick stats directly from the database
  const { count: productCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  const { count: orderCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Dashboard</h1>
      <p className="mt-2 text-sm text-neutral-500">Welcome to the BLIZKITS control panel.</p>
      
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Metric Cards */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Total Revenue</p>
          <p className="mt-2 text-3xl font-bold text-neutral-900">₱0</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Active Orders</p>
          <p className="mt-2 text-3xl font-bold text-neutral-900">{orderCount || 0}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Products in Stock</p>
          <p className="mt-2 text-3xl font-bold text-neutral-900">{productCount || 0}</p>
        </div>
      </div>
    </div>
  );
}
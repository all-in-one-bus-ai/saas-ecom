import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const demoUsers = [
      {
        id: "aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa",
        email: "superadmin@demo.com",
        password: "Demo1234!",
        fullName: "Super Admin",
        systemRole: "super_admin",
      },
      {
        id: "aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa",
        email: "storeadmin@demo.com",
        password: "Demo1234!",
        fullName: "Store Admin",
        systemRole: null,
      },
      {
        id: "aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa",
        email: "manager@demo.com",
        password: "Demo1234!",
        fullName: "Store Manager",
        systemRole: null,
      },
      {
        id: "aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa",
        email: "operative@demo.com",
        password: "Demo1234!",
        fullName: "Store Operative",
        systemRole: null,
      },
    ];

    const results = [];

    for (const u of demoUsers) {
      const { data: existing } = await supabase.auth.admin.getUserById(u.id);
      if (existing?.user) {
        const { error: updateErr } = await supabase.auth.admin.updateUserById(u.id, {
          password: u.password,
          email_confirm: true,
          user_metadata: { full_name: u.fullName },
        });
        results.push({ email: u.email, action: "updated", error: updateErr?.message });
      } else {
        const { error: createErr } = await supabase.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
        });
        results.push({ email: u.email, action: "created", error: createErr?.message });
      }

      if (u.systemRole) {
        await supabase
          .from("user_profiles")
          .upsert({ id: u.id, full_name: u.fullName, system_role: u.systemRole }, { onConflict: "id" });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Activity, Mail, Lock, ArrowRight, KeyRound, Shield, Users, BarChart3, Database, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "../lib/supabaseClient";
import { createClient } from "@supabase/supabase-js";
import MagicRings from "@/components/MagicRings";
export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — LAMS" }, { name: "description", content: "Sign in to LAMS workforce operations platform." }] }),
  component: LoginPage,
});

// Admin service role client to manage auth seeding directly from UI
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaGNxc2ZnenRjY21lZG9uc3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTE1NTg3MSwiZXhwIjoyMDk0NzMxODcxfQ.vEV4_kPfPGHODWhb1qQW-JGd7nT_xgH5Ak__9id9pK8";
const adminClient = createClient("https://gjhcqsfgztccmedonsyx.supabase.co", serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const TARGET_USERS = [
  {
    email: "hr@leaveflow.com",
    password: "password123",
    name: "Sarah Reyes",
    role: "hr",
    department: "Human Resources",
    designation: "HR Administrator"
  },
  {
    email: "hr@lams.com",
    password: "Admin@1234",
    name: "Sarah Reyes",
    role: "hr",
    department: "Human Resources",
    designation: "HR Administrator"
  },
  {
    email: "manager@leaveflow.com",
    password: "password123",
    name: "Daniel Park",
    role: "manager",
    department: "Engineering",
    designation: "Engineering Manager"
  },
  {
    email: "employee@leaveflow.com",
    password: "password123",
    name: "Arjun Mehta",
    role: "employee",
    department: "Engineering",
    designation: "Sr. Engineer"
  },
  {
    email: "superadmin@leaveflow.com",
    password: "password123",
    name: "System Administrator",
    role: "super_admin",
    department: "System Administration",
    designation: "Super Admin"
  }
];

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [ssoLoading, setSsoLoading] = useState<string | null>(null);
  const [ssoError, setSsoError] = useState("");
  const [showSeeder, setShowSeeder] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedingLog, setSeedingLog] = useState<string[]>([]);

  useEffect(() => {
    // Run initial scan to see if target users exist
    scanDatabase();

    // Check URL for SSO callback errors
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err === 'no_employee_record') {
      setSsoError('Your account is not set up in LeaveFlow yet. Contact HR.');
    } else if (err === 'auth_failed') {
      setSsoError('Authentication failed. Please try again.');
    } else if (err) {
      setSsoError('SSO Error: ' + err);
    }
  }, []);

  const scanDatabase = async () => {
    try {
      const logs: string[] = [];
      const { data: { users }, error: authError } = await adminClient.auth.admin.listUsers();
      
      if (authError) {
        logs.push(`⚠️ Auth listing error: ${authError.message}`);
      } else {
        logs.push(`🔍 Found ${users?.length || 0} users in Supabase Auth.`);
        TARGET_USERS.forEach(target => {
          const match = users?.find(u => u.email === target.email);
          if (match) {
            logs.push(`✅ Auth user exists: ${target.email}`);
          } else {
            logs.push(`❌ Auth user missing: ${target.email}`);
          }
        });
      }
      setSeedingLog(logs);
    } catch (e: any) {
      setSeedingLog([`⚠️ Scan failed: ${e.message}`]);
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    const logs: string[] = ["Starting database repair & seeding..."];
    setSeedingLog(logs);

    try {
      // 1. Fetch current auth users
      const { data: { users }, error: authError } = await adminClient.auth.admin.listUsers();
      if (authError) throw authError;

      for (const target of TARGET_USERS) {
        let authId = "";
        const existingAuth = users?.find(u => u.email === target.email);

        if (existingAuth) {
          authId = existingAuth.id;
          logs.push(`ℹ️ Auth user already exists: ${target.email}`);
        } else {
          logs.push(`➕ Creating auth user: ${target.email}...`);
          const { data: newAuth, error: createError } = await adminClient.auth.admin.createUser({
            email: target.email,
            password: target.password,
            email_confirm: true
          });
          if (createError) {
            logs.push(`❌ Failed to create ${target.email}: ${createError.message}`);
            continue;
          }
          authId = newAuth.user.id;
          logs.push(`✅ Created auth user: ${target.email} (ID: ${authId})`);
        }

        // 2. Link or create in employees table
        logs.push(`🔗 Linking to employees table: ${target.email}...`);
        const { data: existingEmp } = await adminClient
          .from("employees")
          .select("id, email")
          .eq("email", target.email)
          .maybeSingle();

        if (existingEmp) {
          const { error: updateError } = await adminClient
            .from("employees")
            .update({ auth_id: authId })
            .eq("email", target.email);

          if (updateError) {
            logs.push(`❌ Failed to link employee: ${updateError.message}`);
          } else {
            logs.push(`✅ Linked existing employee: ${target.email}`);
          }
        } else {
          const { error: insertError } = await adminClient
            .from("employees")
            .insert({
              auth_id: authId,
              name: target.name,
              email: target.email,
              role: target.role,
              department: target.department,
              designation: target.designation
            });

          if (insertError) {
            logs.push(`❌ Failed to insert employee: ${insertError.message}`);
          } else {
            logs.push(`✅ Created and linked new employee profile: ${target.email}`);
          }
        }
        setSeedingLog([...logs]);
      }
      logs.push("🎉 Seeding & database repair complete!");
    } catch (e: any) {
      logs.push(`❌ Error: ${e.message}`);
    } finally {
      setSeedingLog([...logs]);
      setIsSeeding(false);
    }
  };

  async function handleGoogleLogin() {
    setSsoLoading('google');
    setSsoError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setSsoError('Google login failed: ' + err.message);
      setSsoLoading(null);
    }
  }

  async function handleMicrosoftLogin() {
    setSsoLoading('microsoft');
    setSsoError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
          scopes: 'email profile openid'
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setSsoError('Microsoft login failed: ' + err.message);
      setSsoLoading(null);
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    // Custom Authentication Check
    const { data: user, error } = await adminClient
      .from("employees")
      .select("*")
      .eq("email", email)
      .eq("password", password)
      .maybeSingle();
      
    if (error) {
      setError("System error: " + error.message);
      setLoading(false);
    } else if (!user) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      // Create local session bypassing Supabase cookies
      localStorage.setItem("lams_session", JSON.stringify(user));
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/20 selection:text-white font-sans antialiased flex flex-col items-center justify-center relative overflow-hidden">
      {/* Magic Rings Background */}
      <div className="absolute inset-0 z-0 pointer-events-auto overflow-hidden">
        <MagicRings
          color="#a855f7"
          colorTwo="#6366f1"
          ringCount={8}
          speed={0.8}
          attenuation={12}
          lineThickness={2}
          baseRadius={0.35}
          radiusStep={0.08}
          scaleRate={0.05}
          opacity={0.7}
          blur={1.5}
          noiseAmount={0.2}
          rotation={0}
          ringGap={1.4}
          fadeIn={0.6}
          fadeOut={0.6}
          followMouse={true}
          mouseInfluence={0.15}
          hoverScale={1.05}
          parallax={0.08}
          clickBurst={true}
        />
        <div className="absolute inset-0 bg-black/40 pointer-events-none backdrop-blur-[2px]" />
      </div>

      <div className="absolute top-6 left-6 z-20">
        <Link to="/" className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">
          <ArrowRight className="h-4 w-4 rotate-180" /> Home
        </Link>
      </div>

      <div className="w-full max-w-[360px] px-6 relative z-10 mt-12">
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex h-14 items-center justify-center rounded-xl bg-white px-4 py-2 mb-6">
            <img src="/ror-logo.png/rorlogin2026-06-12%20091120.png" alt="ROR Technologies" className="h-full w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<span class="text-black font-bold">ROR Tech</span>'; }} />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">Log in to ROR Technologies</h1>
          <p className="text-zinc-400 text-sm">
            Don't have an account? <Link to="/" className="text-white hover:underline font-medium">Sign up</Link>.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6 relative">
          {/* Last Used Tooltip Simulation */}
          <div className="absolute -top-3 left-[25%] -translate-x-1/2 bg-zinc-800 border border-white/10 text-white text-[10px] font-medium px-2 py-0.5 rounded-full z-10 shadow-xl">
            Last used
          </div>
          
          <button 
            type="button" 
            onClick={handleGoogleLogin}
            disabled={!!ssoLoading}
            className="flex items-center justify-center gap-2 h-10 rounded-lg bg-transparent border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium text-zinc-300 hover:text-white"
          >
            {ssoLoading === 'google' ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Google
          </button>
          <button 
            type="button" 
            onClick={handleMicrosoftLogin}
            disabled={!!ssoLoading}
            className="flex items-center justify-center gap-2 h-10 rounded-lg bg-transparent border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium text-zinc-300 hover:text-white"
          >
            {ssoLoading === 'microsoft' ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="currentColor"/>
                <rect x="11" y="1" width="9" height="9" fill="currentColor"/>
                <rect x="1" y="11" width="9" height="9" fill="currentColor"/>
                <rect x="11" y="11" width="9" height="9" fill="currentColor"/>
              </svg>
            )}
            Microsoft
          </button>
        </div>

        {ssoError && (
          <p className="mb-4 text-center text-xs font-medium text-red-500">
            {ssoError}
          </p>
        )}

        <div className="relative flex items-center mb-6">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink-0 mx-4 text-zinc-500 text-[11px] font-medium">or</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-zinc-400 font-normal text-xs">Email</Label>
            <input 
              id="email" 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="alan.turing@example.com" 
              className="w-full h-10 px-3 bg-[#0a0a0a] border border-white/10 focus:outline-none focus:ring-1 focus:ring-white/30 text-white placeholder:text-zinc-600 rounded-lg shadow-inner transition-all text-sm" 
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="password" className="text-zinc-400 font-normal text-xs">Password</Label>
            </div>
            <input 
              id="password" 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              className="w-full h-10 px-3 bg-[#0a0a0a] border border-white/10 focus:outline-none focus:ring-1 focus:ring-white/30 text-white placeholder:text-zinc-600 rounded-lg shadow-inner transition-all text-sm" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full h-10 mt-2 bg-[#1a1a1a] border border-white/10 text-white hover:bg-[#222] transition-colors font-medium rounded-lg text-sm flex items-center justify-center disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="mt-8 text-center text-[11px] text-zinc-500 max-w-xs mx-auto">
          By signing in, you agree to our <a href="#" className="underline decoration-zinc-700 hover:text-zinc-300 transition-colors">Terms</a> and <a href="#" className="underline decoration-zinc-700 hover:text-zinc-300 transition-colors">Privacy Policy</a>.
        </p>

        {/* Database Seeder Section (hidden by default, but styled dark) */}
        <div className="mt-12 pt-4">
          <button
            onClick={() => setShowSeeder(!showSeeder)}
            className="w-full flex items-center justify-center text-[10px] font-medium text-zinc-700 hover:text-zinc-500 transition-colors py-1"
          >
            <span className="flex items-center gap-1"><Database className="h-3 w-3" /> Diagnostics</span>
          </button>

          {showSeeder && (
            <div className="mt-4 bg-[#0a0a0a] p-4 rounded-xl border border-white/5 text-xs space-y-3 shadow-2xl">
              <div className="font-medium text-[10px] uppercase tracking-widest text-zinc-500">Available Accounts</div>
              <div className="grid grid-cols-1 gap-2">
                {TARGET_USERS.map((user) => (
                  <div key={user.email} className="p-2.5 rounded-lg bg-[#111] border border-white/5 flex flex-col gap-1">
                    <span className="font-semibold text-zinc-300 text-xs">{user.name} <span className="text-zinc-500 font-normal">({user.role})</span></span>
                    <span className="text-zinc-400 select-all font-mono text-[10px]">{user.email}</span>
                    <span className="text-zinc-500 font-mono text-[10px]">Pass: <span className="text-zinc-400 select-all">{user.password}</span></span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSeed}
                disabled={isSeeding}
                className="w-full mt-2 bg-white/5 hover:bg-white/10 text-white rounded-lg h-8 text-[11px] font-medium transition-colors border border-white/5"
              >
                {isSeeding ? "Repairing & Seeding..." : "Auto-Repair Database"}
              </button>

              {seedingLog.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto p-3 bg-black rounded-lg font-mono text-[10px] space-y-1.5 text-zinc-400 border border-white/5 leading-relaxed">
                  {seedingLog.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

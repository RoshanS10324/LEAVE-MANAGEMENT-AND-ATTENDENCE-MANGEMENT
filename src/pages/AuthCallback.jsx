import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    async function handleCallback() {
      try {
        // Get session from URL hash (Supabase handles this)
        const { data: { session }, error } = 
          await supabase.auth.getSession()

        if (error || !session) {
          navigate('/login?error=auth_failed')
          return
        }

        const user = session.user

        // Check if employee record exists
        const { data: existing } = await supabase
          .from('employees')
          .select('id, role, name')
          .eq('auth_id', user.id)
          .maybeSingle()

        if (existing) {
          // Employee exists — log SSO login
          await supabase.from('sso_login_logs').insert({
            emp_id: existing.id,
            provider: user.app_metadata?.provider || 'oauth',
            email: user.email,
            status: 'success'
          })

          // Update sso_config login stats
          await supabase.from('sso_config')
            .update({
              last_login_at: new Date().toISOString(),
              total_sso_logins: existing.total_sso_logins + 1
            })
            .eq('provider',
              user.app_metadata?.provider === 'azure'
                ? 'azure' : 'google')

          // Redirect based on role
          const roleRoutes = {
            employee: '/dashboard',
            manager: '/manager/dashboard',
            hr: '/hr/dashboard',
            super_admin: '/hr/dashboard'
          }
          navigate(roleRoutes[existing.role] || '/dashboard')
          return
        }

        // Employee not found — check if email matches
        const { data: byEmail } = await supabase
          .from('employees')
          .select('id, role, auth_id')
          .eq('email', user.email)
          .maybeSingle()

        if (byEmail && !byEmail.auth_id) {
          // Link auth_id to existing employee
          await supabase.from('employees')
            .update({ auth_id: user.id })
            .eq('id', byEmail.id)

          await supabase.from('sso_login_logs').insert({
            emp_id: byEmail.id,
            provider: user.app_metadata?.provider || 'oauth',
            email: user.email,
            status: 'provisioned'
          })

          const roleRoutes = {
            employee: '/dashboard',
            manager: '/manager/dashboard',
            hr: '/hr/dashboard',
            super_admin: '/hr/dashboard'
          }
          navigate(roleRoutes[byEmail.role] || '/dashboard')
          return
        }

        // No matching employee — show error
        navigate('/login?error=no_employee_record')

      } catch (err) {
        console.error('Auth callback error:', err)
        navigate('/login?error=unknown')
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div style={{
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      height:'100vh', gap:16
    }}>
      <div style={{
        width:40, height:40, border:'3px solid #185FA5',
        borderTopColor:'transparent', borderRadius:'50%',
        animation:'spin 0.8s linear infinite'
      }} />
      <p style={{fontSize:14, color:'var(--color-text-secondary)'}}>
        Completing sign-in...
      </p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

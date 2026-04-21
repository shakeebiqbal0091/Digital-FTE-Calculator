'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async () => {
    setLoading(true); setError('')
    const res = await signIn('credentials', {
      email, password, redirect: false,
    })
    setLoading(false)
    if (res?.ok) router.push('/')
    else setError('Invalid email or password')
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f7f8fa' }}>
      <div style={{ background:'#fff', borderRadius:16, padding:'2.5rem', width:'100%', maxWidth:400, border:'1px solid #eee' }}>
        <h1 style={{ fontSize:22, fontWeight:600, marginBottom:8 }}>Sign in</h1>
        <p style={{ color:'#888', fontSize:14, marginBottom:24 }}>FTE Calculator Dashboard</p>

        {error && (
          <div style={{ background:'#fff0f0', color:'#E24B4A', padding:'10px 14px', borderRadius:8, fontSize:14, marginBottom:16 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:13, color:'#666', display:'block', marginBottom:6 }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            style={{ width:'100%', padding:'10px 14px', border:'1px solid #ddd', borderRadius:8, fontSize:14, boxSizing:'border-box' }}
          />
        </div>

        <div style={{ marginBottom:24 }}>
          <label style={{ fontSize:13, color:'#666', display:'block', marginBottom:6 }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width:'100%', padding:'10px 14px', border:'1px solid #ddd', borderRadius:8, fontSize:14, boxSizing:'border-box' }}
          />
        </div>

        <button onClick={handleLogin} disabled={loading}
          style={{ width:'100%', padding:'11px', background:'#378ADD', color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:500, cursor:'pointer' }}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <p style={{ textAlign:'center', marginTop:16, fontSize:14, color:'#888' }}>
          No account?{' '}
          <a href="/register" style={{ color:'#378ADD', textDecoration:'none' }}>Register here</a>
        </p>
      </div>
    </div>
  )
}
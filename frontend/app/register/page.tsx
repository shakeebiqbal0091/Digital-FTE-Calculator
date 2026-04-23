'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName]       = useState('')
  const [orgName, setOrgName] = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    setLoading(true); setError('')
    try {
      await axios.post('http://localhost:4000/api/auth/register', { name, email, password, orgName })
      router.push('/login')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f7f8fa' }}>
      <div style={{ background:'#fff', borderRadius:16, padding:'2.5rem', width:'100%', maxWidth:400, border:'1px solid #eee' }}>
        <h1 style={{ fontSize:22, fontWeight:600, marginBottom:8 }}>Create account</h1>
        <p style={{ color:'#888', fontSize:14, marginBottom:24 }}>Set up your organization on FTE Calculator</p>

        {error && (
          <div style={{ background:'#fff0f0', color:'#E24B4A', padding:'10px 14px', borderRadius:8, fontSize:14, marginBottom:16 }}>
            {error}
          </div>
        )}

        {[
          { label:'Your name',          value:name,     set:setName,     type:'text',     placeholder:'John Smith' },
          { label:'Organization name',  value:orgName,  set:setOrgName,  type:'text',     placeholder:'Acme Corp' },
          { label:'Email',              value:email,    set:setEmail,    type:'email',    placeholder:'you@company.com' },
          { label:'Password',           value:password, set:setPassword, type:'password', placeholder:'••••••••' },
        ].map(f => (
          <div key={f.label} style={{ marginBottom:16 }}>
            <label style={{ fontSize:13, color:'#666', display:'block', marginBottom:6 }}>{f.label}</label>
            <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)}
              placeholder={f.placeholder}
              style={{ width:'100%', padding:'10px 14px', border:'1px solid #ddd', borderRadius:8, fontSize:14, boxSizing:'border-box' }}
            />
          </div>
        ))}

        <button onClick={handleRegister} disabled={loading}
          style={{ width:'100%', padding:'11px', background:'#378ADD', color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:500, cursor:'pointer', marginTop:8 }}>
          {loading ? 'Creating...' : 'Create organization'}
        </button>

        <p style={{ textAlign:'center', marginTop:16, fontSize:14, color:'#888' }}>
          Already have an account?{' '}
          <a href="/login" style={{ color:'#378ADD', textDecoration:'none' }}>Sign in</a>
        </p>
      </div>
    </div>
  )
}
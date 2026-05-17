'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleLogin(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError('');
    const data = await api.login(email, password);
    if (data.access_token) {
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/chat');
    } else {
      setError('Invalid email or password');
    }
  }

  return (
      <div style={{ minHeight: '100vh', background: '#0f0f13', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                .auth-input {
                    width: 100%;
                    background: #1a1a24;
                    border: 1px solid #2a2a38;
                    border-radius: 10px;
                    padding: 12px 16px;
                    color: #e0e0f0;
                    font-size: 14px;
                    font-family: inherit;
                    outline: none;
                    transition: border 0.2s;
                }
                .auth-input::placeholder { color: #555570; }
                .auth-input:focus { border-color: #6c63ff; }
                .auth-btn {
                    width: 100%;
                    background: linear-gradient(135deg, #6c63ff, #4f46e5);
                    border: none;
                    border-radius: 10px;
                    padding: 13px;
                    color: white;
                    font-size: 14px;
                    font-weight: 600;
                    font-family: inherit;
                    cursor: pointer;
                    transition: opacity 0.2s, transform 0.1s;
                }
                .auth-btn:hover { opacity: 0.9; transform: translateY(-1px); }
                .auth-btn:active { transform: translateY(0); }
                .auth-link { color: #6c63ff; text-decoration: none; }
                .auth-link:hover { text-decoration: underline; }
            `}</style>

        <div style={{ width: '100%', maxWidth: '380px', padding: '0 16px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '36px', background: 'linear-gradient(135deg, #6c63ff, #3ecfcf)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Муабети
            </h1>
            <p style={{ color: '#444458', fontSize: '13px', marginTop: '6px' }}>Најави се да продолжиш!</p>
          </div>

          <div style={{ background: '#13131a', border: '1px solid #1e1e2e', borderRadius: '16px', padding: '32px' }}>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                  className="auth-input"
                  type="email"
                  placeholder="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
              />
              <input
                  className="auth-input"
                  type="password"
                  placeholder="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
              />
              {error && <p style={{ color: '#ff5566', fontSize: '12px' }}>{error}</p>}
              <button className="auth-btn" type="submit">Најави се →</button>
            </form>

            <p style={{ textAlign: 'center', fontSize: '13px', color: '#444458', marginTop: '20px' }}>
              Немаш сметка?{' '}
              <Link href="/register" className="auth-link">Регистрирај се!</Link>
            </p>
          </div>
        </div>
      </div>
  );
}
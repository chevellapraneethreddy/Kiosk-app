import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@standee.com');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.adminLogin({ email, password });
      localStorage.setItem('adminToken', res.token);
      navigate('/admin');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B0D17] via-[#161B33] to-[#2A1B4E] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-gold-500/40 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gold-500/20 border border-gold-400 flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-gold-400" />
          </div>
          <h1 className="font-serif text-3xl font-bold gold-gradient-text uppercase">
            Admin Console
          </h1>
          <p className="text-sm text-gray-300">AI Digital Standee Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-wider text-gold-400 mb-2 font-bold">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-royal-800/80 border border-gold-500/30 text-white focus:outline-none focus:border-gold-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-gold-400 mb-2 font-bold">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-royal-800/80 border border-gold-500/30 text-white focus:outline-none focus:border-gold-400"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 text-sm flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full gold-button text-black font-extrabold uppercase py-4 rounded-2xl text-lg tracking-wider shadow-lg active:scale-95 transition-all"
          >
            {loading ? 'Authenticating...' : 'LOG IN TO DASHBOARD'}
          </button>
        </form>
      </div>
    </div>
  );
};

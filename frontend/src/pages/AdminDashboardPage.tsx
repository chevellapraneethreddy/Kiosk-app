import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, Trash2, Plus, Sparkles, RefreshCw, Layers, Image as ImageIcon } from 'lucide-react';
import { api } from '../services/api';
import { AdminStats, Generation, Style } from '../types';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'STYLES' | 'LOGS'>('OVERVIEW');

  // Form state for adding new garment/style
  const [newStyle, setNewStyle] = useState({
    name: '',
    category: 'Sarees',
    thumbnailUrl: '/assets/sample-pink-saree.jpg',
    garmentImageUrl: '/assets/sample-pink-saree.jpg',
    prompt: '',
    experienceId: '',
  });

  useEffect(() => {
    if (!token) {
      navigate('/admin/login');
      return;
    }
    loadData();
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (!token) return;
      const sData = await api.getAdminStats(token);
      setStats(sData);

      const gData = await api.getAdminGenerations(token);
      setGenerations(gData.generations || []);

      const stylesData = await api.getStyles();
      setStyles(stylesData);
      if (stylesData.length > 0 && !newStyle.experienceId) {
        setNewStyle((prev) => ({ ...prev, experienceId: stylesData[0].experienceId }));
      }
    } catch (err) {
      console.error('Admin data load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const handleCreateStyle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await api.createStyle(token, newStyle);
      alert('New garment style added successfully!');
      setNewStyle({
        name: '',
        category: 'Sarees',
        thumbnailUrl: '/assets/sample-pink-saree.jpg',
        garmentImageUrl: '/assets/sample-pink-saree.jpg',
        prompt: '',
        experienceId: styles[0]?.experienceId || '',
      });
      loadData();
    } catch (err: any) {
      alert(`Error creating garment style: ${err.message}`);
    }
  };

  const handleDeleteStyle = async (id: string) => {
    if (!token || !confirm('Are you sure you want to delete this garment style?')) return;
    try {
      await api.deleteStyle(token, id);
      loadData();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleToggleStyle = async (style: Style) => {
    if (!token) return;
    try {
      await api.updateStyle(token, style.id, { enabled: !style.enabled });
      loadData();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleCleanup = async () => {
    if (!token) return;
    try {
      const res = await api.triggerCleanup(token);
      alert(`Cleanup execution complete! Deleted ${res.deletedCount || 0} expired files.`);
      loadData();
    } catch (err: any) {
      alert(`Cleanup failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B0D17] via-[#161B33] to-[#2A1B4E] text-white p-8">
      {/* Header */}
      <header className="flex items-center justify-between pb-6 border-b border-gold-500/20 mb-8">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="w-8 h-8 text-gold-400" />
          <div>
            <h1 className="font-serif text-3xl font-bold gold-gradient-text uppercase">
              ADMIN CONSOLE
            </h1>
            <p className="text-xs text-gray-400">Garment Catalog & AI Standee Management</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleCleanup}
            className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-royal-800 hover:bg-royal-700 text-gold-300 border border-gold-500/30 text-sm font-semibold transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Run File Cleanup</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-500/30 text-sm font-semibold transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-6 py-3 rounded-2xl font-bold text-sm tracking-wider uppercase transition-all ${
            activeTab === 'OVERVIEW' ? 'gold-button text-black' : 'glass-panel text-gray-300 border border-gold-500/20'
          }`}
        >
          Overview & Stats
        </button>

        <button
          onClick={() => setActiveTab('STYLES')}
          className={`px-6 py-3 rounded-2xl font-bold text-sm tracking-wider uppercase transition-all ${
            activeTab === 'STYLES' ? 'gold-button text-black' : 'glass-panel text-gray-300 border border-gold-500/20'
          }`}
        >
          Manage Garments Catalog
        </button>

        <button
          onClick={() => setActiveTab('LOGS')}
          className={`px-6 py-3 rounded-2xl font-bold text-sm tracking-wider uppercase transition-all ${
            activeTab === 'LOGS' ? 'gold-button text-black' : 'glass-panel text-gray-300 border border-gold-500/20'
          }`}
        >
          Generation Logs
        </button>
      </div>

      {loading ? (
        <div className="text-gold-400 font-serif text-xl animate-pulse py-12 text-center">
          Loading metrics...
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-panel p-6 rounded-3xl border border-gold-500/30">
                  <span className="text-xs uppercase text-gray-400 font-bold block mb-1">Total Try-On Generations</span>
                  <span className="font-serif text-4xl font-extrabold gold-gradient-text">
                    {stats?.totalGenerations || 0}
                  </span>
                </div>

                <div className="glass-panel p-6 rounded-3xl border border-green-500/30">
                  <span className="text-xs uppercase text-gray-400 font-bold block mb-1">Successful</span>
                  <span className="font-serif text-4xl font-extrabold text-green-400">
                    {stats?.successfulGenerations || 0}
                  </span>
                </div>

                <div className="glass-panel p-6 rounded-3xl border border-red-500/30">
                  <span className="text-xs uppercase text-gray-400 font-bold block mb-1">Failed</span>
                  <span className="font-serif text-4xl font-extrabold text-red-400">
                    {stats?.failedGenerations || 0}
                  </span>
                </div>

                <div className="glass-panel p-6 rounded-3xl border border-purple-500/30">
                  <span className="text-xs uppercase text-gray-400 font-bold block mb-1">Today's Generations</span>
                  <span className="font-serif text-4xl font-extrabold text-purple-300">
                    {stats?.todayGenerations || 0}
                  </span>
                </div>
              </div>

              <div className="glass-panel p-8 rounded-3xl border border-gold-500/30">
                <h3 className="font-serif text-2xl font-bold text-white mb-6 flex items-center space-x-2">
                  <Sparkles className="w-6 h-6 text-gold-400" />
                  <span>Most Popular Garments</span>
                </h3>
                <div className="space-y-4">
                  {stats?.topStyles?.map((styleItem, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-royal-800/60 border border-gold-500/20">
                      <span className="font-semibold text-lg text-white">{styleItem.name}</span>
                      <span className="px-4 py-1 rounded-full bg-gold-500/20 text-gold-300 text-sm font-bold">
                        {styleItem.count} Try-Ons
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MANAGE GARMENTS */}
          {activeTab === 'STYLES' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form */}
              <div className="lg:col-span-5 glass-panel p-6 rounded-3xl border border-gold-500/30">
                <h3 className="font-serif text-2xl font-bold text-white mb-6 flex items-center space-x-2">
                  <Plus className="w-6 h-6 text-gold-400" />
                  <span>Add New Garment</span>
                </h3>
                <form onSubmit={handleCreateStyle} className="space-y-4">
                  <div>
                    <label className="block text-xs text-gold-400 uppercase font-bold mb-1">Garment Name</label>
                    <input
                      type="text"
                      value={newStyle.name}
                      onChange={(e) => setNewStyle({ ...newStyle, name: e.target.value })}
                      required
                      placeholder="e.g. Royal Pink Silk Saree"
                      className="w-full px-4 py-3 rounded-2xl bg-royal-800 border border-gold-500/30 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gold-400 uppercase font-bold mb-1">Category</label>
                    <select
                      value={newStyle.category}
                      onChange={(e) => setNewStyle({ ...newStyle, category: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl bg-royal-800 border border-gold-500/30 text-white"
                    >
                      <option value="Sarees">Sarees</option>
                      <option value="Traditional">Traditional</option>
                      <option value="Formal">Formal</option>
                      <option value="Modern">Modern</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gold-400 uppercase font-bold mb-1">Garment Reference Image Path / URL</label>
                    <input
                      type="text"
                      value={newStyle.garmentImageUrl}
                      onChange={(e) => setNewStyle({ ...newStyle, garmentImageUrl: e.target.value, thumbnailUrl: e.target.value })}
                      required
                      placeholder="/assets/sample-pink-saree.jpg"
                      className="w-full px-4 py-3 rounded-2xl bg-royal-800 border border-gold-500/30 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gold-400 uppercase font-bold mb-1">Virtual Try-On AI Prompt</label>
                    <textarea
                      value={newStyle.prompt}
                      onChange={(e) => setNewStyle({ ...newStyle, prompt: e.target.value })}
                      required
                      rows={4}
                      placeholder="Detailed garment description prompt..."
                      className="w-full px-4 py-3 rounded-2xl bg-royal-800 border border-gold-500/30 text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full gold-button text-black font-extrabold uppercase py-4 rounded-2xl text-base shadow-lg"
                  >
                    Save & Publish Garment
                  </button>
                </form>
              </div>

              {/* Garment Table */}
              <div className="lg:col-span-7 space-y-4">
                {styles.map((style) => (
                  <div key={style.id} className="glass-panel p-4 rounded-2xl border border-gold-500/20 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <img
                        src={style.garmentImageUrl || style.thumbnailUrl}
                        alt={style.name}
                        className="w-16 h-20 object-cover rounded-xl border border-gold-500/40"
                      />
                      <div>
                        <h4 className="font-serif text-lg font-bold text-white">{style.name}</h4>
                        <span className="text-xs text-gold-400 font-semibold">{style.category}</span>
                        <p className="text-xs text-gray-400 line-clamp-1 max-w-sm mt-1">{style.prompt}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleToggleStyle(style)}
                        className={`px-4 py-2 rounded-full text-xs font-bold ${
                          style.enabled ? 'bg-green-600/80 text-white' : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {style.enabled ? 'Enabled' : 'Disabled'}
                      </button>

                      <button
                        onClick={() => handleDeleteStyle(style.id)}
                        className="p-2 rounded-xl bg-red-950/80 text-red-300 hover:bg-red-900"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: GENERATION LOGS */}
          {activeTab === 'LOGS' && (
            <div className="glass-panel rounded-3xl p-6 border border-gold-500/30 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gold-500/30 text-gold-400 uppercase text-xs">
                    <th className="p-3">Public Token</th>
                    <th className="p-3">Garment Outfit</th>
                    <th className="p-3">Provider</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-500/10">
                  {generations.map((gen) => (
                    <tr key={gen.id} className="hover:bg-royal-800/40">
                      <td className="p-3 font-mono text-xs text-gold-300">{gen.publicToken}</td>
                      <td className="p-3 font-semibold">{gen.style?.name || gen.styleId}</td>
                      <td className="p-3 uppercase text-xs font-bold text-gray-300">{gen.provider}</td>
                      <td className="p-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          gen.status === 'COMPLETED' ? 'bg-green-600/30 text-green-300 border border-green-500/30' : 'bg-yellow-600/30 text-yellow-300 border border-yellow-500/30'
                        }`}>
                          {gen.status}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-gray-400">{new Date(gen.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

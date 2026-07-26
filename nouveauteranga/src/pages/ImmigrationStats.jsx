import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Globe, MapPin, AlertCircle, RefreshCw,
  TrendingUp, UserCheck, Flag, BarChart2,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, AreaChart, Area,
  Cell, Legend, Tooltip,
  XAxis, YAxis, CartesianGrid,
} from 'recharts';
import ResponsiveContainer from '../components/ChartContainer';
import api from '../api/axios';
import geoService from '../services/geoService';
import { useAuth } from '../contexts/AuthContext';

/* ─── constants ─────────────────────────────────────────────── */
const ANALYTICS_COLORS = ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#E11D48', '#C2410C'];
const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const inputCls =
  'w-full text-sm border border-[#CBD5E1] dark:border-white/10 rounded-lg py-2 px-3 bg-[#F8FAFC] dark:bg-white/5 text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors';

/* ─── helpers ────────────────────────────────────────────────── */
function getMonthKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getYear(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d) ? null : d.getFullYear();
}

/* ─── KPI Card ───────────────────────────────────────────────── */
function KpiCard({ iconColor, label, value, sub }) {
  return (
    <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-lg overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="h-1" style={{ background: iconColor }} />
      <div className="px-4 py-3">
        <p className="text-2xl font-bold text-[#0F172A] dark:text-white">{value}</p>
        <p className="text-xs text-[#64748B] dark:text-white/50 font-medium mt-1">{label}</p>
        {sub && <p className="text-[11px] text-[#94A3B8] dark:text-white/30 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────── */
function Skeleton({ className }) {
  return <div className={`animate-pulse bg-[#CBD5E1] dark:bg-white/10 rounded-lg ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

/* ─── ChartCard ──────────────────────────────────────────────── */
function ChartCard({ title, children }) {
  return (
    <div className="bg-white dark:bg-[#343a40] rounded-2xl border border-[#CBD5E1] dark:border-white/15 p-5">
      <h3 className="font-semibold text-[#0F172A] dark:text-white text-sm mb-4">{title}</h3>
      {children}
    </div>
  );
}

/* ─── ImmigrationStats ───────────────────────────────────────── */
export default function ImmigrationStats() {
  const { user } = useAuth();

  // Rôle et service de l'utilisateur connecté
  const rawRole = user?.roles?.[0];
  const role = (typeof rawRole === 'string' ? rawRole : rawRole?.name) || 'agent';
  const isAdminOrSuper = role === 'administrateur' || role === 'gestionnaire';
  const userServiceId = user?.service_id ? String(user.service_id) : '';

  const [rawData, setRawData] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterYear, setFilterYear] = useState('');
  // Agents/admins service : filtre service verrouillé sur leur propre service
  const [filterService, setFilterService] = useState(!isAdminOrSuper && userServiceId ? userServiceId : '');

  /* ── Fetch ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Le backend applique visibleByUser() — les données sont déjà scopées
      const params = { per_page: 500 };
      if (!isAdminOrSuper && userServiceId) params.service_id = userServiceId;

      const [dataRes, svcRes] = await Promise.all([
        api.get('/immigrations-clandestines', { params }),
        geoService.getAllServices(),
      ]);
      setRawData(dataRes.data?.data || []);
      const allServices = svcRes.data?.data || svcRes.data || [];
      // Agents/admins service ne voient que leur propre service dans le filtre
      setServices(!isAdminOrSuper && userServiceId
        ? allServices.filter(s => String(s.id) === userServiceId)
        : allServices
      );
    } catch {
      setError('Impossible de charger les données. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, [isAdminOrSuper, userServiceId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Derived years ── */
  const availableYears = [...new Set(rawData.map(d => getYear(d.date)).filter(Boolean))].sort((a, b) => b - a);

  /* ── Filtered data ── */
  const filtered = rawData.filter(item => {
    if (filterYear && getYear(item.date) !== Number(filterYear)) return false;
    if (filterService && String(item.service_id) !== String(filterService)) return false;
    return true;
  });

  /* ── KPIs ── */
  const totalInterpellations = useMemo(() => filtered.reduce((s, d) => s + (Number(d.nombre_interpellation) || 0), 0), [filtered]);
  const totalHommes = useMemo(() => filtered.reduce((s, d) => s + (Number(d.nombre_hommes) || 0), 0), [filtered]);
  const totalFemmes = useMemo(() => filtered.reduce((s, d) => s + (Number(d.nombre_femmes) || 0), 0), [filtered]);
  const totalEnfants = useMemo(() => filtered.reduce((s, d) => s + (Number(d.nombre_enfants) || 0), 0), [filtered]);
  const totalSenegalais = useMemo(() => filtered.reduce((s, d) => s + (Number(d.nombre_senegalais) || 0), 0), [filtered]);
  const totalEtrangers = useMemo(() => filtered.reduce((s, d) => s + (Number(d.nombre_etrangers) || 0), 0), [filtered]);
  const zonesUniques = useMemo(() => new Set(filtered.map(d => d.zone_depart).filter(Boolean)).size, [filtered]);

  /* ── Chart 1: H/F/Enfants Pie ── */
  const genrePieData = useMemo(() => [
    { name: 'Hommes', value: totalHommes },
    { name: 'Femmes', value: totalFemmes },
    { name: 'Enfants', value: totalEnfants },
  ], [totalHommes, totalFemmes, totalEnfants]);

  /* ── Chart 2: Senegalais vs Etrangers Pie ── */
  const nationalitePieData = useMemo(() => [
    { name: 'Sénégalais', value: totalSenegalais },
    { name: 'Étrangers', value: totalEtrangers },
  ], [totalSenegalais, totalEtrangers]);

  /* ── Chart 3: Top 8 zones départ ── */
  const zoneData = useMemo(() => {
    const zoneMap = {};
    filtered.forEach(d => {
      if (d.zone_depart) {
        zoneMap[d.zone_depart] = (zoneMap[d.zone_depart] || 0) + (Number(d.nombre_interpellation) || 1);
      }
    });
    return Object.entries(zoneMap)
      .map(([zone, count]) => ({ zone, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filtered]);

  /* ── Chart 4: Top 8 brigades par région ── */
  const serviceData = useMemo(() => {
    const serviceMap = {};
    filtered.forEach(d => {
      const fullName = d.service?.nom || `Service ${d.service_id}`;
      const shortName = fullName
        .replace(/^Commissariat (Central )?(de |d')/i, '')
        .replace(/^Brigade (de |d')/i, '')
        .replace(/^Poste (de |d')/i, '');
      serviceMap[shortName] = (serviceMap[shortName] || 0) + (Number(d.nombre_interpellation) || 1);
    });
    return Object.entries(serviceMap)
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filtered]);

  /* ── Chart 5 & 6: Monthly data ── */
  const monthlyData = useMemo(() => {
    const monthMap = {};
    filtered.forEach(d => {
      const key = getMonthKey(d.date);
      if (!key) return;
      if (!monthMap[key]) {
        monthMap[key] = { key, interpellations: 0, maries: 0, celibataires: 0 };
      }
      monthMap[key].interpellations += Number(d.nombre_interpellation) || 0;
      monthMap[key].maries += Number(d.nombre_maries) || 0;
      monthMap[key].celibataires += Number(d.nombre_celibataires) || 0;
    });
    return Object.values(monthMap)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(m => {
        const [y, mo] = m.key.split('-');
        return { ...m, label: `${MONTHS_FR[Number(mo) - 1]} ${y}` };
      });
  }, [filtered]);

  /* ── Table: last 10 ── */
  const lastTen = [...filtered]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  if (loading) return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
          <Globe size={20} className="text-[#2563EB]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] dark:text-white">Immigration Clandestine</h1>
          <p className="text-sm text-[#64748B] dark:text-white/50">Chargement des données…</p>
        </div>
      </div>
      <LoadingSkeleton />
    </div>
  );

  return (
    <div className="min-h-screen p-4 sm:p-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1B4332] flex items-center justify-center">
            <Globe size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0F172A] dark:text-white">Immigration Clandestine</h1>
            <p className="text-sm text-[#64748B] dark:text-white/50">
              {filtered.length} enregistrement{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1B4332] text-white text-sm font-medium hover:bg-[#143728] transition-colors"
        >
          <RefreshCw size={15} /> Actualiser
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] rounded-xl p-4 mb-6 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-[#343a40] rounded-2xl border border-[#CBD5E1] dark:border-white/15 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1">Année</label>
            <select className={inputCls} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              <option value="">Toutes les années</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1">Service / Brigade</label>
            {!isAdminOrSuper && userServiceId ? (
              <div className={`${inputCls} bg-[#F1F5F9] dark:bg-white/5 cursor-not-allowed`}>
                {services[0]?.nom || `Service #${userServiceId}`}
              </div>
            ) : (
              <select className={inputCls} value={filterService} onChange={e => setFilterService(e.target.value)}>
                <option value="">Tous les services</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Empty */}
      {filtered.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Globe size={40} className="text-[#94A3B8]" />
          <p className="text-[#64748B] dark:text-white/50 text-sm">Aucune donnée pour ces filtres</p>
          <button onClick={fetchAll} className="mt-1 flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#1B4332] text-white rounded-lg hover:bg-[#143728] transition-colors">
            <RefreshCw size={13} /> Réessayer
          </button>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <KpiCard
              icon={Users}
              iconColor="#2563EB"
              iconBg="#EFF6FF"
              label="Total interpellations"
              value={totalInterpellations.toLocaleString('fr-FR')}
              sub={`${filtered.length} dossier${filtered.length > 1 ? 's' : ''}`}
            />
            <KpiCard
              icon={BarChart2}
              iconColor="#D97706"
              iconBg="#FFFBEB"
              label="H / F / Enfants"
              value={`${totalHommes} / ${totalFemmes} / ${totalEnfants}`}
              sub="Répartition démographique"
            />
            <KpiCard
              icon={Flag}
              iconColor="#16A34A"
              iconBg="#F0FDF4"
              label="Sénégalais / Étrangers"
              value={`${totalSenegalais} / ${totalEtrangers}`}
              sub="Répartition nationalité"
            />
            <KpiCard
              icon={MapPin}
              iconColor="#7C3AED"
              iconBg="#F5F3FF"
              label="Zones de départ"
              value={zonesUniques}
              sub="Zones distinctes identifiées"
            />
          </div>

          {/* Charts grid 2x3 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

            {/* 1. Pie H/F/Enfants */}
            <ChartCard title="Répartition Hommes / Femmes / Enfants">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={genrePieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {genrePieData.map((_, i) => <Cell key={i} fill={ANALYTICS_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 2. Pie Nationalité */}
            <ChartCard title="Sénégalais vs Étrangers">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={nationalitePieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    paddingAngle={4} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    <Cell fill="#2563EB" />
                    <Cell fill="#D97706" />
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 3. Bar vertical zones */}
            <ChartCard title="Top 8 zones de départ">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={zoneData} margin={{ top: 4, right: 8, bottom: 24, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
                  <XAxis dataKey="zone" tick={{ fontSize: 10, fill: '#64748B' }} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12 }} />
                  <Bar dataKey="count" name="Interpellations" radius={[4, 4, 0, 0]}>
                    {zoneData.map((_, i) => <Cell key={i} fill={ANALYTICS_COLORS[i % ANALYTICS_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 4. Bar horizontal services */}
            <ChartCard title="Top 8 brigades par région">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={serviceData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="service" tick={{ fontSize: 10, fill: '#64748B' }} width={90} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12 }} />
                  <Bar dataKey="count" name="Interpellations" radius={[0, 4, 4, 0]}>
                    {serviceData.map((_, i) => <Cell key={i} fill={ANALYTICS_COLORS[i % ANALYTICS_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 5. Area mensuelle */}
            <ChartCard title="Tendances mensuelles">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                  <defs>
                    <linearGradient id="gradImmig" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12 }} />
                  <Area
                    type="monotone" dataKey="interpellations" name="Interpellations"
                    stroke="#2563EB" strokeWidth={2} fill="url(#gradImmig)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 6. Stacked bar Mariés vs Célibataires */}
            <ChartCard title="Mariés vs Célibataires par mois">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={10} />
                  <Bar dataKey="maries" name="Mariés" stackId="a" fill="#2563EB" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="celibataires" name="Célibataires" stackId="a" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Table: last 10 */}
          <div className="bg-white dark:bg-[#343a40] rounded-2xl border border-[#CBD5E1] dark:border-white/15 overflow-hidden">
            <div className="px-5 py-4 border-b border-[#CBD5E1] dark:border-white/15 flex items-center gap-2">
              <TrendingUp size={16} className="text-[#2563EB]" />
              <h3 className="font-semibold text-[#0F172A] dark:text-white text-sm">
                Dernières interpellations
              </h3>
              <span className="ml-auto text-xs text-[#64748B] dark:text-white/40">10 plus récentes</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] dark:bg-white/5 border-b border-[#CBD5E1] dark:border-white/15">
                    {['Date', 'Zone départ', 'Service', 'Total', 'Hommes', 'Femmes', 'Enfants', 'Sénégalais', 'Étrangers'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[#64748B] dark:text-white/50 font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lastTen.map((item, i) => (
                    <tr key={item.id} className={`border-b border-[#F1F5F9] dark:border-white/5 hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors ${i % 2 === 0 ? '' : 'bg-[#FAFAFA] dark:bg-white/2'}`}>
                      <td className="px-3 py-2.5 text-[#0F172A] dark:text-white whitespace-nowrap">
                        {item.date ? new Date(item.date).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-[#0F172A] dark:text-white">{item.zone_depart || '—'}</td>
                      <td className="px-3 py-2.5 text-[#64748B] dark:text-white/60 whitespace-nowrap max-w-[120px] truncate">{item.service?.nom || '—'}</td>
                      <td className="px-3 py-2.5 font-semibold text-[#2563EB]">{item.nombre_interpellation ?? '—'}</td>
                      <td className="px-3 py-2.5 text-[#0F172A] dark:text-white">{item.nombre_hommes ?? '—'}</td>
                      <td className="px-3 py-2.5 text-[#0F172A] dark:text-white">{item.nombre_femmes ?? '—'}</td>
                      <td className="px-3 py-2.5 text-[#0F172A] dark:text-white">{item.nombre_enfants ?? '—'}</td>
                      <td className="px-3 py-2.5 text-[#16A34A]">{item.nombre_senegalais ?? '—'}</td>
                      <td className="px-3 py-2.5 text-[#D97706]">{item.nombre_etrangers ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

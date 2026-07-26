import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Banknote, TrendingUp, Gavel, Briefcase, AlertCircle,
  RefreshCw, Award, Building2, Calendar, Download,
} from 'lucide-react';
import ExportModal from '../components/ui/ExportModal';
import {
  BarChart, Bar, PieChart, Pie, AreaChart, Area,
  Cell, Legend, Tooltip,
  XAxis, YAxis, CartesianGrid,
} from 'recharts';
import ResponsiveContainer from '../components/ChartContainer';
import api from '../api/axios';
import geoService from '../services/geoService';

/* ─── constants ─────────────────────────────────────────────── */
const ANALYTICS_COLORS = ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#E11D48', '#C2410C'];
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const inputCls =
  'w-full text-sm border border-[#CBD5E1] dark:border-white/10 rounded-lg py-2 px-3 bg-[#F8FAFC] dark:bg-white/5 text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors';

const TYPE_LABELS = {
  all: 'Tous',
  amende: 'Amendes',
  saisie: 'Saisies',
  service: 'Services rémunérés',
};

/* ─── helpers ────────────────────────────────────────────────── */
function fcfa(amount) {
  return `${Number(amount || 0).toLocaleString('fr-FR')} FCFA`;
}

function fcfaShort(amount) {
  const n = Number(amount || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString('fr-FR');
}

function getYear(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d) ? null : d.getFullYear();
}

function getMonthKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* ─── KPI Card ───────────────────────────────────────────────── */
function KpiCard({ iconColor, label, value, sub }) {
  return (
    <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-lg overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="h-1" style={{ background: iconColor }} />
      <div className="px-4 py-3">
        <p className="text-lg font-bold text-[#0F172A] dark:text-white">{value}</p>
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

/* ─── ChartCard ──────────────────────────────────────────────── */
function ChartCard({ title, children }) {
  return (
    <div className="bg-white dark:bg-[#343a40] rounded-2xl border border-[#CBD5E1] dark:border-white/15 p-5">
      <h3 className="font-semibold text-[#0F172A] dark:text-white text-sm mb-4">{title}</h3>
      {children}
    </div>
  );
}

/* ─── Custom Tooltip ─────────────────────────────────────────── */
function MoneyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/10 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold text-[#0F172A] dark:text-white mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {Number(p.value).toLocaleString('fr-FR')} FCFA
        </p>
      ))}
    </div>
  );
}

/* ─── FinancesStats ──────────────────────────────────────────── */
export default function FinancesStats() {
  const [amendesData, setAmendesData] = useState([]);
  const [servicesData, setServicesData] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterYear, setFilterYear] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterService, setFilterService] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);

  /* ── Fetch ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [amendesRes, svcDataRes, svcListRes] = await Promise.all([
        api.get('/amendes-pieces-saisies', { params: { per_page: 500 } }),
        api.get('/services-remuneres', { params: { per_page: 500 } }),
        geoService.getAllServices(),
      ]);
      setAmendesData(amendesRes.data?.data || []);
      setServicesData(svcDataRes.data?.data || []);
      setServices(svcListRes.data?.data || svcListRes.data || []);
    } catch {
      setError('Impossible de charger les données financières. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Tag source ── */
  const allTagged = useMemo(() => {
    const a = amendesData.map(d => ({ ...d, _source: d.type === 'saisie' ? 'saisie' : 'amende' }));
    const s = servicesData.map(d => ({ ...d, _source: 'service' }));
    return [...a, ...s];
  }, [amendesData, servicesData]);

  /* ── Available years ── */
  const availableYears = useMemo(() => {
    return [...new Set(allTagged.map(d => getYear(d.date)).filter(Boolean))].sort((a, b) => b - a);
  }, [allTagged]);

  /* ── Filtered ── */
  const filtered = useMemo(() => {
    return allTagged.filter(item => {
      if (filterYear && getYear(item.date) !== Number(filterYear)) return false;
      if (filterType !== 'all' && item._source !== filterType) return false;
      if (filterService && String(item.service_id) !== String(filterService)) return false;
      return true;
    });
  }, [allTagged, filterYear, filterType, filterService]);

  /* ── KPIs ── */
  const totalAmendes = filtered
    .filter(d => d._source === 'amende')
    .reduce((s, d) => s + Number(d.montant || 0), 0);

  const totalSaisies = filtered
    .filter(d => d._source === 'saisie')
    .reduce((s, d) => s + Number(d.montant || 0), 0);

  const totalServices = filtered
    .filter(d => d._source === 'service')
    .reduce((s, d) => s + Number(d.montant || 0), 0);

  const totalRevenu = totalAmendes + totalSaisies + totalServices;

  /* ── Chart 1: Pie répartition ── */
  const pieSources = [
    { name: 'Amendes', value: totalAmendes },
    { name: 'Saisies', value: totalSaisies },
    { name: 'Services rémunérés', value: totalServices },
  ].filter(d => d.value > 0);

  /* ── Chart 2: Top 8 services ── */
  const serviceMap = {};
  filtered.forEach(d => {
    const nom = d.service?.nom || `Service ${d.service_id || '?'}`;
    serviceMap[nom] = (serviceMap[nom] || 0) + Number(d.montant || 0);
  });
  const topServices = Object.entries(serviceMap)
    .map(([service, montant]) => ({ service, montant }))
    .sort((a, b) => b.montant - a.montant)
    .slice(0, 8);

  /* ── Chart 3: Monthly area ── */
  const monthMap = {};
  filtered.forEach(d => {
    const key = getMonthKey(d.date);
    if (!key) return;
    if (!monthMap[key]) monthMap[key] = { key, amendes: 0, saisies: 0, services: 0 };
    if (d._source === 'amende') monthMap[key].amendes += Number(d.montant || 0);
    else if (d._source === 'saisie') monthMap[key].saisies += Number(d.montant || 0);
    else monthMap[key].services += Number(d.montant || 0);
  });
  const monthlyData = Object.values(monthMap)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(m => {
      const [y, mo] = m.key.split('-');
      return {
        ...m,
        label: `${MONTHS_SHORT[Number(mo) - 1]} ${y}`,
        total: m.amendes + m.saisies + m.services,
      };
    });

  /* ── Chart 4: Bar by amende type ── */
  const amendeTypeMap = {};
  amendesData
    .filter(d => {
      if (filterYear && getYear(d.date) !== Number(filterYear)) return false;
      if (filterService && String(d.service_id) !== String(filterService)) return false;
      return true;
    })
    .forEach(d => {
      const t = d.type || 'Autre';
      amendeTypeMap[t] = (amendeTypeMap[t] || 0) + Number(d.montant || 0);
    });
  const amendeTypeData = Object.entries(amendeTypeMap)
    .map(([type, montant]) => ({ type, montant }))
    .sort((a, b) => b.montant - a.montant);

  /* ── Synthèse mensuelle table ── */
  const synthMonths = Object.values(monthMap).sort((a, b) => a.key.localeCompare(b.key)).map(m => {
    const [y, mo] = m.key.split('-');
    return { ...m, label: `${MONTHS_FR[Number(mo) - 1]} ${y}`, total: m.amendes + m.saisies + m.services };
  });
  const synthTotals = {
    amendes: synthMonths.reduce((s, m) => s + m.amendes, 0),
    saisies: synthMonths.reduce((s, m) => s + m.saisies, 0),
    services: synthMonths.reduce((s, m) => s + m.services, 0),
    total: synthMonths.reduce((s, m) => s + m.total, 0),
  };

  /* ── Rapport textuel ── */
  const bestMonth = synthMonths.length
    ? synthMonths.reduce((best, m) => m.total > best.total ? m : best, synthMonths[0])
    : null;

  const serviceActifEntry = Object.entries(serviceMap).sort((a, b) => b[1] - a[1])[0];
  const typeActif = pieSources.length ? pieSources.reduce((best, p) => p.value > best.value ? p : best, pieSources[0]) : null;

  if (loading) return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] flex items-center justify-center">
          <Banknote size={20} className="text-[#16A34A]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] dark:text-white">Finances & Recettes</h1>
          <p className="text-sm text-[#64748B] dark:text-white/50">Chargement…</p>
        </div>
      </div>
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse bg-[#CBD5E1] dark:bg-white/10 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse bg-[#CBD5E1] dark:bg-white/10 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-4 sm:p-6">

      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} module="amendes" moduleLabel="Finances & Amendes" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1B4332] flex items-center justify-center">
            <Banknote size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0F172A] dark:text-white">Finances & Recettes</h1>
            <p className="text-sm text-[#64748B] dark:text-white/50">
              Amendes, saisies et services rémunérés
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1B4332] text-white text-sm font-medium hover:bg-[#143728] transition-colors"
          >
            <Download size={15} /> Exporter
          </button>
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#16A34A] text-white text-sm font-medium hover:bg-[#15803D] transition-colors"
          >
            <RefreshCw size={15} /> Actualiser
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] rounded-xl p-4 mb-6 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-[#343a40] rounded-2xl border border-[#CBD5E1] dark:border-white/15 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1">Année</label>
            <select className={inputCls} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              <option value="">Toutes les années</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1">Type</label>
            <select className={inputCls} value={filterType} onChange={e => setFilterType(e.target.value)}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1">Service</label>
            <select className={inputCls} value={filterService} onChange={e => setFilterService(e.target.value)}>
              <option value="">Tous les services</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Empty */}
      {filtered.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Banknote size={40} className="text-[#94A3B8]" />
          <p className="text-[#64748B] dark:text-white/50 text-sm">Aucune donnée pour ces filtres</p>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <KpiCard
              icon={Gavel}
              iconColor="#2563EB"
              iconBg="#EFF6FF"
              label="Total amendes"
              value={fcfa(totalAmendes)}
              sub={`${amendesData.filter(d => d.type !== 'saisie').length} enregistrement(s)`}
            />
            <KpiCard
              icon={Briefcase}
              iconColor="#D97706"
              iconBg="#FFFBEB"
              label="Total saisies"
              value={fcfa(totalSaisies)}
              sub={`${amendesData.filter(d => d.type === 'saisie').length} enregistrement(s)`}
            />
            <KpiCard
              icon={Building2}
              iconColor="#7C3AED"
              iconBg="#F5F3FF"
              label="Services rémunérés"
              value={fcfa(totalServices)}
              sub={`${servicesData.length} enregistrement(s)`}
            />
            <KpiCard
              icon={TrendingUp}
              iconColor="#16A34A"
              iconBg="#F0FDF4"
              label="Revenu total"
              value={fcfa(totalRevenu)}
              sub="Amendes + Saisies + Services"
            />
          </div>

          {/* Charts 2x2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

            {/* 1. Pie répartition */}
            <ChartCard title="Répartition des recettes">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieSources}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieSources.map((_, i) => <Cell key={i} fill={ANALYTICS_COLORS[i]} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [fcfa(v), '']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 2. Bar horizontal top services */}
            <ChartCard title="Top 8 services par recettes">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topServices} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    tickFormatter={fcfaShort}
                  />
                  <YAxis type="category" dataKey="service" tick={{ fontSize: 10, fill: '#64748B' }} width={90} />
                  <Tooltip
                    formatter={(v) => [fcfa(v), 'Montant']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12 }}
                  />
                  <Bar dataKey="montant" name="Montant" radius={[0, 4, 4, 0]}>
                    {topServices.map((_, i) => <Cell key={i} fill={ANALYTICS_COLORS[i % ANALYTICS_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 3. Area mensuelle */}
            <ChartCard title="Évolution mensuelle des recettes">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthlyData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <defs>
                    <linearGradient id="gradAmendes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradSaisies" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D97706" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradServices" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={fcfaShort} />
                  <Tooltip content={<MoneyTooltip />} />
                  <Legend iconType="circle" iconSize={10} />
                  <Area type="monotone" dataKey="amendes" name="Amendes" stroke="#2563EB" strokeWidth={2} fill="url(#gradAmendes)" />
                  <Area type="monotone" dataKey="saisies" name="Saisies" stroke="#D97706" strokeWidth={2} fill="url(#gradSaisies)" />
                  <Area type="monotone" dataKey="services" name="Services rémunérés" stroke="#7C3AED" strokeWidth={2} fill="url(#gradServices)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 4. Bar type amende */}
            <ChartCard title="Répartition par type d'amende">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={amendeTypeData} margin={{ top: 4, right: 8, bottom: 24, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
                  <XAxis dataKey="type" tick={{ fontSize: 10, fill: '#64748B' }} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={fcfaShort} />
                  <Tooltip
                    formatter={(v) => [fcfa(v), 'Montant']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12 }}
                  />
                  <Bar dataKey="montant" name="Montant" radius={[4, 4, 0, 0]}>
                    {amendeTypeData.map((_, i) => <Cell key={i} fill={ANALYTICS_COLORS[i % ANALYTICS_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Synthèse mensuelle table */}
          {synthMonths.length > 0 && (
            <div className="bg-white dark:bg-[#343a40] rounded-2xl border border-[#CBD5E1] dark:border-white/15 overflow-hidden mb-6">
              <div className="px-5 py-4 border-b border-[#CBD5E1] dark:border-white/15 flex items-center gap-2">
                <Calendar size={16} className="text-[#16A34A]" />
                <h3 className="font-semibold text-[#0F172A] dark:text-white text-sm">Synthèse mensuelle</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F8FAFC] dark:bg-white/5 border-b border-[#CBD5E1] dark:border-white/15">
                      {['Mois', 'Amendes (FCFA)', 'Saisies (FCFA)', 'Services rémunérés (FCFA)', 'Total (FCFA)'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[#64748B] dark:text-white/50 font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {synthMonths.map((m, i) => (
                      <tr
                        key={m.key}
                        className={`border-b border-[#F1F5F9] dark:border-white/5 hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors ${i % 2 !== 0 ? 'bg-[#FAFAFA] dark:bg-white/2' : ''}`}
                      >
                        <td className="px-4 py-2.5 text-[#0F172A] dark:text-white font-medium whitespace-nowrap">{m.label}</td>
                        <td className="px-4 py-2.5 text-[#2563EB]">{Number(m.amendes).toLocaleString('fr-FR')}</td>
                        <td className="px-4 py-2.5 text-[#D97706]">{Number(m.saisies).toLocaleString('fr-FR')}</td>
                        <td className="px-4 py-2.5 text-[#7C3AED]">{Number(m.services).toLocaleString('fr-FR')}</td>
                        <td className="px-4 py-2.5 font-semibold text-[#16A34A]">{Number(m.total).toLocaleString('fr-FR')}</td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="bg-[#F0FDF4] dark:bg-[#16A34A]/10 border-t-2 border-[#BBF7D0] dark:border-[#16A34A]/30">
                      <td className="px-4 py-3 font-bold text-[#0F172A] dark:text-white">TOTAL</td>
                      <td className="px-4 py-3 font-bold text-[#2563EB]">{Number(synthTotals.amendes).toLocaleString('fr-FR')}</td>
                      <td className="px-4 py-3 font-bold text-[#D97706]">{Number(synthTotals.saisies).toLocaleString('fr-FR')}</td>
                      <td className="px-4 py-3 font-bold text-[#7C3AED]">{Number(synthTotals.services).toLocaleString('fr-FR')}</td>
                      <td className="px-4 py-3 font-bold text-[#16A34A]">{Number(synthTotals.total).toLocaleString('fr-FR')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rapport textuel */}
          {(bestMonth || serviceActifEntry || typeActif) && (
            <div className="bg-white dark:bg-[#343a40] rounded-2xl border border-[#CBD5E1] dark:border-white/15 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award size={16} className="text-[#D97706]" />
                <h3 className="font-semibold text-[#0F172A] dark:text-white text-sm">Synthèse & Rapport</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {bestMonth && (
                  <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-lg overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                    <div className="h-1 bg-[#D97706]" />
                    <div className="px-4 py-3">
                      <p className="text-base font-bold text-[#0F172A] dark:text-white">{bestMonth.label}</p>
                      <p className="text-xs text-[#64748B] dark:text-white/50 mt-1">{fcfa(bestMonth.total)}</p>
                      <p className="text-[10px] text-[#94A3B8] dark:text-white/30 mt-1 uppercase font-semibold">Mois le plus actif</p>
                    </div>
                  </div>
                )}
                {serviceActifEntry && (
                  <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-lg overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                    <div className="h-1 bg-[#1B4332]" />
                    <div className="px-4 py-3">
                      <p className="text-base font-bold text-[#0F172A] dark:text-white line-clamp-2">{serviceActifEntry[0]}</p>
                      <p className="text-xs text-[#64748B] dark:text-white/50 mt-1">{fcfa(serviceActifEntry[1])}</p>
                      <p className="text-[10px] text-[#94A3B8] dark:text-white/30 mt-1 uppercase font-semibold">Service le plus actif</p>
                    </div>
                  </div>
                )}
                {typeActif && (
                  <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-lg overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                    <div className="h-1 bg-[#16A34A]" />
                    <div className="px-4 py-3">
                      <p className="text-base font-bold text-[#0F172A] dark:text-white">{typeActif.name}</p>
                      <p className="text-xs text-[#64748B] dark:text-white/50 mt-1">{fcfa(typeActif.value)}</p>
                      <p className="text-[10px] text-[#94A3B8] dark:text-white/30 mt-1 uppercase font-semibold">Type le plus fréquent</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

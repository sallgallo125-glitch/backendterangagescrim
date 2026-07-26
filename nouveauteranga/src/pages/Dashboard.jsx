import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCached, setCached, clearCached } from '../lib/pageCache';
import { ShimmerStatCard } from '../components/Shimmer';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import {
  AlertCircle, Activity, Users, Banknote,
  BarChart3, Target, UserCheck, Plane,
  ShieldAlert, Percent, RefreshCw, AlertTriangle, Download,
  Maximize2, Minimize2, ChevronLeft, ChevronRight, X,
  FileText, Car, BadgeCheck, ArrowRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import GeoFilterComponent from '../components/GeoFilterComponent';
import dashboardService from '../services/dashboardService';
import ResponsiveContainer from '../components/ChartContainer';

const PIE_COLORS = ['#DC2626', '#D97706', '#1B4332', '#059669', '#7C3AED', '#0891B2'];
const BAR_COLORS = ['#1B4332', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2',
  '#212529', '#6B7280', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4',
  '#10B981', '#F97316'];


const MOIS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const MOIS_LABELS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

/* ─── Composants réutilisables ─── */
const CustomTooltip = memo(({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="tooltip-premium space-y-1">
      <p className="text-[#6B7280] dark:text-white/50 mb-1 font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>{p.value} {p.name}</p>
      ))}
    </div>
  );
});

const ICON_SOLID_BG = {
  'bg-[#FEF3C7] text-[#D97706]': 'bg-[#D97706]',
  'bg-[#FEE2E2] text-[#DC2626]': 'bg-[#DC2626]',
  'bg-[#DBEAFE] text-[#1B4332]': 'bg-[#1B4332]',
  'bg-[#ECFDF5] text-[#059669]': 'bg-[#059669]',
  'bg-[#DBEAFE] text-[#2563EB]': 'bg-[#2563EB]',
};

const STAT_BAR_COLORS = {
  'bg-[#FEF3C7] text-[#D97706]': '#D97706',
  'bg-[#FEE2E2] text-[#DC2626]': '#DC2626',
  'bg-[#DBEAFE] text-[#1B4332]': '#1B4332',
  'bg-[#ECFDF5] text-[#059669]': '#059669',
  'bg-[#DBEAFE] text-[#2563EB]': '#2563EB',
};

const StatCard = memo(function StatCard({ title, value, icon: Icon, iconColor, sub }) {
  const barColor = STAT_BAR_COLORS[iconColor] || '#1B4332';
  const solidBg = ICON_SOLID_BG[iconColor] || 'bg-[#1B4332]';

  return (
    <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-lg overflow-hidden">
      <div className="h-1" style={{ background: barColor }} />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-2xl font-bold text-[#0F172A] dark:text-white tabular-nums">{value}</p>
            <p className="text-xs text-[#64748B] dark:text-white/50 font-medium mt-1">{title}</p>
            {sub && <p className="text-[11px] text-[#9CA3AF] dark:text-white/30 mt-1.5">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${solidBg}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
});

const SectionTitle = memo(function SectionTitle({ icon: Icon, title, sub }) {
  return (
    <div className="mb-5">
      <h2 className="text-[15px] font-semibold text-[#212529] dark:text-white flex items-center gap-2 tracking-[-0.01em]">
        {Icon && <Icon className="w-4 h-4 text-[#1B4332]" />}
        {title}
      </h2>
      {sub && <p className="text-[11px] text-[#6B7280] dark:text-white/50 mt-1">{sub}</p>}
    </div>
  );
});

const ChartCard = memo(function ChartCard({ children, className = '' }) {
  return (
    <div className={`card-premium p-6 ${className}`}>
      {children}
    </div>
  );
});

const QuickAccessCard = memo(function QuickAccessCard({ title, subtitle, gradient, icon: Icon, onClick, value, valueLabel }) {
  return (
    <button
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden text-left w-full group transition-transform hover:-translate-y-0.5 active:translate-y-0"
      style={{ background: `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 100%)` }}
    >
      {/* Cercles décoratifs */}
      <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full bg-white/[0.06]" />
      <div className="absolute top-2 right-2 w-14 h-14 rounded-full bg-white/[0.06]" />

      <div className="relative p-5 flex flex-col gap-3 min-h-[140px]">
        {/* Icône */}
        <div className="w-11 h-11 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-white" />
        </div>

        {/* Compteur si disponible */}
        {value !== undefined && (
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-white tabular-nums leading-none">{value}</span>
            {valueLabel && <span className="text-white/60 text-xs mb-0.5">{valueLabel}</span>}
          </div>
        )}

        {/* Titre + sous-titre en bas */}
        <div className="mt-auto pr-10">
          <p className="text-white font-bold text-sm leading-tight">{title}</p>
          <p className="text-white/70 text-xs mt-0.5 leading-snug line-clamp-2">{subtitle}</p>
        </div>
      </div>

      {/* Bouton flèche */}
      <div
        className="absolute bottom-4 right-4 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-md"
        style={{ color: gradient[1] }}
      >
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </button>
  );
});

const PeriodeBadge = memo(function PeriodeBadge({ annee, mois, geoFilters, currentYear }) {
  const parts = [];
  if (mois) parts.push(MOIS_LABELS[parseInt(mois) - 1]);
  if (annee) parts.push(annee);
  else parts.push(currentYear);
  if (geoFilters?.region_id) parts.push('Région sélectionnée');

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ECFDF5] dark:bg-[#1B4332]/15 border border-[#A7F3D0] dark:border-[#1B4332]/25 rounded-xl text-[11px] font-semibold text-[#065F46] dark:text-[#52B788] tracking-[-0.01em]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse" />
      Période : {parts.join(' · ')}
    </div>
  );
});

/* ─── Dashboard principal ─── */
export default function Dashboard() {
  const { dark } = useTheme();
  const gridColor = dark ? '#334155' : '#F1F5F9';
  const { user } = useAuth();
  const perms = usePermissions();
  const navigate = useNavigate();

  const CACHE_KEY = 'dashboard_data';

  const [stats, setStats] = useState(null);
  const [tendances, setTendances] = useState([]);
  const [accidentsParType, setAccidentsParType] = useState([]);
  const [infractionsParRegion, setInfractionsParRegion] = useState([]);
  const [infractionsParType, setInfractionsParType] = useState([]);
  const [personnelParService, setPersonnelParService] = useState([]);
  const [saisiesParHeure, setSaisiesParHeure] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [geoFilters, setGeoFilters] = useState({});
  const [annee, setAnnee] = useState('');
  const [mois, setMois] = useState('');
  const [dateExact, setDateExact] = useState(''); // YYYY-MM-DD for "today" chip
  const [activeChip, setActiveChip] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const dashboardRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      dashboardRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        if (import.meta.env.DEV) console.error("Error enabling fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);


  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const anneeOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);
  const moisOptions = MOIS_LABELS.map((label, i) => ({ value: String(i + 1), label }));
  const isMoisDisabled = (m) => {
    const selectedYear = annee ? parseInt(annee) : currentYear;
    return selectedYear === currentYear && parseInt(m) > currentMonth;
  };

  const QUICK_PERIODS = [
    { key: 'today', label: "Aujourd'hui" },
    { key: 'month', label: 'Ce mois' },
    { key: '3months', label: '3 mois' },
    { key: 'year', label: 'Cette année' },
  ];

  const applyQuickPeriod = (key) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    if (key === 'today') {
      setAnnee(String(now.getFullYear()));
      setMois(String(now.getMonth() + 1));
      setDateExact(todayStr);
      setActiveChip('today');
    } else if (key === 'month') {
      setAnnee(String(now.getFullYear()));
      setMois(String(now.getMonth() + 1));
      setDateExact('');
      setActiveChip('month');
    } else if (key === '3months') {
      setAnnee(String(now.getFullYear()));
      setMois('');
      setDateExact('');
      setActiveChip('3months');
    } else if (key === 'year') {
      setAnnee(String(now.getFullYear()));
      setMois('');
      setDateExact('');
      setActiveChip('year');
    }
  };

  const navigatePeriod = (dir) => {
    const y = annee ? parseInt(annee) : currentYear;
    const m = mois ? parseInt(mois) : 0;
    if (m > 0) {
      let nm = m + dir;
      let ny = y;
      if (nm < 1) { nm = 12; ny -= 1; }
      if (nm > 12) { nm = 1; ny += 1; }
      if (ny > currentYear || (ny === currentYear && nm > currentMonth)) return;
      if (ny < currentYear - 5) return;
      setAnnee(String(ny));
      setMois(String(nm));
    } else {
      const ny = y + dir;
      if (ny > currentYear || ny < currentYear - 5) return;
      setAnnee(String(ny));
    }
    setDateExact('');
    setActiveChip('');
  };

  const fetchData = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        ...geoFilters,
        ...(annee ? { annee } : {}),
        ...(mois ? { mois } : {}),
        ...(dateExact ? { date: dateExact } : {}),
      };

      const results = await Promise.allSettled([
        dashboardService.getStats(params),
        dashboardService.getTendancesMensuelles(params),
        dashboardService.getAccidentsParType(params),
        dashboardService.getInfractionsParRegion(params),
        dashboardService.getInfractionsParType(params),
        dashboardService.getPersonnelParService(params),
        dashboardService.getSaisiesParHeure(params),
      ]);

      const [resStats, resTendances, resAccidents, resInfRegion, resInfType, resPersoService, resSaisiesHeure] = results.map((r) => r.status === 'fulfilled' ? r.value : null);

      if (results.every(r => r.status === 'rejected')) {
        setError('Impossible de charger les données. Vérifiez votre connexion.');
        return;
      }

      /* --- Stats globales --- */
      const rawStats = resStats ? (resStats.data?.data || resStats.data) : null;
      setStats(rawStats || {});

      /* --- Tendances mensuelles (infractions + accidents + immigration) --- */
      const dataTendances = resTendances ? (resTendances.data?.data || resTendances.data) : null;

      // Détermine les mois à afficher : Jan→mois courant (si année en cours) ou Jan→Déc
      const selectedYear = annee ? parseInt(annee) : currentYear;
      const lastMonth = selectedYear === currentYear ? currentMonth : 12;
      // Initialise tous les mois de Janvier jusqu'au dernier mois visible avec des valeurs à 0
      const byMonth = {};
      for (let m = 1; m <= lastMonth; m++) {
        byMonth[m] = { name: MOIS_FR[m - 1], infractions: 0, accidents: 0, immigration: 0 };
      }

      let tendancesArr = [];
      if (dataTendances && !Array.isArray(dataTendances)) {
        const inf = dataTendances.infractions || [];
        const acc = dataTendances.accidents || [];
        const imm = dataTendances.immigration || [];
        inf.forEach(t => {
          const m = parseInt(t.mois);
          if (byMonth[m]) byMonth[m].infractions = parseInt(t.total) || 0;
        });
        acc.forEach(t => {
          const m = parseInt(t.mois);
          if (byMonth[m]) byMonth[m].accidents = parseInt(t.total) || 0;
        });
        imm.forEach(t => {
          const m = parseInt(t.mois);
          if (byMonth[m]) byMonth[m].immigration = parseInt(t.total) || 0;
        });
        tendancesArr = Object.values(byMonth);
      } else if (Array.isArray(dataTendances) && dataTendances.length > 0) {
        dataTendances.forEach(t => {
          const m = parseInt(t.mois);
          if (byMonth[m]) {
            byMonth[m].infractions = parseInt(t.infractions || t.total) || 0;
            byMonth[m].accidents = parseInt(t.accidents) || 0;
            byMonth[m].immigration = parseInt(t.immigration) || 0;
          }
        });
        tendancesArr = Object.values(byMonth);
      } else {
        tendancesArr = Object.values(byMonth);
      }

      setTendances(tendancesArr);

      /* --- Accidents par type --- */
      const dataAccidents = resAccidents ? (resAccidents.data?.data || resAccidents.data) : null;
      const finalAccidentsParType = Array.isArray(dataAccidents)
        ? dataAccidents.map(a => ({
            name: a.type || a.nom || String(a.name || ''),
            value: parseInt(a.total || a.value) || 0,
          })).filter(a => a.name && a.value > 0)
        : [];
      setAccidentsParType(finalAccidentsParType);

      /* --- Infractions par région --- */
      const dataRegion = resInfRegion ? (resInfRegion.data?.data || resInfRegion.data) : null;
      let finalInfractionsParRegion;
      if (Array.isArray(dataRegion) && dataRegion.length > 0) {
        finalInfractionsParRegion = dataRegion.map(r => ({
          region: r.region || r.nom || String(r.name || ''),
          total: parseInt(r.total) || 0,
        })).filter(r => r.region && r.total > 0);
      } else {
        finalInfractionsParRegion = [];
      }
      setInfractionsParRegion(finalInfractionsParRegion);

      /* --- Infractions par catégorie (PieChart) --- */
      const dataType = resInfType ? (resInfType.data?.data || resInfType.data) : null;
      let finalInfractionsParType = [];
      if (Array.isArray(dataType) && dataType.length > 0) {
        const byKey = {};
        dataType.forEach(t => {
          const key = t.categorie || t.type || t.nom || t.name || 'Autre';
          if (!byKey[key]) byKey[key] = 0;
          byKey[key] += parseInt(t.total || t.value) || 0;
        });
        finalInfractionsParType = Object.entries(byKey)
          .map(([name, value]) => ({ name, value }))
          .filter(e => e.value > 0)
          .sort((a, b) => b.value - a.value);
      }
      setInfractionsParType(finalInfractionsParType);

      /* --- Personnel par service --- */
      const dataPerso = resPersoService ? (resPersoService.data?.data || resPersoService.data) : null;
      const finalPersonnelParService = Array.isArray(dataPerso)
        ? dataPerso.map(p => ({
            service: p.service || p.nom || p.name || String(p.id || ''),
            total: parseInt(p.total || p.effectif) || 0,
            type: p.type || '',
          })).filter(p => p.service && p.total > 0)
        : [];
      setPersonnelParService(finalPersonnelParService);

      /* --- Saisies par heure --- */
      const dataHeure = resSaisiesHeure ? (resSaisiesHeure.data?.data || resSaisiesHeure.data) : null;
      setSaisiesParHeure(Array.isArray(dataHeure) ? dataHeure : []);

      setCached(CACHE_KEY, {
        stats: rawStats || {},
        tendances: tendancesArr,
        accidentsParType: finalAccidentsParType,
        infractionsParRegion: finalInfractionsParRegion,
        infractionsParType: finalInfractionsParType,
        personnelParService: finalPersonnelParService,
      });

    } catch (err) {
      if (signal?.aborted) return;
      if (import.meta.env.DEV) console.error('Dashboard data error', err);
      setError('Impossible de charger les données. Vérifiez votre connexion.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [geoFilters, annee, mois, dateExact]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData, refreshKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* ── Indicateurs calculés ── */
  const tauxDeferrement = useMemo(() => {
    if (!stats?.total_infractions) return null;
    return Math.round((stats.infractions_deferees / stats.total_infractions) * 100);
  }, [stats]);

  const tauxMortalite = useMemo(() => {
    if (!stats?.total_accidents) return null;
    return Math.round((stats.accidents_mortels / stats.total_accidents) * 100);
  }, [stats]);

  const totalInfRegion = useMemo(
    () => infractionsParRegion.reduce((s, r) => s + r.total, 0),
    [infractionsParRegion]
  );

  /* ── KPI cards ── */
  const kpis = stats ? [
    {
      title: 'Total Infractions',
      value: (stats.total_infractions || 0).toLocaleString('fr-FR'),
      sub: `Constatées: ${stats.infractions_constatees || 0} · Déférées: ${stats.infractions_deferees || 0}`,
      icon: AlertCircle,
      iconColor: 'bg-[#FEF3C7] text-[#D97706]',
      trend: 'neutral', label: 'Cumulé',
    },
    {
      title: 'Accidents',
      value: (stats.total_accidents || 0).toLocaleString('fr-FR'),
      sub: `Mortels: ${stats.accidents_mortels || 0} · Corporels: ${stats.accidents_corporels || 0}`,
      icon: Activity,
      iconColor: 'bg-[#FEE2E2] text-[#DC2626]',
      trend: 'neutral', label: 'Cumulé',
    },
    {
      title: 'Effectif Actif',
      value: (stats.total_personnel || 0).toLocaleString('fr-FR'),
      sub: 'Agents en service actif',
      icon: Users,
      iconColor: 'bg-[#DBEAFE] text-[#1B4332]',
      trend: 'up_good', label: 'Personnel DSP',
    },
    {
      title: 'Amendes CFA',
      value: new Intl.NumberFormat('fr-SN').format(stats.total_amendes || 0),
      sub: 'Recettes amendes forfaitaires',
      icon: Banknote,
      iconColor: 'bg-[#ECFDF5] text-[#059669]',
      trend: 'up_good', label: 'Recettes totales',
    },
    {
      title: 'Taux de déferrement',
      value: tauxDeferrement !== null ? `${tauxDeferrement}%` : 'N/A',
      sub: `${stats.infractions_deferees || 0} infractions déférées sur ${stats.total_infractions || 0}`,
      icon: Percent,
      iconColor: 'bg-[#DBEAFE] text-[#2563EB]',
      trend: tauxDeferrement !== null && tauxDeferrement > 30 ? 'up_good' : 'neutral',
      label: 'Déférées / Total',
    },
    {
      title: 'Taux mortalité',
      value: tauxMortalite !== null ? `${tauxMortalite}%` : 'N/A',
      sub: `${stats.accidents_mortels || 0} accidents mortels sur ${stats.total_accidents || 0}`,
      icon: ShieldAlert,
      iconColor: 'bg-[#FEE2E2] text-[#DC2626]',
      trend: tauxMortalite !== null && tauxMortalite > 10 ? 'up_bad' : 'neutral',
      label: 'Mortels / Total',
    },
    {
      title: 'Immigration',
      value: (stats.total_immigration || 0).toLocaleString('fr-FR'),
      sub: 'Personnes interpellées',
      icon: Plane,
      iconColor: 'bg-[#DBEAFE] text-[#2563EB]',
      trend: 'neutral', label: 'Interpellations',
    },
    {
      title: 'Accidents matériels',
      value: (stats.accidents_materiels || 0).toLocaleString('fr-FR'),
      sub: 'Sans blessé ni décès',
      icon: Activity,
      iconColor: 'bg-[#FEF3C7] text-[#D97706]',
      trend: 'neutral', label: 'Matériels',
    },
  ] : [];

  /* ── Label période pour les titres de sections ── */
  const labelPeriode = useMemo(() => {
    const parts = [];
    if (mois) parts.push(MOIS_LABELS[parseInt(mois) - 1]);
    if (annee) parts.push(annee);
    else parts.push(currentYear);
    return parts.join(' ');
  }, [annee, mois, currentYear]);

  /* ── Export CSV simplifié ── */
  const handleExportCsv = () => {
    if (!stats) return;
    const rows = [
      ['Indicateur', 'Valeur'],
      ['Total infractions', stats.total_infractions || 0],
      ['Infractions constatées', stats.infractions_constatees || 0],
      ['Infractions déférées', stats.infractions_deferees || 0],
      ['Total accidents', stats.total_accidents || 0],
      ['Accidents mortels', stats.accidents_mortels || 0],
      ['Accidents corporels', stats.accidents_corporels || 0],
      ['Accidents matériels', stats.accidents_materiels || 0],
      ['Effectif actif', stats.total_personnel || 0],
      ['Immigration', stats.total_immigration || 0],
      ['Amendes CFA', stats.total_amendes || 0],
      ['Taux déferrement (%)', tauxDeferrement],
      ['Taux mortalité (%)', tauxMortalite],
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard_${labelPeriode.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div ref={dashboardRef} className="space-y-8 max-w-[1400px] dashboard-fullscreen">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white">Tableau de Bord</h1>
          <p className="text-sm text-[#64748B] dark:text-white/50 mt-1">Supervision nationale — DSP Sénégal</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Bouton refresh */}
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            disabled={loading}
            title="Rafraîchir les données"
            className="p-1.5 rounded-lg border border-[#CBD5E1] dark:border-white/10 bg-white dark:bg-[#343a40] text-[#64748B] dark:text-white/50 hover:text-[#2563EB] hover:border-[#2563EB] transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            disabled={!stats || loading}
            title="Exporter les KPI en CSV"
            className="p-1.5 rounded-lg border border-[#CBD5E1] dark:border-white/10 bg-white dark:bg-[#343a40] text-[#64748B] dark:text-white/50 hover:text-[#16A34A] hover:border-[#16A34A] transition-colors disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
          </button>
          {/* Zoom/Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Quitter le plein écran" : "Plein écran (Zoom)"}
            className="p-1.5 rounded-lg border border-[#BFDBFE] dark:border-[#2563EB]/30 bg-[#EFF6FF] dark:bg-[#1B4332]/10 text-[#2563EB] hover:bg-[#1B4332] hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4.5 h-4.5" />}
          </button>
        </div>
      </div>

      {/* ── Barre de navigation temporelle ── */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-3 flex flex-wrap gap-3 items-center shadow-[0_1px_3px_rgba(15,23,42,0.04)]">

        {/* Chips accès rapide */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {QUICK_PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => applyQuickPeriod(p.key)}
              className={`h-7 px-3 text-xs font-medium rounded-full border transition-all ${activeChip === p.key
                  ? 'bg-[#1B4332] border-[#2563EB] text-white'
                  : 'bg-[#F8FAFC] dark:bg-white/5 border-[#CBD5E1] dark:border-white/10 text-[#64748B] dark:text-white/50 hover:border-[#2563EB] hover:text-[#2563EB]'
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-[#CBD5E1] dark:bg-white/15 mx-0.5" />

        {/* Navigateur Prev / Période / Next */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigatePeriod(-1)}
            title="Période précédente"
            className="p-1.5 rounded-lg border border-[#CBD5E1] dark:border-white/10 bg-[#F8FAFC] dark:bg-white/5 text-[#64748B] dark:text-white/50 hover:text-[#2563EB] hover:border-[#2563EB] transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="min-w-[110px] text-center px-3 py-1 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-xs font-semibold text-[#0F172A] dark:text-white select-none">
            {mois ? `${MOIS_LABELS[parseInt(mois) - 1]} ${annee || currentYear}` : (annee || currentYear)}
          </div>
          <button
            onClick={() => navigatePeriod(+1)}
            title="Période suivante"
            className="p-1.5 rounded-lg border border-[#CBD5E1] dark:border-white/10 bg-[#F8FAFC] dark:bg-white/5 text-[#64748B] dark:text-white/50 hover:text-[#2563EB] hover:border-[#2563EB] transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-5 w-px bg-[#CBD5E1] dark:bg-white/15 mx-0.5" />

        {/* Filtre année */}
        <select
          value={annee}
          onChange={e => { setAnnee(e.target.value); setMois(''); setActiveChip(''); }}
          className="h-8 text-xs border border-[#CBD5E1] dark:border-white/10 rounded-lg px-2 bg-white dark:bg-[#343a40] text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
        >
          <option value="">Toutes années</option>
          {anneeOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        {/* Filtre mois */}
        <select
          value={mois}
          onChange={e => { setMois(e.target.value); setActiveChip(''); }}
          className="h-8 text-xs border border-[#CBD5E1] dark:border-white/10 rounded-lg px-2 bg-white dark:bg-[#343a40] text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
        >
          <option value="">Tous mois</option>
          {moisOptions.map(m => (
            <option key={m.value} value={m.value} disabled={isMoisDisabled(m.value)}>
              {m.label}{isMoisDisabled(m.value) ? ' (à venir)' : ''}
            </option>
          ))}
        </select>

        <GeoFilterComponent onChange={f => { setGeoFilters(f); setActiveChip(''); }} />
      </div>

      {/* ── Filter Context Bar ── */}
      {(annee || mois || geoFilters?.region_id) && (
        <div className="flex items-center gap-2 flex-wrap px-1">
          <span className="text-xs text-[#94A3B8] dark:text-white/30 font-medium">Filtre actif :</span>
          {annee && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EFF6FF] dark:bg-[#1B4332]/10 border border-[#BFDBFE] dark:border-[#2563EB]/20 text-xs font-medium text-[#1D4ED8] dark:text-[#60A5FA]">
              {annee}
              <button onClick={() => { setAnnee(''); setMois(''); setActiveChip(''); }} aria-label="Supprimer le filtre année" className="ml-0.5 hover:text-[#DC2626]"><X className="w-3 h-3" aria-hidden="true" /></button>
            </span>
          )}
          {mois && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EFF6FF] dark:bg-[#1B4332]/10 border border-[#BFDBFE] dark:border-[#2563EB]/20 text-xs font-medium text-[#1D4ED8] dark:text-[#60A5FA]">
              {MOIS_LABELS[parseInt(mois) - 1]}
              <button onClick={() => { setMois(''); setActiveChip(''); }} aria-label="Supprimer le filtre mois" className="ml-0.5 hover:text-[#DC2626]"><X className="w-3 h-3" aria-hidden="true" /></button>
            </span>
          )}
          {geoFilters?.region_id && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F0FDF4] dark:bg-green-900/20 border border-[#BBF7D0] dark:border-green-800 text-xs font-medium text-[#16A34A]">
              Zone géo active
            </span>
          )}
          <button
            onClick={() => { setAnnee(''); setMois(''); setGeoFilters({}); setActiveChip(''); }}
            className="text-xs text-[#94A3B8] dark:text-white/30 hover:text-[#DC2626] underline ml-1 transition-colors"
          >
            Tout réinitialiser
          </button>
          {!loading && stats && (
            <span className="text-xs text-[#94A3B8] dark:text-white/30 ml-auto">
              {(stats.total_infractions || 0) + (stats.total_accidents || 0)} événements · {stats.total_personnel || 0} agents actifs
            </span>
          )}
        </div>
      )}

      {/* ── Badge période active ── */}
      {!(annee || mois || geoFilters?.region_id) && (
        <div className="flex items-center gap-3 flex-wrap">
          <PeriodeBadge annee={annee} mois={mois} geoFilters={geoFilters} currentYear={currentYear} />
          {!loading && stats && (
            <span className="text-xs text-[#94A3B8] dark:text-white/30">
              {(stats.total_infractions || 0) + (stats.total_accidents || 0)} événements · {stats.total_personnel || 0} agents actifs
            </span>
          )}
        </div>
      )}

      {/* ── Bannière erreur ── */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[#FEF2F2] dark:bg-red-900/20 border border-[#FECACA] dark:border-red-800 rounded-xl text-sm text-[#DC2626] dark:text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setRefreshKey(k => k + 1)} className="ml-auto text-xs underline font-medium">Réessayer</button>
        </div>
      )}

      {/* ── Accès rapide (cards style mobile) ── */}
      <div>
        <p className="text-xs font-semibold text-[#94A3B8] dark:text-white/30 uppercase tracking-widest mb-3">
          Accès rapide
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickAccessCard
            title="Infractions"
            subtitle="Consulter et gérer les infractions constatées"
            gradient={['#1B4332', '#0D2B1E']}
            icon={FileText}
            onClick={() => navigate('/infractions')}
            value={stats ? (stats.total_infractions || 0).toLocaleString('fr-FR') : undefined}
            valueLabel="total"
          />
          <QuickAccessCard
            title="Accidents"
            subtitle="Déclarer et suivre les accidents de la circulation"
            gradient={['#DC2626', '#B91C1C']}
            icon={Car}
            onClick={() => navigate('/accidents')}
            value={stats ? (stats.total_accidents || 0).toLocaleString('fr-FR') : undefined}
            valueLabel="total"
          />
          <QuickAccessCard
            title="Immigration"
            subtitle="Contrôle et gestion des cas d'immigration clandestine"
            gradient={['#0F766E', '#115E59']}
            icon={BadgeCheck}
            onClick={() => navigate('/immigration')}
            value={stats ? (stats.total_immigration || 0).toLocaleString('fr-FR') : undefined}
            valueLabel="interpellations"
          />
        </div>
      </div>

      {/* ── KPI Cards ligne 1 ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <ShimmerStatCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.slice(0, 4).map(k => <StatCard key={k.title} {...k} />)}
        </div>
      )}


      {/* ── Évolution mensuelle (3 séries : infractions + accidents + immigration) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard className="lg:col-span-2">
          <SectionTitle title="Évolution Mensuelle" sub={`Infractions, accidents et immigration — ${labelPeriode}`} />
          <div>
            {tendances.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={tendances} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradInfr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradAcc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#DC2626" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradImm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={gridColor} vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="infractions" name="Infractions" stroke="#2563EB" strokeWidth={2} fill="url(#gradInfr)" dot={false} activeDot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="accidents" name="Accidents" stroke="#DC2626" strokeWidth={2} fill="url(#gradAcc)" dot={false} activeDot={{ r: 4, fill: '#DC2626', strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="immigration" name="Immigration" stroke="#0D9488" strokeWidth={2} fill="url(#gradImm)" dot={false} activeDot={{ r: 4, fill: '#0D9488', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-[#94A3B8] dark:text-white/30 border border-dashed border-[#CBD5E1] dark:border-white/15 rounded-lg">
                Aucune donnée pour cette période
              </div>
            )}
          </div>
        </ChartCard>

        {/* Répartition accidents par type */}
        <ChartCard>
          <SectionTitle title="Répartition Accidents" sub="Par type de gravité" />
          {accidentsParType.length > 0 ? (
            <div className="space-y-4">
              <div>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={accidentsParType} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
                      {accidentsParType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: 12 }} formatter={v => [`${v} accidents`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {accidentsParType.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-[#64748B] dark:text-white/50 capitalize">{entry.name}</span>
                    </div>
                    <span className="font-semibold text-[#0F172A] dark:text-white tabular-nums">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-[#94A3B8] dark:text-white/30 border border-dashed border-[#CBD5E1] dark:border-white/15 rounded-lg">Aucune donnée</div>
          )}
        </ChartCard>
      </div>


      {/* ── Infractions par région ── */}
      {infractionsParRegion.length > 0 && user?.read_scope_type !== 'service' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChartCard className="lg:col-span-2">
            <SectionTitle icon={BarChart3} title="Infractions par région"
              sub={`${labelPeriode} — classement des zones sensibles`} />
            <div>
              <ResponsiveContainer width="100%" height={270}>
                <BarChart data={infractionsParRegion} margin={{ top: 4, right: 4, left: -10, bottom: 40 }}>
                  <CartesianGrid stroke={gridColor} vertical={false} />
                  <XAxis dataKey="region" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Infractions" radius={[4, 4, 0, 0]}>
                    {infractionsParRegion.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard>
            <SectionTitle icon={Target} title="Zones les plus touchées" sub="Top régions par infractions" />
            <div className="space-y-3 mt-2">
              {infractionsParRegion.slice(0, 8).map((r, i) => {
                const pct = totalInfRegion > 0 ? Math.round((r.total / totalInfRegion) * 100) : 0;
                const colors = ['bg-[#DC2626]', 'bg-[#D97706]', 'bg-[#1B4332]', 'bg-[#16A34A]',
                  'bg-[#7C3AED]', 'bg-[#0891B2]', 'bg-[#64748B]', 'bg-[#94A3B8]'];
                return (
                  <div key={r.region}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${colors[i % colors.length]}`} />
                        <span className="font-medium text-[#0F172A] dark:text-white truncate max-w-[110px]">{r.region}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-[#0F172A] dark:text-white tabular-nums">{r.total}</span>
                        <span className="text-[#94A3B8] dark:text-white/30 w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[#F1F5F9] dark:bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        </div>
      )}

      {/* ── Formes de criminalité + Effectifs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* PieChart infractions par catégorie */}
        <ChartCard>
          <SectionTitle icon={AlertCircle} title="Formes de criminalité" sub={`Répartition par catégorie — ${labelPeriode}`} />
          {infractionsParType.length > 0 ? (
            <div className="space-y-4">
              <div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={infractionsParType} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
                      {infractionsParType.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: 12 }} formatter={v => [`${v} infractions`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {infractionsParType.map((t, i) => (
                  <div key={t.name} className="flex items-center justify-between text-xs py-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
                      <span className="text-[#64748B] dark:text-white/50 truncate max-w-[160px]">{t.name}</span>
                    </div>
                    <span className="font-semibold text-[#0F172A] dark:text-white tabular-nums shrink-0">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-[#94A3B8] dark:text-white/30 border border-dashed border-[#CBD5E1] dark:border-white/15 rounded-lg">Aucune donnée</div>
          )}
        </ChartCard>

        {/* BarChart personnel par service */}
        <ChartCard>
          <SectionTitle icon={UserCheck} title="Effectifs par commissariat" sub="Agents actifs — répartition territoriale" />
          {personnelParService.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {personnelParService.slice(0, 10).map((p) => {
                const maxVal = personnelParService[0]?.total || 1;
                const pct = Math.round((p.total / maxVal) * 100);
                const isLow = p.total < 5;
                return (
                  <div key={p.service}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLow ? 'bg-[#DC2626]' : 'bg-[#1B4332]'}`} />
                        <span className={`truncate max-w-[160px] font-medium ${isLow ? 'text-[#DC2626]' : 'text-[#0F172A] dark:text-white'}`}>
                          {p.service}
                        </span>
                        {isLow && <span className="text-[9px] bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] px-1 py-0.5 rounded font-bold shrink-0">Sous-eff.</span>}
                      </div>
                      <span className="font-bold text-[#0F172A] dark:text-white tabular-nums shrink-0 ml-2">{p.total}</span>
                    </div>
                    <div className="h-1.5 bg-[#F1F5F9] dark:bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-[#DC2626]' : 'bg-[#1B4332]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-[#94A3B8] dark:text-white/30 border border-dashed border-[#CBD5E1] dark:border-white/15 rounded-lg">Aucune donnée</div>
          )}
        </ChartCard>
      </div>

      {/* ── Activité par heure de la journée ── */}
      {saisiesParHeure.length > 0 && (
        <ChartCard>
          <SectionTitle icon={Activity} title="Activité par heure" sub="Distribution des saisies sur 24h — heure de l'événement vs heure de saisie" />
          <div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={saisiesParHeure} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={gridColor} vertical={false} />
                <XAxis dataKey="heure" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} tickFormatter={(h) => `${h}h`} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} labelFormatter={(h) => `${h}h00`} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="infractions_evenement" name="Infractions (événement)" fill="#2563EB" radius={[3, 3, 0, 0]} />
                <Bar dataKey="accidents_evenement" name="Accidents (événement)" fill="#DC2626" radius={[3, 3, 0, 0]} />
                <Bar dataKey="infractions_saisies" name="Infractions (saisie)" fill="#93C5FD" radius={[3, 3, 0, 0]} />
                <Bar dataKey="accidents_saisis" name="Accidents (saisie)" fill="#FCA5A5" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}


    </div>
  );
}

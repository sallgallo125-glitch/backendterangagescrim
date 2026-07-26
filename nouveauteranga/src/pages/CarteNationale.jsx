import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap, GeoJSON } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import geoService from '../services/geoService';
import ErrorBoundary from '../components/ErrorBoundary';
import infractionService from '../services/infractionService';
import accidentService from '../services/accidentService';
import { immigrationService } from '../services/otherService';
import GeoFilterComponent from '../components/GeoFilterComponent';
import dashboardService from '../services/dashboardService';
import {
  MapPin, Activity, ClipboardList, Navigation, Search, Info,
  Layers, Users, Plane, ShieldCheck, AlertCircle, Maximize2, Minimize2, Map, Flame,
  Clock, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, WifiOff,
  Calendar, X, BarChart2,
} from 'lucide-react';
import HeatmapLayer from '../components/HeatmapLayer';
import SearchInput from '../components/ui/SearchInput';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SENEGAL_CENTER = [14.4974, -14.4524];

const isValidSenegalCoord = (lat, lng) =>
  lat >= 12 && lat <= 17 && lng >= -18 && lng <= -11;

const REGION_COORDS = {
  '1':  { center: [14.7167, -17.4677], zoom: 11, name: 'Dakar'         },
  '2':  { center: [14.6549, -16.2334], zoom: 10, name: 'Diourbel'      },
  '3':  { center: [14.3392, -16.4114], zoom: 10, name: 'Fatick'        },
  '4':  { center: [14.1060, -15.5508], zoom: 9,  name: 'Kaffrine'      },
  '5':  { center: [14.1520, -16.0726], zoom: 10, name: 'Kaolack'       },
  '6':  { center: [12.5559, -12.1743], zoom: 9,  name: 'Kédougou'      },
  '7':  { center: [12.8970, -14.9414], zoom: 9,  name: 'Kolda'         },
  '8':  { center: [15.6136, -16.2244], zoom: 9,  name: 'Louga'         },
  '9':  { center: [15.6559, -13.2512], zoom: 9,  name: 'Matam'         },
  '10': { center: [16.0183, -16.4897], zoom: 9,  name: 'Saint-Louis'   },
  '11': { center: [12.7080, -15.5568], zoom: 9,  name: 'Sédhiou'       },
  '12': { center: [13.7700, -13.6700], zoom: 9,  name: 'Tambacounda'   },
  '13': { center: [14.7912, -16.9248], zoom: 10, name: 'Thiès'         },
  '14': { center: [12.5833, -16.2719], zoom: 10, name: 'Ziguinchor'    },
};

// Polygones simplifiés des 14 régions du Sénégal (GeoJSON)
const SENEGAL_REGIONS_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    { type:'Feature', properties:{ id:'1',  name:'Dakar'         }, geometry:{ type:'Polygon', coordinates:[[[-17.53,14.58],[-17.17,14.58],[-17.17,14.85],[-17.53,14.85],[-17.53,14.58]]] } },
    { type:'Feature', properties:{ id:'2',  name:'Diourbel'      }, geometry:{ type:'Polygon', coordinates:[[[-16.65,14.42],[-15.85,14.42],[-15.85,14.95],[-16.65,14.95],[-16.65,14.42]]] } },
    { type:'Feature', properties:{ id:'3',  name:'Fatick'        }, geometry:{ type:'Polygon', coordinates:[[[-16.75,13.85],[-15.90,13.85],[-15.90,14.45],[-16.75,14.45],[-16.75,13.85]]] } },
    { type:'Feature', properties:{ id:'4',  name:'Kaffrine'      }, geometry:{ type:'Polygon', coordinates:[[[-15.90,13.55],[-14.70,13.55],[-14.70,14.45],[-15.90,14.45],[-15.90,13.55]]] } },
    { type:'Feature', properties:{ id:'5',  name:'Kaolack'       }, geometry:{ type:'Polygon', coordinates:[[[-16.40,13.75],[-15.55,13.75],[-15.55,14.45],[-16.40,14.45],[-16.40,13.75]]] } },
    { type:'Feature', properties:{ id:'6',  name:'Kédougou'      }, geometry:{ type:'Polygon', coordinates:[[[-13.10,12.20],[-11.40,12.20],[-11.40,13.10],[-13.10,13.10],[-13.10,12.20]]] } },
    { type:'Feature', properties:{ id:'7',  name:'Kolda'         }, geometry:{ type:'Polygon', coordinates:[[[-15.65,12.45],[-13.55,12.45],[-13.55,13.35],[-15.65,13.35],[-15.65,12.45]]] } },
    { type:'Feature', properties:{ id:'8',  name:'Louga'         }, geometry:{ type:'Polygon', coordinates:[[[-16.55,14.90],[-15.10,14.90],[-15.10,16.10],[-16.55,16.10],[-16.55,14.90]]] } },
    { type:'Feature', properties:{ id:'9',  name:'Matam'         }, geometry:{ type:'Polygon', coordinates:[[[-14.50,14.90],[-12.35,14.90],[-12.35,16.10],[-14.50,16.10],[-14.50,14.90]]] } },
    { type:'Feature', properties:{ id:'10', name:'Saint-Louis'   }, geometry:{ type:'Polygon', coordinates:[[[-16.80,15.50],[-15.10,15.50],[-15.10,16.70],[-16.80,16.70],[-16.80,15.50]]] } },
    { type:'Feature', properties:{ id:'11', name:'Sédhiou'       }, geometry:{ type:'Polygon', coordinates:[[[-15.95,12.40],[-14.85,12.40],[-14.85,13.25],[-15.95,13.25],[-15.95,12.40]]] } },
    { type:'Feature', properties:{ id:'12', name:'Tambacounda'   }, geometry:{ type:'Polygon', coordinates:[[[-14.75,12.40],[-11.40,12.40],[-11.40,14.10],[-14.75,14.10],[-14.75,12.40]]] } },
    { type:'Feature', properties:{ id:'13', name:'Thiès'         }, geometry:{ type:'Polygon', coordinates:[[[-17.20,14.45],[-16.60,14.45],[-16.60,14.95],[-17.20,14.95],[-17.20,14.45]]] } },
    { type:'Feature', properties:{ id:'14', name:'Ziguinchor'    }, geometry:{ type:'Polygon', coordinates:[[[-16.75,12.25],[-15.60,12.25],[-15.60,13.05],[-16.75,13.05],[-16.75,12.25]]] } },
  ],
};

const TILE_LAYERS = {
  voyager:   { label:'Standard',      preview:'🗺️', url:'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',                                               attribution:'© CartoDB' },
  light:     { label:'Clair',         preview:'☀️', url:'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',                                                         attribution:'© CartoDB' },
  dark:      { label:'Sombre',        preview:'🌙', url:'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',                                                           attribution:'© CartoDB' },
  osm:       { label:'OpenStreetMap', preview:'🛣️', url:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',                                                                      attribution:'© OpenStreetMap contributors' },
  topo:      { label:'Topographique', preview:'⛰️', url:'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                                                                        attribution:'© OpenTopoMap' },
  satellite: { label:'Satellite',     preview:'🛰️', url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',                            attribution:'© Esri' },
};

const LAYER_CONFIG = {
  infractions: { label:'Infractions',      color:'#2563EB', fill:'#3B82F6', icon:AlertCircle },
  accidents:   { label:'Accidents',        color:'#DC2626', fill:'#EF4444', icon:Activity    },
  immigration: { label:'Immigration',      color:'#16A34A', fill:'#22C55E', icon:Plane       },
  personnel:   { label:'Commissariats',    color:'#D97706', fill:'#F59E0B', icon:Users       },
  heatmap:     { label:'Heatmap',          color:'#DC2626', fill:'#EF4444', icon:Flame       },
  choroplethe: { label:'Analyse Régionale',color:'#16A34A', fill:'#22C55E', icon:Map         },
};

// ─── Helpers ──────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

function choroplethColor(count) {
  if (count === 0)  return '#F0FDF4';
  if (count <= 5)   return '#86EFAC';
  if (count <= 15)  return '#FDE68A';
  if (count <= 30)  return '#FB923C';
  return '#EF4444';
}

// ─── Sous-composants purs ─────────────────────────────────────────────────

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    map.flyTo(center, zoom || 10, { animate: true, duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

// Légende flottante bas-gauche
const MapLegend = memo(function MapLegend({ layers }) {
  const active = Object.entries(LAYER_CONFIG).filter(([k]) => layers[k]);
  if (!active.length) return null;
  return (
    <div className="absolute bottom-6 left-3 z-[1000] bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-sm border border-[#CBD5E1] dark:border-white/10 rounded-xl px-3 py-2.5 shadow-lg pointer-events-none">
      <p className="text-[9px] font-bold text-[#94A3B8] dark:text-white/40 uppercase tracking-wider mb-1.5">Légende</p>
      <div className="space-y-1">
        {active.map(([k, cfg]) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
            <span className="text-[10px] font-medium text-[#475569] dark:text-white/60">{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

// Indicateurs rapides flottants haut-gauche
const MapQuickStats = memo(function MapQuickStats({ inf, acc, svcs, imm, layers }) {
  return (
    <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5 pointer-events-none">
      {layers.infractions && (
        <div className="flex items-center gap-1.5 bg-[#EFF6FF]/95 backdrop-blur-sm border border-[#BFDBFE] rounded-lg px-2.5 py-1.5 shadow-sm">
          <AlertCircle className="w-3 h-3 text-[#2563EB]" />
          <span className="text-[10px] font-bold text-[#2563EB]">{inf}</span>
          <span className="text-[9px] text-[#2563EB]">infractions</span>
        </div>
      )}
      {layers.accidents && (
        <div className="flex items-center gap-1.5 bg-[#FEF2F2]/95 backdrop-blur-sm border border-[#FECACA] rounded-lg px-2.5 py-1.5 shadow-sm">
          <Activity className="w-3 h-3 text-[#DC2626]" />
          <span className="text-[10px] font-bold text-[#DC2626]">{acc}</span>
          <span className="text-[9px] text-[#DC2626]">accidents</span>
        </div>
      )}
      {layers.personnel && (
        <div className="flex items-center gap-1.5 bg-[#FEF3C7]/95 backdrop-blur-sm border border-[#FDE68A] rounded-lg px-2.5 py-1.5 shadow-sm">
          <Users className="w-3 h-3 text-[#D97706]" />
          <span className="text-[10px] font-bold text-[#D97706]">{svcs}</span>
          <span className="text-[9px] text-[#D97706]">commissariats</span>
        </div>
      )}
      {layers.immigration && (
        <div className="flex items-center gap-1.5 bg-[#F0FDF4]/95 backdrop-blur-sm border border-[#BBF7D0] rounded-lg px-2.5 py-1.5 shadow-sm">
          <Plane className="w-3 h-3 text-[#16A34A]" />
          <span className="text-[10px] font-bold text-[#16A34A]">{imm}</span>
          <span className="text-[9px] text-[#16A34A]">immigration</span>
        </div>
      )}
    </div>
  );
});

// Sélecteur fond de carte
function TileSelector({ current, onChange }) {
  return (
    <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-4">
      <p className="text-sm font-semibold text-[#0F172A] dark:text-white mb-2.5 flex items-center gap-2">
        <Map className="w-4 h-4 text-[#2563EB]" /> Fond de carte
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {Object.entries(TILE_LAYERS).map(([key, tile]) => (
          <button key={key} onClick={() => onChange(key)}
            className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg border text-center transition-all ${
              current === key
                ? 'border-[#2563EB] bg-[#EFF6FF] dark:bg-[#1B4332]/15 text-[#2563EB]'
                : 'border-[#CBD5E1] dark:border-white/10 text-[#64748B] dark:text-white/50 hover:border-[#2563EB]/50 hover:text-[#2563EB]'
            }`}>
            <span className="text-base leading-none">{tile.preview}</span>
            <span className="text-[10px] font-medium leading-tight">{tile.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Toggle couches
function LayerToggle({ layers, onChange }) {
  return (
    <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-4">
      <p className="text-sm font-semibold text-[#0F172A] dark:text-white mb-2.5 flex items-center gap-2">
        <Layers className="w-4 h-4 text-[#2563EB]" /> Couches actives
      </p>
      <div className="space-y-2">
        {Object.entries(LAYER_CONFIG).map(([key, cfg]) => {
          return (
            <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
              <div className="relative">
                <input type="checkbox" checked={layers[key]} onChange={() => onChange(key)} className="sr-only" />
                <div className={`w-9 h-5 rounded-full transition-colors ${layers[key] ? 'bg-[#1B4332]' : 'bg-[#CBD5E1] dark:bg-white/10'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${layers[key] ? 'translate-x-4' : ''}`} />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                <span className="text-xs font-medium text-[#475569] dark:text-white/60">{cfg.label}</span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// Filtre temporel avancé
function TemporalFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const presets = [
    { key: 'all',   label: 'Toutes les périodes' },
    { key: 'today', label: "Aujourd'hui" },
    { key: 'week',  label: 'Cette semaine' },
    { key: 'month', label: 'Ce mois' },
    { key: 'year',  label: 'Cette année' },
    { key: 'custom',label: 'Personnalisé' },
  ];
  const currentLabel = presets.find(p => p.key === value.preset)?.label || 'Toutes les périodes';

  return (
    <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between"
      >
        <p className="text-sm font-semibold text-[#0F172A] dark:text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#2563EB]" /> Période
        </p>
        <div className="flex items-center gap-1.5">
          {value.preset !== 'all' && (
            <span className="text-[10px] bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] rounded-full px-2 py-0.5 font-semibold">{currentLabel}</span>
          )}
          {open ? <ChevronUp className="w-3.5 h-3.5 text-[#94A3B8]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
            <div className="mt-2.5 space-y-1">
              {presets.map(p => (
                <button
                  key={p.key}
                  onClick={() => { onChange({ ...value, preset: p.key, dateFrom: '', dateTo: '' }); if (p.key !== 'custom') setOpen(false); }}
                  className={`w-full text-left text-xs px-3 py-1.5 rounded-lg transition-colors ${value.preset === p.key ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold' : 'text-[#475569] dark:text-white/60 hover:bg-[#F8FAFC] dark:hover:bg-white/5'}`}
                >
                  {p.label}
                </button>
              ))}
              {value.preset === 'custom' && (
                <div className="pt-1.5 space-y-2">
                  <div>
                    <label className="block text-[10px] text-[#94A3B8] mb-1">Date début</label>
                    <input type="date" value={value.dateFrom} onChange={e => onChange({ ...value, dateFrom: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 border border-[#CBD5E1] dark:border-white/10 rounded-lg bg-[#F8FAFC] dark:bg-white/5 text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#94A3B8] mb-1">Date fin</label>
                    <input type="date" value={value.dateTo} onChange={e => onChange({ ...value, dateTo: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 border border-[#CBD5E1] dark:border-white/10 rounded-lg bg-[#F8FAFC] dark:bg-white/5 text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Panneau d'analyse intelligente
const AnalysisPanel = memo(function AnalysisPanel({ infractions, accidents }) {
  const analysis = useMemo(() => {
    // Région la plus active (infractions)
    const regionCount = {};
    infractions.forEach(i => {
      const r = i.commune?.departement?.region?.nom || i.region?.nom || 'Inconnue';
      regionCount[r] = (regionCount[r] || 0) + 1;
    });
    const topRegionInf = Object.entries(regionCount).sort((a,b) => b[1]-a[1])[0];

    // Commune la plus touchée
    const communeCount = {};
    infractions.forEach(i => {
      const c = i.commune?.nom || 'Inconnue';
      communeCount[c] = (communeCount[c] || 0) + 1;
    });
    const topCommune = Object.entries(communeCount).sort((a,b) => b[1]-a[1])[0];

    // Type d'infraction dominant
    const typeCount = {};
    infractions.forEach(i => {
      const t = i.type_infraction?.nom || 'Autre';
      typeCount[t] = (typeCount[t] || 0) + 1;
    });
    const topType = Object.entries(typeCount).sort((a,b) => b[1]-a[1])[0];

    // Région avec le plus d'accidents
    const accRegion = {};
    accidents.forEach(a => {
      const r = a.commune?.departement?.region?.nom || a.region?.nom || 'Inconnue';
      accRegion[r] = (accRegion[r] || 0) + 1;
    });
    const topRegionAcc = Object.entries(accRegion).sort((a,b) => b[1]-a[1])[0];

    // Tendance : ratio mortels/total
    const mortel = accidents.filter(a => a.type === 'mortel').length;
    const total = accidents.length;
    const ratio = total > 0 ? (mortel / total) * 100 : 0;

    return { topRegionInf, topCommune, topType, topRegionAcc, ratio };
  }, [infractions, accidents]);

  const { topRegionInf, topCommune, topType, topRegionAcc, ratio } = analysis;

  return (
    <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-4">
      <p className="text-sm font-semibold text-[#0F172A] dark:text-white mb-3 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-[#2563EB]" /> Analyse Automatique
      </p>
      <div className="space-y-2 text-xs">
        {topRegionInf && (
          <div className="flex items-start justify-between gap-2 p-2 bg-[#FFF7ED] border border-[#FED7AA] rounded-lg">
            <span className="text-[#92400E] font-medium leading-snug">Région + active</span>
            <span className="font-bold text-[#C2410C] text-right">{topRegionInf[0]} <span className="text-[10px]">({topRegionInf[1]})</span></span>
          </div>
        )}
        {topCommune && (
          <div className="flex items-start justify-between gap-2 p-2 bg-[#FEF2F2] border border-[#FECACA] rounded-lg">
            <span className="text-[#991B1B] font-medium leading-snug">Commune + touchée</span>
            <span className="font-bold text-[#DC2626] text-right">{topCommune[0]} <span className="text-[10px]">({topCommune[1]})</span></span>
          </div>
        )}
        {topType && (
          <div className="flex items-start justify-between gap-2 p-2 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg">
            <span className="text-[#92400E] font-medium leading-snug">Infraction dominante</span>
            <span className="font-bold text-[#B45309] text-right truncate max-w-[100px]">{topType[0]}</span>
          </div>
        )}
        {topRegionAcc && (
          <div className="flex items-start justify-between gap-2 p-2 bg-[#FEF2F2] border border-[#FECACA] rounded-lg">
            <span className="text-[#991B1B] font-medium leading-snug">+ d'accidents</span>
            <span className="font-bold text-[#DC2626] text-right">{topRegionAcc[0]}</span>
          </div>
        )}
        <div className={`flex items-center justify-between gap-2 p-2 rounded-lg border ${
          ratio > 20 ? 'bg-[#FEF2F2] border-[#FECACA]' : ratio > 10 ? 'bg-[#FFFBEB] border-[#FDE68A]' : 'bg-[#F0FDF4] border-[#BBF7D0]'
        }`}>
          <span className={`font-medium ${ratio > 20 ? 'text-[#991B1B]' : ratio > 10 ? 'text-[#92400E]' : 'text-[#166534]'}`}>Taux mortalité</span>
          <div className="flex items-center gap-1">
            {ratio > 15 ? <TrendingUp className="w-3 h-3 text-[#DC2626]" /> : ratio > 5 ? <Minus className="w-3 h-3 text-[#D97706]" /> : <TrendingDown className="w-3 h-3 text-[#16A34A]" />}
            <span className={`font-bold text-xs ${ratio > 20 ? 'text-[#DC2626]' : ratio > 10 ? 'text-[#D97706]' : 'text-[#16A34A]'}`}>{ratio.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// Couche choroplèthe
function ChoroplethLayer({ infractions, accidents, immigrations, visible }) {
  const regionData = useMemo(() => {
    const counts = {};
    SENEGAL_REGIONS_GEOJSON.features.forEach(f => {
      counts[f.properties.id] = { infractions: 0, accidents: 0, immigration: 0 };
    });
    infractions.forEach(i => {
      const id = String(i.commune?.departement?.region_id || i.region_id || '');
      if (counts[id]) counts[id].infractions++;
    });
    accidents.forEach(a => {
      const id = String(a.commune?.departement?.region_id || a.region_id || '');
      if (counts[id]) counts[id].accidents++;
    });
    immigrations.forEach(im => {
      const id = String(im.region_id || '');
      if (counts[id]) counts[id].immigration++;
    });
    return counts;
  }, [infractions, accidents, immigrations]);

  const style = useCallback((feature) => {
    const id = feature.properties.id;
    const total = (regionData[id]?.infractions || 0) + (regionData[id]?.accidents || 0);
    return {
      fillColor: choroplethColor(total),
      weight: 1.5,
      opacity: 0.8,
      color: '#64748B',
      fillOpacity: 0.45,
    };
  }, [regionData]);

  const onEachFeature = useCallback((feature, layer) => {
    const id = feature.properties.id;
    const d = regionData[id] || {};
    const total = (d.infractions || 0) + (d.accidents || 0);
    const colorLabel = total === 0 ? 'Aucun incident' : total <= 5 ? 'Faible' : total <= 15 ? 'Moyen' : total <= 30 ? 'Élevé' : 'Critique';
    layer.bindPopup(`
      <div style="min-width:160px;font-family:sans-serif;font-size:12px">
        <p style="font-weight:700;font-size:13px;margin:0 0 6px">${feature.properties.name}</p>
        <div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="color:#64748B">Infractions</span><b style="color:#D97706">${d.infractions || 0}</b></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="color:#64748B">Accidents</span><b style="color:#DC2626">${d.accidents || 0}</b></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:#64748B">Immigration</span><b style="color:#0891B2">${d.immigration || 0}</b></div>
        <div style="border-top:1px solid #CBD5E1;padding-top:4px;color:#64748B;font-size:10px">Niveau : <b>${colorLabel}</b></div>
      </div>
    `);
  }, [regionData]);

  if (!visible) return null;
  return <GeoJSON key={JSON.stringify(regionData)} data={SENEGAL_REGIONS_GEOJSON} style={style} onEachFeature={onEachFeature} />;
}

// États de chargement
function LoadingOverlay() {
  return <div className="absolute inset-0 z-50 shimmer rounded-lg" />;
}

function ErrorOverlay({ message, onRetry }) {
  return (
    <div className="absolute inset-0 z-50 bg-white/90 dark:bg-[#343a40]/90 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center max-w-xs px-4">
        <div className="w-12 h-12 bg-[#FEF2F2] border border-[#FECACA] rounded-full flex items-center justify-center">
          <WifiOff className="w-6 h-6 text-[#DC2626]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0F172A] dark:text-white">Erreur de chargement</p>
          <p className="text-xs text-[#94A3B8] dark:text-white/40 mt-1">{message || 'Impossible de récupérer les données cartographiques.'}</p>
        </div>
        <button onClick={onRetry} className="px-4 py-2 bg-[#1B4332] text-white text-xs font-semibold rounded-lg hover:bg-[#143728] transition-colors">
          Réessayer
        </button>
      </div>
    </div>
  );
}

function EmptyOverlay() {
  return (
    <div className="absolute inset-x-0 top-3 z-[400] flex justify-center pointer-events-none">
      <div className="flex items-center gap-2 px-4 py-2 bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] rounded-lg text-xs font-medium shadow-sm">
        <span>⚠</span>
        Aucun point géolocalisé pour ce filtre — vérifiez les coordonnées GPS des enregistrements.
      </div>
    </div>
  );
}

// Horloge temps réel pour plein écran
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="text-white/70 text-xs font-mono flex items-center gap-1">
      <Clock className="w-3 h-3" />
      {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

// Utilitaire filtrage temporel
function applyTemporalFilter(items, dateField, temporal) {
  if (temporal.preset === 'all') return items;
  const now = new Date();
  let from, to;
  if (temporal.preset === 'today') {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    to = new Date(from.getTime() + 86400000);
  } else if (temporal.preset === 'week') {
    const day = now.getDay() || 7;
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
    to = new Date(from.getTime() + 7 * 86400000);
  } else if (temporal.preset === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else if (temporal.preset === 'year') {
    from = new Date(now.getFullYear(), 0, 1);
    to = new Date(now.getFullYear() + 1, 0, 1);
  } else if (temporal.preset === 'custom') {
    from = temporal.dateFrom ? new Date(temporal.dateFrom) : null;
    to = temporal.dateTo ? new Date(new Date(temporal.dateTo).getTime() + 86400000) : null;
  }
  return items.filter(item => {
    const d = new Date(item[dateField]);
    if (from && d < from) return false;
    if (to && d >= to) return false;
    return true;
  });
}

// ─── Composant principal ──────────────────────────────────────────────────
export default function CarteNationale() {
  const [infractions,  setInfractions]  = useState([]);
  const [accidents,    setAccidents]    = useState([]);
  const [immigrations, setImmigrations] = useState([]);
  const [services,     setServices]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [filters,      setFilters]      = useState({});
  const [mapCenter,    setMapCenter]    = useState(SENEGAL_CENTER);
  const [mapZoom,      setMapZoom]      = useState(7);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [regionStats,  setRegionStats]  = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [temporal,     setTemporal]     = useState({ preset: 'all', dateFrom: '', dateTo: '' });
  const [layers, setLayers] = useState({
    infractions: true,
    accidents:   true,
    immigration: false,
    personnel:   false,
    heatmap:     false,
    choroplethe: false,
  });
  const [tileKey,       setTileKey]       = useState('voyager');
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const fetchCount = useRef(0);

  // Fermer plein écran avec Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setMapFullscreen(false); };
    if (mapFullscreen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mapFullscreen]);

  const fetchData = useCallback(async () => {
    const id = ++fetchCount.current;
    setLoading(true);
    setError(null);
    try {
      const params = { per_page: 500, ...filters };
      const [resInf, resAcc, resImm, resServ] = await Promise.all([
        infractionService.getAll(params),
        accidentService.getAll(params),
        immigrationService.getAll({ per_page: 300, ...filters }),
        geoService.getAllServices(),
      ]);
      if (id !== fetchCount.current) return;

      const fmtGeo = (data, type) =>
        (data?.data?.data || data?.data || [])
          .map(item => {
            const lat = Number(item.latitude);
            const lng = Number(item.longitude);
            if (!isValidSenegalCoord(lat, lng)) return null;
            return { ...item, _type: type, lat, lng };
          })
          .filter(Boolean);

      setInfractions(fmtGeo(resInf, 'infraction'));
      setAccidents(fmtGeo(resAcc, 'accident'));

      const imm = (resImm?.data?.data || resImm?.data || []).filter(i => {
        const lat = Number(i.zone_depart_lat);
        const lng = Number(i.zone_depart_lng);
        return isValidSenegalCoord(lat, lng);
      }).map(i => ({
        ...i, _type: 'immigration',
        lat: Number(i.zone_depart_lat),
        lng: Number(i.zone_depart_lng),
        hasArrival: isValidSenegalCoord(Number(i.zone_arrivee_lat), Number(i.zone_arrivee_lng)),
        arrLat: Number(i.zone_arrivee_lat),
        arrLng: Number(i.zone_arrivee_lng),
      }));
      setImmigrations(imm);
      setServices(resServ?.data?.data || resServ?.data || []);
    } catch (e) {
      if (id === fetchCount.current) setError(e?.message || 'Erreur réseau');
    } finally {
      if (id === fetchCount.current) setLoading(false);
    }
  }, [filters]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { fetchData(); }, [fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!filters.region_id) { setRegionStats(null); return; }
    const loadStats = async () => {
      setLoadingStats(true);
      try {
        const res = await dashboardService.getStats({ ...filters });
        setRegionStats(res.data.data || res.data);
      } catch { setRegionStats(null); }
      finally { setLoadingStats(false); }
    };
    loadStats();
  }, [filters]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleLayer = useCallback((key) => setLayers(p => ({ ...p, [key]: !p[key] })), []);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    if (newFilters.commune_id && newFilters.region_id) {
      const coord = REGION_COORDS[String(newFilters.region_id)];
      if (coord) { setMapCenter(coord.center); setMapZoom(12); }
    } else if (newFilters.departement_id && newFilters.region_id) {
      const coord = REGION_COORDS[String(newFilters.region_id)];
      if (coord) { setMapCenter(coord.center); setMapZoom(11); }
    } else if (newFilters.region_id) {
      const coord = REGION_COORDS[String(newFilters.region_id)];
      if (coord) { setMapCenter(coord.center); setMapZoom(coord.zoom); }
    } else {
      setMapCenter(SENEGAL_CENTER); setMapZoom(7);
    }
    setSearchQuery('');
  }, []);

  // Filtrage temporel + recherche côté client
  const temporalInfractions = useMemo(() => applyTemporalFilter(infractions, 'date', temporal), [infractions, temporal]);
  const temporalAccidents   = useMemo(() => applyTemporalFilter(accidents,   'date', temporal), [accidents,   temporal]);

  const filteredInfractions = useMemo(() => {
    if (!searchQuery.trim()) return temporalInfractions;
    const q = searchQuery.toLowerCase();
    return temporalInfractions.filter(i =>
      (i.lieu || '').toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q) ||
      (i.type_infraction?.nom || '').toLowerCase().includes(q) ||
      (i.commune?.nom || '').toLowerCase().includes(q) ||
      (i.commune?.departement?.region?.nom || '').toLowerCase().includes(q) ||
      (i.commune?.departement?.nom || '').toLowerCase().includes(q) ||
      (i.issue || '').toLowerCase().includes(q) ||
      String(i.id).includes(q)
    );
  }, [temporalInfractions, searchQuery]);

  const filteredAccidents = useMemo(() => {
    if (!searchQuery.trim()) return temporalAccidents;
    const q = searchQuery.toLowerCase();
    return temporalAccidents.filter(a =>
      (a.lieu || '').toLowerCase().includes(q) ||
      (a.type || '').toLowerCase().includes(q) ||
      (a.commune?.nom || '').toLowerCase().includes(q) ||
      (a.commune?.departement?.region?.nom || '').toLowerCase().includes(q) ||
      (a.cause_probable || '').toLowerCase().includes(q) ||
      String(a.id).includes(q)
    );
  }, [temporalAccidents, searchQuery]);

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const q = searchQuery.toLowerCase();
    return services.filter(s =>
      (s.nom || '').toLowerCase().includes(q) ||
      (s.commune?.nom || '').toLowerCase().includes(q) ||
      (s.commune?.departement?.region?.nom || '').toLowerCase().includes(q) ||
      (s.type || '').toLowerCase().includes(q)
    );
  }, [services, searchQuery]);

  const heatmapPoints = useMemo(() => {
    const pts = [];
    filteredInfractions.forEach(i => pts.push([i.lat, i.lng, 0.6]));
    filteredAccidents.forEach(a => {
      const intensity = a.type === 'mortel' ? 1.0 : a.type === 'corporel' ? 0.7 : 0.4;
      pts.push([a.lat, a.lng, intensity]);
    });
    return pts;
  }, [filteredInfractions, filteredAccidents]);

  const validServices = useMemo(() =>
    filteredServices.filter(svc => isValidSenegalCoord(Number(svc.latitude), Number(svc.longitude))),
    [filteredServices]
  );

  const totalInfractions  = filteredInfractions.length;
  const totalAccidents    = filteredAccidents.length;
  const totalImmigration  = immigrations.length;
  const totalCommissariats = validServices.length;
  const accidentsMortel   = filteredAccidents.filter(a => a.type === 'mortel').length;
  const accidentsCorporel = filteredAccidents.filter(a => a.type === 'corporel').length;
  const accidentsMateriel = filteredAccidents.filter(a => a.type === 'matériel').length;
  const infConstatees     = filteredInfractions.filter(i => i.issue === 'Constatée').length;
  const infDeferees       = filteredInfractions.filter(i => i.issue === 'Déférée').length;
  const activeLayersCount = Object.values(layers).filter(Boolean).length;
  const totalMarkers      = totalInfractions + totalAccidents + (layers.immigration ? totalImmigration : 0) + (layers.personnel ? totalCommissariats : 0);
  const noData            = !loading && !error && totalInfractions === 0 && totalAccidents === 0 && totalImmigration === 0;
  const selectedRegionName = filters.region_id ? REGION_COORDS[String(filters.region_id)]?.name : null;

  // ── Rendu couches carte (réutilisé normal + fullscreen) ──
  const renderLayers = (prefix = '') => (
    <>
      {layers.infractions && (
        <MarkerClusterGroup chunkedLoading>
          {filteredInfractions.map((item, idx) => (
            <CircleMarker key={`${prefix}inf-${idx}`} center={[item.lat, item.lng]} radius={7}
              fillOpacity={0.85} color="#2563EB" fillColor="#3B82F6" weight={1.5}>
              <Popup>
                <div className="p-2 w-60 space-y-1.5">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB]">Infraction #{item.id}</span>
                  <p className="font-bold text-xs text-[#0F172A]">{item.type_infraction?.nom || 'Infraction'}</p>
                  {item.description && <p className="text-[10px] text-[#64748B] italic line-clamp-2">{item.description}</p>}
                  <p className="text-[11px] text-[#64748B] flex items-start gap-1"><MapPin className="w-3 h-3 shrink-0 mt-0.5" />{item.lieu || 'Lieu non spécifié'}</p>
                  <div className="grid grid-cols-2 gap-1 text-[10px] border-t border-[#CBD5E1] pt-1.5">
                    <div><span className="text-[#94A3B8]">Commune</span><p className="font-semibold text-[#0F172A]">{item.commune?.nom || '—'}</p></div>
                    <div><span className="text-[#94A3B8]">Région</span><p className="font-semibold text-[#0F172A]">{item.commune?.departement?.region?.nom || '—'}</p></div>
                    <div><span className="text-[#94A3B8]">Date</span><p className="font-semibold text-[#0F172A]">{fmtDate(item.date)}</p></div>
                    <div><span className="text-[#94A3B8]">Issue</span><p className="font-semibold text-[#0F172A]">{item.issue || '—'}</p></div>
                    {item.workflow_status && <div className="col-span-2"><span className="text-[#94A3B8]">Statut</span><p className="font-semibold text-[#0F172A]">{item.workflow_status}</p></div>}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MarkerClusterGroup>
      )}

      {layers.accidents && (
        <MarkerClusterGroup chunkedLoading>
          {filteredAccidents.map((item, idx) => (
            <CircleMarker key={`${prefix}acc-${idx}`} center={[item.lat, item.lng]} radius={7}
              fillOpacity={0.85} color="#DC2626" fillColor="#EF4444" weight={1.5}>
              <Popup>
                <div className="p-2 w-60 space-y-1.5">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF2F2] text-[#DC2626]">Accident #{item.id}</span>
                  <p className="font-bold text-xs text-[#0F172A] capitalize">Accident {item.type}</p>
                  <p className="text-[11px] text-[#64748B] flex items-start gap-1"><MapPin className="w-3 h-3 shrink-0 mt-0.5" />{item.lieu || 'Lieu non spécifié'}</p>
                  <div className="grid grid-cols-2 gap-1 text-[10px] border-t border-[#CBD5E1] pt-1.5">
                    <div><span className="text-[#94A3B8]">Commune</span><p className="font-semibold text-[#0F172A]">{item.commune?.nom || '—'}</p></div>
                    <div><span className="text-[#94A3B8]">Région</span><p className="font-semibold text-[#0F172A]">{item.commune?.departement?.region?.nom || '—'}</p></div>
                    <div><span className="text-[#94A3B8]">Date</span><p className="font-semibold text-[#0F172A]">{fmtDate(item.date)}</p></div>
                    <div><span className="text-[#94A3B8]">Victimes</span><p className="font-semibold text-[#DC2626]">{item.victimes?.length || 0}</p></div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MarkerClusterGroup>
      )}

      {layers.immigration && immigrations.map((item, idx) => (
        <div key={`${prefix}imm-${idx}`}>
          <CircleMarker center={[item.lat, item.lng]} radius={6} fillOpacity={0.85} color="#16A34A" fillColor="#22C55E" weight={1.5}>
            <Popup>
              <div className="p-2 w-56 space-y-1.5">
                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0FDF4] text-[#16A34A]">Immigration #{item.id}</span>
                <p className="text-xs font-bold text-[#0F172A]">
                  {item.nombre_total || (item.nombre_hommes||0)+(item.nombre_femmes||0)+(item.nombre_enfants||0)} personnes
                </p>
                <p className="text-[11px] text-[#64748B]">Départ : {item.zone_depart || 'N/A'}</p>
                <p className="text-[11px] text-[#64748B]">Arrivée : {item.zone_arrivee_prevue || 'N/A'}</p>
                <div className="text-[10px] text-[#94A3B8] border-t border-[#CBD5E1] pt-1">
                  H: {item.nombre_hommes||0} · F: {item.nombre_femmes||0} · Enf: {item.nombre_enfants||0}
                </div>
              </div>
            </Popup>
          </CircleMarker>
          {item.hasArrival && (
            <Polyline positions={[[item.lat,item.lng],[item.arrLat,item.arrLng]]} color="#16A34A" weight={1.5} dashArray="5,6" opacity={0.6} />
          )}
        </div>
      ))}

      {layers.personnel && (
        <MarkerClusterGroup chunkedLoading>
          {validServices.map((svc, idx) => (
            <CircleMarker key={`${prefix}svc-${idx}`} center={[Number(svc.latitude), Number(svc.longitude)]}
              radius={8} fillOpacity={0.9} color="#D97706" fillColor="#F59E0B" weight={2}>
              <Popup>
                <div className="p-2 w-60 space-y-1.5">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#D97706]">Commissariat #{svc.id}</span>
                  <p className="font-bold text-xs text-[#0F172A]">{svc.nom}</p>
                  <p className="text-[11px] text-[#64748B] flex items-start gap-1"><MapPin className="w-3 h-3 shrink-0 mt-0.5" />{svc.commune?.nom || 'N/A'}</p>
                  <div className="grid grid-cols-2 gap-1 text-[10px] border-t border-[#CBD5E1] pt-1.5">
                    <div><span className="text-[#94A3B8]">Région</span><p className="font-semibold text-[#0F172A]">{svc.commune?.departement?.region?.nom || '—'}</p></div>
                    <div><span className="text-[#94A3B8]">Type</span><p className="font-semibold text-[#0F172A]">{svc.type || '—'}</p></div>
                    {svc.effectif && <div><span className="text-[#94A3B8]">Effectif</span><p className="font-semibold text-[#D97706]">{svc.effectif}</p></div>}
                    {svc.responsable && <div><span className="text-[#94A3B8]">Responsable</span><p className="font-semibold text-[#0F172A] truncate">{svc.responsable}</p></div>}
                    {svc.telephone && <div className="col-span-2"><span className="text-[#94A3B8]">Tél.</span><p className="font-semibold text-[#0F172A]">{svc.telephone}</p></div>}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MarkerClusterGroup>
      )}

      {layers.heatmap && heatmapPoints.length > 0 && <HeatmapLayer points={heatmapPoints} />}
    </>
  );

  return (
    <div className="space-y-4 h-[calc(100vh-80px)] flex flex-col max-w-[1400px]">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-[#2563EB]" />
            Carte Interactive Nationale
          </h1>
          <p className="text-sm text-[#64748B] dark:text-white/50 mt-0.5">Surveillance territoriale géolocalisée multi-couches</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748B] dark:text-white/50 font-medium">Territoire :</span>
          <GeoFilterComponent onChange={handleFilterChange} />
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* ── Carte principale ── */}
        <div className="flex-1 bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden relative z-0 min-h-[300px]">
          {loading && <LoadingOverlay />}
          {!loading && error && <ErrorOverlay message={error} onRetry={fetchData} />}
          {noData && <EmptyOverlay />}

          <MapContainer center={mapCenter} zoom={mapZoom} className="w-full h-full" zoomControl>
            <TileLayer url={TILE_LAYERS[tileKey].url} attribution={TILE_LAYERS[tileKey].attribution} />
            <MapController center={mapCenter} zoom={mapZoom} />
            <ErrorBoundary>
              <ChoroplethLayer infractions={infractions} accidents={accidents} immigrations={immigrations} visible={layers.choroplethe} />
            </ErrorBoundary>
            {renderLayers()}
            <MapLegend layers={layers} />
            <MapQuickStats inf={totalInfractions} acc={totalAccidents} svcs={totalCommissariats} imm={totalImmigration} layers={layers} />
          </MapContainer>

          {/* Bouton plein écran */}
          <button
            onClick={() => setMapFullscreen(true)}
            title="Afficher en plein écran"
            className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/20 text-[#64748B] dark:text-white/70 hover:text-[#2563EB] hover:border-[#2563EB] text-xs font-medium shadow-md transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Plein écran
          </button>
        </div>

        {/* ── Panneau latéral ── */}
        <div className="w-full lg:w-72 flex flex-col gap-3 overflow-y-auto">

          {/* Recherche étendue */}
          <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-4">
            <p className="text-sm font-semibold text-[#0F172A] dark:text-white mb-2.5 flex items-center gap-2">
              <Search className="w-4 h-4 text-[#2563EB]" /> Recherche sur la carte
            </p>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Lieu, région, commune, type…"
            />
            {searchQuery && (
              <p className="text-[10px] text-[#94A3B8] dark:text-white/30 mt-1.5 text-right">
                {filteredInfractions.length + filteredAccidents.length + filteredServices.length} résultat(s)
              </p>
            )}
          </div>

          {/* Filtre temporel */}
          <TemporalFilter value={temporal} onChange={setTemporal} />

          {/* Fond de carte */}
          <TileSelector current={tileKey} onChange={setTileKey} />

          {/* Couches */}
          <LayerToggle layers={layers} onChange={toggleLayer} />

          {/* Analyse intelligente */}
          {(infractions.length > 0 || accidents.length > 0) && (
            <AnalysisPanel infractions={filteredInfractions} accidents={filteredAccidents} services={validServices} />
          )}

          {/* Stats région sélectionnée */}
          {filters.region_id && (
            <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-4">
              <p className="text-sm font-semibold text-[#0F172A] dark:text-white mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                {selectedRegionName ? `${selectedRegionName}` : 'Stats de la zone'}
              </p>
              {loadingStats ? (
                <div className="space-y-2 animate-pulse">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-3 bg-[#F1F5F9] dark:bg-white/5 rounded" />)}
                </div>
              ) : regionStats ? (
                <div className="space-y-2 text-xs">
                  {[
                    { label:'Infractions', val:regionStats.total_infractions||0, color:'text-[#D97706]' },
                    { label:'Accidents',   val:regionStats.total_accidents||0,   color:'text-[#DC2626]' },
                    { label:'Effectifs',   val:regionStats.total_personnel||0,   color:'text-[#2563EB]' },
                    { label:'Amendes CFA', val:new Intl.NumberFormat('fr-SN').format(regionStats.total_amendes||0), color:'text-[#16A34A]' },
                    { label:'Immigration', val:regionStats.total_immigration||0, color:'text-[#16A34A]' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-[#64748B] dark:text-white/50">{label}</span>
                      <span className={`font-bold ${color}`}>{val}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#94A3B8]">Données non disponibles</p>
              )}
            </div>
          )}

          {/* Stats globales */}
          <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-4 flex-1 space-y-4">
            <div>
              <p className="text-sm font-semibold text-[#0F172A] dark:text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-[#2563EB]" /> Statistiques du secteur
              </p>
              <p className="text-[10px] text-[#94A3B8] dark:text-white/30 mt-0.5">Incidents chargés</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-center">
                <p className="text-[10px] uppercase font-bold text-[#2563EB]">Infractions</p>
                <p className="text-2xl font-black text-[#2563EB] mt-0.5">{totalInfractions}</p>
              </div>
              <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-center">
                <p className="text-[10px] uppercase font-bold text-[#DC2626]">Accidents</p>
                <p className="text-2xl font-black text-[#DC2626] mt-0.5">{totalAccidents}</p>
              </div>
            </div>
            <div className="bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg p-3.5 space-y-2">
              <p className="text-[10px] font-bold text-[#94A3B8] dark:text-white/30 uppercase flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-[#2563EB]" /> Infractions
              </p>
              {[{ label:'Constatées', val:infConstatees },{ label:'Déférées', val:infDeferees }].map(({ label, val }) => (
                <div key={label} className="flex justify-between items-center text-xs">
                  <span className="text-[#64748B] dark:text-white/50">{label}</span>
                  <span className="font-bold text-[#0F172A] dark:text-white">{val}</span>
                </div>
              ))}
            </div>
            <div className="bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg p-3.5 space-y-2">
              <p className="text-[10px] font-bold text-[#94A3B8] dark:text-white/30 uppercase flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#DC2626]" /> Gravité accidents
              </p>
              {[
                { label:'Matériels', val:accidentsMateriel, cls:'' },
                { label:'Corporels', val:accidentsCorporel, cls:'' },
                { label:'Mortels',   val:accidentsMortel,  cls:'text-[#DC2626] font-semibold' },
              ].map(({ label, val, cls }) => (
                <div key={label} className="flex justify-between items-center text-xs">
                  <span className={`text-[#64748B] dark:text-white/50 ${cls}`}>{label}</span>
                  <span className={`font-bold text-[#0F172A] dark:text-white ${cls}`}>{val}</span>
                </div>
              ))}
            </div>
            {layers.immigration && totalImmigration > 0 && (
              <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg p-3.5">
                <p className="text-[10px] font-bold text-[#16A34A] uppercase mb-1.5 flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5" /> Immigration
                </p>
                <p className="text-xs text-[#0F172A] dark:text-white font-bold">{totalImmigration} cas géolocalisés</p>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">Trajectoires migratoires visibles</p>
              </div>
            )}
            <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-[10px] text-[#1D4ED8] leading-relaxed">
              Activez les couches pour afficher immigration et commissariats. Cliquez un marqueur pour les détails.
            </div>
          </div>
        </div>
      </div>

      {/* ── Plein écran amélioré ── */}
      <AnimatePresence>
        {mapFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-black flex flex-col"
          >
            {/* Barre de titre améliorée */}
            <div className="absolute top-0 inset-x-0 z-[10000] flex items-center justify-between px-4 py-2.5 bg-[#0F172A]/90 backdrop-blur-sm border-b border-white/10">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[#2563EB]" />
                  <span className="text-sm font-semibold text-white">Carte Nationale</span>
                  {selectedRegionName && (
                    <span className="text-xs text-[#2563EB] font-medium">— {selectedRegionName}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-1">
                  {Object.entries(LAYER_CONFIG).map(([key, cfg]) => layers[key] && (
                    <span key={key} className="flex items-center gap-1 text-[10px] text-white/60 font-medium">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                      {cfg.label}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3 ml-1 text-[10px] text-white/40 font-medium">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {activeLayersCount} couche{activeLayersCount > 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {totalMarkers} marqueurs
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <LiveClock />
                <button
                  onClick={() => setMapFullscreen(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  Quitter (Échap)
                </button>
              </div>
            </div>

            {/* Carte plein écran */}
            <div className="flex-1 relative z-0 mt-[45px]">
              <MapContainer center={mapCenter} zoom={mapZoom} className="w-full h-full" zoomControl>
                <TileLayer url={TILE_LAYERS[tileKey].url} attribution={TILE_LAYERS[tileKey].attribution} />
                <MapController center={mapCenter} zoom={mapZoom} />
                <ErrorBoundary>
                  <ChoroplethLayer infractions={infractions} accidents={accidents} immigrations={immigrations} visible={layers.choroplethe} />
                </ErrorBoundary>
                {renderLayers('fs-')}
                <MapLegend layers={layers} />
                <MapQuickStats inf={totalInfractions} acc={totalAccidents} svcs={totalCommissariats} imm={totalImmigration} layers={layers} />
              </MapContainer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

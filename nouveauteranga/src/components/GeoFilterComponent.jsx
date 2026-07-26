import { useState, useEffect, useRef } from 'react';
import { MapPin, ChevronDown, X } from 'lucide-react';
import geoService from '../services/geoService';
import { useAuth } from '../contexts/AuthContext';

const selectCls = 'w-full text-sm border border-[#CBD5E1] rounded-lg py-1.5 px-2.5 bg-[#F8FAFC] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors disabled:opacity-40';

export default function GeoFilterComponent({ onChange }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [regions, setRegions] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [services, setServices] = useState([]);

  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDepartement, setSelectedDepartement] = useState('');
  const [selectedCommune, setSelectedCommune] = useState('');
  const [selectedService, setSelectedService] = useState('');

  const containerRef = useRef(null);

  // Seuls les utilisateurs avec scope national voient le filtre
  const scopeType = user?.read_scope_type;
  const hasNationalScope = scopeType === 'national';

  useEffect(() => {
    if (!hasNationalScope) return;
    const ctrl = new AbortController();
    geoService.getAllRegions({ signal: ctrl.signal })
      .then(r => setRegions(r.data?.data || r.data || []))
      .catch(() => {});
    return () => ctrl.abort();
  }, [hasNationalScope]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSelectedDepartement(''); setSelectedCommune(''); setSelectedService('');
    setDepartements([]); setCommunes([]); setServices([]);
    if (!selectedRegion) return;
    const ctrl = new AbortController();
    geoService.getDepartements({ region_id: selectedRegion }, ctrl.signal)
      .then(r => { if (!ctrl.signal.aborted) setDepartements(r.data?.data || r.data || []); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [selectedRegion]);

  useEffect(() => {
    setSelectedCommune(''); setSelectedService('');
    setCommunes([]); setServices([]);
    if (!selectedDepartement) return;
    const ctrl = new AbortController();
    geoService.getCommunes({ departement_id: selectedDepartement }, ctrl.signal)
      .then(r => { if (!ctrl.signal.aborted) setCommunes(r.data?.data || r.data || []); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [selectedDepartement]);

  useEffect(() => {
    setSelectedService(''); setServices([]);
    if (!selectedCommune) return;
    const ctrl = new AbortController();
    geoService.getServices({ commune_id: selectedCommune }, ctrl.signal)
      .then(r => { if (!ctrl.signal.aborted) setServices(r.data?.data || r.data || []); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [selectedCommune]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!hasNationalScope) return null;

  const getLabel = () => {
    const parts = [];
    if (selectedRegion) parts.push(regions.find(r => String(r.id) === String(selectedRegion))?.nom || '');
    if (selectedDepartement) parts.push(departements.find(d => String(d.id) === String(selectedDepartement))?.nom || '');
    if (selectedCommune) parts.push(communes.find(c => String(c.id) === String(selectedCommune))?.nom || '');
    return parts.length > 0 ? parts.join(' › ') : 'Tout le territoire';
  };

  const hasFilter = selectedRegion || selectedDepartement || selectedCommune || selectedService;

  const applyFilter = () => {
    if (onChange) {
      onChange({
        region_id: selectedRegion || undefined,
        departement_id: selectedDepartement || undefined,
        commune_id: selectedCommune || undefined,
        service_id: selectedService || undefined,
      });
    }
    setIsOpen(false);
  };

  const resetFilter = () => {
    setSelectedRegion(''); setSelectedDepartement('');
    setSelectedCommune(''); setSelectedService('');
    if (onChange) onChange({});
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(p => !p)}
        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-sm hover:bg-[#F8FAFC] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
      >
        <MapPin className={`w-4 h-4 shrink-0 ${hasFilter ? 'text-[#2563EB]' : 'text-[#94A3B8]'}`} />
        <span className={`font-medium max-w-[200px] truncate text-sm ${hasFilter ? 'text-[#0F172A]' : 'text-[#64748B]'}`}>
          {getLabel()}
        </span>
        {hasFilter ? (
          <span
            onClick={(e) => { e.stopPropagation(); resetFilter(); }}
            className="w-4 h-4 flex items-center justify-center rounded-full bg-[#CBD5E1] hover:bg-[#CBD5E1] text-[#475569] transition-colors cursor-pointer"
          >
            <X className="w-2.5 h-2.5" />
          </span>
        ) : (
          <ChevronDown className={`w-4 h-4 text-[#94A3B8] transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-[#CBD5E1] rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#CBD5E1] bg-[#F8FAFC]">
            <p className="text-sm font-semibold text-[#0F172A]">Filtre géographique</p>
            <p className="text-xs text-[#64748B] mt-0.5">Région → Département → Commune → Service</p>
          </div>

          <div className="p-4 space-y-3">
            {[
              { label: 'Région', value: selectedRegion, options: regions, onChange: setSelectedRegion, disabled: false },
              { label: 'Département', value: selectedDepartement, options: departements, onChange: setSelectedDepartement, disabled: !selectedRegion },
              { label: 'Commune', value: selectedCommune, options: communes, onChange: setSelectedCommune, disabled: !selectedDepartement },
              { label: 'Service / Commissariat', value: selectedService, options: services, onChange: setSelectedService, disabled: !selectedCommune },
            ].map(({ label, value, options, onChange: onChangeFn, disabled }) => (
              <div key={label}>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">{label}</label>
                <select value={value} onChange={e => onChangeFn(e.target.value)} disabled={disabled} className={selectCls}>
                  <option value="">Tous</option>
                  {options.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-[#CBD5E1] bg-[#F8FAFC] flex justify-between items-center">
            <button onClick={resetFilter} className="text-xs font-medium text-[#64748B] hover:text-[#0F172A] transition-colors">
              Réinitialiser
            </button>
            <button onClick={applyFilter} className="px-4 py-1.5 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-xs font-semibold transition-colors">
              Appliquer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

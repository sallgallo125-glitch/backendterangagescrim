import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';
import { Toast, useToast } from '../components/ui/Toast';
import {
  Lock, Shield, ShieldCheck, Eye, EyeOff, Loader2, User,
} from 'lucide-react';

const inputCls = "w-full h-10 px-3 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white placeholder-[#94A3B8] dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all";

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white dark:bg-[#343a40] border border-[#E8ECF1] dark:border-white/[0.06] rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2.5 pb-4 border-b border-[#F1F5F9] dark:border-white/[0.06]">
        <div className="w-8 h-8 rounded-xl bg-[#F1F5F9] dark:bg-white/5 flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#1B4332] dark:text-[#52B788]" />
        </div>
        <h2 className="text-[15px] font-semibold text-[#0F172A] dark:text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function MonProfil() {
  const { user, updateUser } = useAuth();
  const { toast, showToast } = useToast();

  const [profileForm, setProfileForm] = useState({ name: '', telephone: '' });
  const [profileLoading, setProfileLoading] = useState(false);

  const [pwdForm, setPwdForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const [twofa, setTwofa] = useState({
    enabled: user?.is_2fa_enabled || false,
    step: 'idle',
    otp: '',
    loading: false,
  });

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name || '', telephone: user.telephone || '' });
      setTwofa(p => ({ ...p, enabled: user.is_2fa_enabled || false }));
    }
  }, [user?.id]);

  /* ── Modifier le profil ── */
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      showToast('Le nom est obligatoire.', 'error');
      return;
    }
    setProfileLoading(true);
    try {
      await authService.updateProfile(profileForm);
      updateUser({ name: profileForm.name.trim(), telephone: profileForm.telephone });
      showToast('Profil mis à jour avec succès.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de la mise à jour.';
      showToast(msg, 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  /* ── Changer mot de passe ── */
  const handleChangePwd = async (e) => {
    e.preventDefault();
    if (pwdForm.password !== pwdForm.password_confirmation) {
      showToast('Les mots de passe ne correspondent pas.', 'error');
      return;
    }
    setPwdLoading(true);
    try {
      await authService.changePassword(pwdForm);
      showToast('Mot de passe modifié avec succès.');
      setPwdForm({ current_password: '', password: '', password_confirmation: '' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors du changement de mot de passe.';
      showToast(msg, 'error');
    } finally {
      setPwdLoading(false);
    }
  };

  /* ── 2FA ── */
  const handle2faSetup = async () => {
    setTwofa(p => ({ ...p, loading: true }));
    try {
      await authService.setup2fa();
      setTwofa(p => ({ ...p, step: 'verify_enable', loading: false, otp: '' }));
      showToast('Code OTP envoyé à votre adresse email.');
    } catch (err) {
      showToast(err.response?.data?.message || "Erreur lors de l'envoi du code.", 'error');
      setTwofa(p => ({ ...p, loading: false }));
    }
  };

  const handle2faEnable = async () => {
    if (!twofa.otp || twofa.otp.length < 6) {
      showToast('Saisissez le code OTP à 6 chiffres.', 'error');
      return;
    }
    setTwofa(p => ({ ...p, loading: true }));
    try {
      await authService.enable2fa(twofa.otp);
      setTwofa({ enabled: true, step: 'idle', otp: '', loading: false });
      showToast('Authentification à deux facteurs activée.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Code OTP invalide ou expiré.', 'error');
      setTwofa(p => ({ ...p, loading: false }));
    }
  };

  const roleLabel = typeof user?.roles?.[0] === 'string' ? user.roles[0] : user?.roles?.[0]?.name || 'Agent';

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <AnimatePresence><Toast toast={toast} /></AnimatePresence>

      {/* Entête profil */}
      <div className="bg-white dark:bg-[#343a40] border border-[#E8ECF1] dark:border-white/[0.06] rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1B4332] to-[#40916C] flex items-center justify-center text-white text-xl font-bold shadow">
            {user?.name ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'AG'}
          </div>
          <div>
            <p className="text-[18px] font-bold text-[#0F172A] dark:text-white">{user?.name || 'Agent'}</p>
            <p className="text-sm text-[#64748B] dark:text-white/50">{user?.email}</p>
            <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#BBF7D0] capitalize">
              {roleLabel}
            </span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-[#F1F5F9] dark:border-white/[0.06]">
          <div>
            <p className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wide">Service</p>
            <p className="text-sm font-medium text-[#0F172A] dark:text-white mt-0.5">{user?.service?.nom || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wide">2FA</p>
            <p className="text-sm font-semibold mt-0.5 text-[#059669]">Activée (obligatoire)</p>
          </div>
        </div>
      </div>

      {/* Modifier le profil */}
      <SectionCard title="Modifier le profil" icon={User}>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Nom complet</label>
            <input
              type="text"
              value={profileForm.name}
              onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Téléphone</label>
            <input
              type="tel"
              value={profileForm.telephone}
              onChange={e => setProfileForm(p => ({ ...p, telephone: e.target.value }))}
              placeholder="+221 77 000 00 00"
              className={inputCls}
            />
          </div>
          <button type="submit" disabled={profileLoading}
            className="flex items-center gap-2 h-10 px-5 text-sm font-medium text-white bg-[#1B4332] hover:bg-[#143728] rounded-lg transition-colors disabled:opacity-60">
            {profileLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Enregistrer les modifications
          </button>
        </form>
      </SectionCard>

      {/* Changer le mot de passe */}
      <SectionCard title="Changer le mot de passe" icon={Lock}>
        <form onSubmit={handleChangePwd} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Mot de passe actuel</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={pwdForm.current_password}
                onChange={e => setPwdForm(p => ({ ...p, current_password: e.target.value }))}
                className={inputCls}
                required
              />
              <button type="button" onClick={() => setShowPwd(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]"
                aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Nouveau mot de passe</label>
            <input type="password" value={pwdForm.password} onChange={e => setPwdForm(p => ({ ...p, password: e.target.value }))} className={inputCls} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Confirmer le nouveau mot de passe</label>
            <input type="password" value={pwdForm.password_confirmation} onChange={e => setPwdForm(p => ({ ...p, password_confirmation: e.target.value }))} className={inputCls} required />
          </div>
          <button type="submit" disabled={pwdLoading}
            className="flex items-center gap-2 h-10 px-5 text-sm font-medium text-white bg-[#1B4332] hover:bg-[#143728] rounded-lg transition-colors disabled:opacity-60">
            {pwdLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Modifier le mot de passe
          </button>
        </form>
      </SectionCard>

      {/* 2FA */}
      <SectionCard title="Authentification à deux facteurs (2FA)" icon={Shield}>
        {twofa.enabled && (
          <div className="flex items-center gap-3 p-4 rounded-xl border bg-[#F0FDF4] border-[#BBF7D0] dark:bg-[#059669]/10 dark:border-[#059669]/30">
            <ShieldCheck className="w-5 h-5 text-[#059669] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#059669]">2FA activée</p>
              <p className="text-xs text-[#94A3B8] dark:text-white/30 mt-0.5">
                Un code OTP vous sera demandé à chaque connexion.
              </p>
            </div>
          </div>
        )}

        {!twofa.enabled && twofa.step === 'idle' && (
          <button onClick={handle2faSetup} disabled={twofa.loading}
            className="flex items-center gap-2 h-10 px-5 text-sm font-medium text-white bg-[#1B4332] hover:bg-[#143728] rounded-lg transition-colors disabled:opacity-60">
            {twofa.loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Activer la 2FA
          </button>
        )}

        {!twofa.enabled && twofa.step === 'verify_enable' && (
          <div className="space-y-3">
            <p className="text-sm text-[#64748B] dark:text-white/50">Saisissez le code OTP reçu par email :</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={twofa.otp}
              onChange={e => setTwofa(p => ({ ...p, otp: e.target.value.replace(/\D/g, '') }))}
              placeholder="000000"
              className={`${inputCls} text-center text-2xl tracking-[0.5em] font-bold`}
            />
            <div className="flex gap-3">
              <button onClick={handle2faEnable} disabled={twofa.loading}
                className="flex items-center gap-2 h-10 px-5 text-sm font-medium text-white bg-[#059669] hover:bg-[#047857] rounded-lg transition-colors disabled:opacity-60">
                {twofa.loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmer et activer
              </button>
              <button onClick={() => setTwofa(p => ({ ...p, step: 'idle', otp: '' }))}
                className="h-10 px-4 text-sm font-medium text-[#64748B] bg-[#F1F5F9] dark:bg-white/5 hover:bg-[#CBD5E1] rounded-lg transition-colors">
                Annuler
              </button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

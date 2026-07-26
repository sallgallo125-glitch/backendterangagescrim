import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Loader2, Eye, EyeOff, Lock, AlertTriangle, Mail, KeyRound, ArrowLeft, Smartphone, CheckCircle } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';


// ── Composant OTP (6 cases) ───────────────────────────────────────
function OtpInput({ value, onChange, disabled }) {
  const inputs = useRef([]);

  const handleChange = (i, v) => {
    const digits = v.replace(/\D/g, '').slice(-1);
    const arr = value.split('');
    arr[i] = digits;
    const next = arr.join('').padEnd(6, '').slice(0, 6);
    onChange(next);
    if (digits && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      onChange(pasted);
      inputs.current[5]?.focus();
      e.preventDefault();
    }
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          disabled={disabled}
          autoFocus={i === 0}
          aria-label={`Chiffre ${i + 1} sur 6`}
          className="w-10 h-12 text-center text-[18px] font-bold rounded-xl bg-[#E5E7EB] border border-[#D1D5DB]
            focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#2D6A4F]
            disabled:opacity-50 transition-all caret-transparent"
        />
      ))}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────
export default function Login() {
  // 'credentials' | 'otp' | 'forgot' | 'forgot_otp'
  const [step, setStep]             = useState('credentials');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp]               = useState('');
  const [ticket, setTicket]         = useState('');
  const [emailHint, setEmailHint]   = useState('');
  const [error, setError]           = useState('');
  const [errorCode, setErrorCode]   = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const [slowServer, setSlowServer] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('rememberedEmail'));

  // ── État "mot de passe oublié" ──
  const [forgotEmail, setForgotEmail]           = useState('');
  const [forgotTicket, setForgotTicket]         = useState('');
  const [forgotEmailHint, setForgotEmailHint]   = useState('');
  const [forgotOtp, setForgotOtp]               = useState('');
  const [newPassword, setNewPassword]           = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showNewPassword, setShowNewPassword]   = useState(false);
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false);
  const [forgotSuccess, setForgotSuccess]       = useState(false);

  const { login, verify2fa, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Pre-fill remembered email on mount
  useEffect(() => {
    const saved = localStorage.getItem('rememberedEmail');
    if (saved) setEmail(saved);
  }, []);

  // Affiche un message d'attente si le serveur met plus de 5s (cold start Railway)
  useEffect(() => {
    if (!isLoading) { setSlowServer(false); return; }
    const t = setTimeout(() => setSlowServer(true), 5000);
    return () => clearTimeout(t);
  }, [isLoading]);


  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // ── Étape 1 : soumettre email + password ──
  const handleSubmitCredentials = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setErrorCode('');

    // Validation format email si le champ ressemble à un email
    if (email.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Adresse email invalide.');
        return;
      }
    }

    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      if (rememberMe) localStorage.setItem('rememberedEmail', email);
      else localStorage.removeItem('rememberedEmail');
      navigate('/dashboard');
    } else if (result.requires2fa) {
      setTicket(result.ticket);
      setEmailHint(result.emailHint || '');
      setStep('otp');
    } else {
      setError(result.message);
      setErrorCode(result.code || '');
    }

    setIsLoading(false);
  };

  // ── Étape 2 : soumettre code OTP ──
  const handleSubmitOtp = async (e) => {
    e.preventDefault();
    if (isLoading || otp.length < 6) return;
    setError('');
    setIsLoading(true);

    const result = await verify2fa(ticket, otp);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
      setOtp('');
    }

    setIsLoading(false);
  };

  // ── Mot de passe oublié : étape 1 ──
  const handleForgotSubmitEmail = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setIsLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail });
      const data = res.data?.data ?? {};
      setForgotTicket(data.ticket ?? '');
      setForgotEmailHint(data.email_hint ?? forgotEmail);
      setStep('forgot_otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'envoi du code.');
    }
    setIsLoading(false);
  };

  // ── Mot de passe oublié : étape 2 ──
  const handleForgotConfirm = async (e) => {
    e.preventDefault();
    if (isLoading || forgotOtp.length < 6) return;
    setError('');

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password-confirm', {
        ticket: forgotTicket,
        code: forgotOtp,
        password: newPassword,
        password_confirmation: newPasswordConfirm,
      });
      setForgotSuccess(true);
      setTimeout(() => {
        setStep('credentials');
        setForgotSuccess(false);
        setForgotEmail(''); setForgotTicket(''); setForgotOtp('');
        setNewPassword(''); setNewPasswordConfirm('');
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Code incorrect ou expiré.');
      setForgotOtp('');
    }
    setIsLoading(false);
  };

  const isLocked = error && (
    error.includes('verrouill') ||
    error.includes('15 minutes') ||
    error.includes('trop de') ||
    error.includes('trop de tentatives')
  );

  const cardVariants = {
    enter:  { opacity: 0, x: 40, scale: 0.97 },
    center: { opacity: 1, x: 0,  scale: 1 },
    exit:   { opacity: 0, x: -40, scale: 0.97 },
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden py-8 gap-4"
      style={{
        backgroundImage: 'url(/login-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[380px] mx-4 rounded-t-[48px] rounded-b-3xl overflow-hidden shadow-2xl shadow-black/60"
      >
        {/* ── Bandeau supérieur ── */}
        <div
          className="relative h-[200px] flex flex-col items-center justify-center px-6 rounded-t-[48px] overflow-hidden"
          style={{
            backgroundImage: 'url(/login-bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg shadow-black/50 border border-white/10">
              <img src="/logo-v2.png" alt="GESCRIM" className="w-full h-full object-cover" />
            </div>
            <div className="text-center">
              <h1 className="text-[22px] font-extrabold text-white tracking-[-0.02em] leading-tight drop-shadow-md">
                TERANGA <span className="text-[#52B788]">GESCRIM</span>
              </h1>
              <p className="text-white/55 text-[11px] mt-0.5 font-medium tracking-wide">
                Plateforme Nationale de Sécurité Publique
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-white/65 text-[10px] font-medium">Système National de Sécurité</span>
            </div>
          </div>
        </div>

        {/* ── Formulaire ── */}
        <div className="bg-white px-6 pt-5 pb-6">
          <h2 className="text-center text-[17px] font-bold text-[#212529] mb-5 tracking-[-0.01em]">
            {step === 'credentials' && 'Connexion'}
            {step === 'otp' && 'Vérification en 2 étapes'}
            {step === 'forgot' && 'Mot de passe oublié'}
            {step === 'forgot_otp' && 'Nouveau mot de passe'}
          </h2>

          {/* Erreur */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key={error}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className={`mb-4 px-3 py-2.5 rounded-xl text-[12px] flex items-start gap-2.5 ${
                  isLocked
                    ? 'bg-orange-50 border border-orange-200 text-orange-700'
                    : errorCode === 'WEB_AGENT_FORBIDDEN'
                      ? 'bg-blue-50 border border-blue-200 text-blue-700'
                      : 'bg-red-50 border border-red-200 text-red-600'
                }`}
              >
                {isLocked
                  ? <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                  : errorCode === 'WEB_AGENT_FORBIDDEN'
                    ? <Smartphone className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                    : <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                }
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Étapes animées ── */}
          <AnimatePresence mode="wait">
            {step === 'credentials' ? (
              <motion.form
                key="credentials"
                variants={cardVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
                onSubmit={handleSubmitCredentials}
                className="space-y-4"
              >
                {/* Email */}
                <div>
                  <label className="block text-left text-[12px] font-semibold text-[#374151] mb-1.5">
                    Matricule ou Email professionnel
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                    <input
                      type="text"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Entrez votre matricule ou email"
                      required
                      disabled={isLoading}
                      className="w-full h-[44px] pl-10 pr-3 rounded-xl text-[13px] text-[#212529] placeholder-[#9CA3AF] bg-[#E5E7EB] border border-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#2D6A4F] transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Mot de passe */}
                <div>
                  <label className="block text-left text-[12px] font-semibold text-[#374151] mb-1.5">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Entrez votre mot de passe"
                      required
                      disabled={isLoading}
                      className="w-full h-[44px] pl-10 pr-10 rounded-xl text-[13px] text-[#212529] placeholder-[#9CA3AF] bg-[#E5E7EB] border border-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#2D6A4F] transition-all disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Se souvenir / Oublié */}
                <div className="flex items-center justify-between text-[12px]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-[#D1D5DB] accent-[#1B4332]"
                    />
                    <span className="text-[#6B7280]">Se souvenir de moi</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setError(''); setErrorCode(''); setStep('forgot'); }}
                    className="text-[#1B4332] hover:text-[#2D6A4F] font-semibold transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[46px] flex items-center justify-center gap-2 rounded-xl font-bold text-[13px] text-white transition-all
                    bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] hover:from-[#143728] hover:to-[#1B4332]
                    shadow-md shadow-[#1B4332]/30 hover:shadow-lg
                    disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    slowServer
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Démarrage du serveur...</>
                      : <><Loader2 className="w-4 h-4 animate-spin" /> Connexion...</>
                  ) : (
                    'Se connecter'
                  )}
                </button>

                {slowServer && (
                  <p className="text-center text-[11px] text-amber-600 mt-2">
                    Le serveur démarre, merci de patienter (~30 secondes)…
                  </p>
                )}
              </motion.form>
            ) : step === 'otp' ? (
              <motion.form
                key="otp"
                variants={cardVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
                onSubmit={handleSubmitOtp}
                className="space-y-5"
              >
                {/* Icône */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#E8F5E9] border border-[#A5D6A7]">
                    <KeyRound className="w-6 h-6 text-[#1B4332]" />
                  </div>
                  <p className="text-[12px] text-[#6B7280] text-center leading-relaxed">
                    Un code à 6 chiffres a été envoyé à{' '}
                    <span className="font-semibold text-[#374151]">
                      {emailHint || 'votre adresse email'}
                    </span>.
                    <br />Vérifiez votre boîte mail et saisissez le code ci-dessous.
                  </p>
                </div>

                <OtpInput value={otp} onChange={setOtp} disabled={isLoading} />

                <button
                  type="submit"
                  disabled={isLoading || otp.length < 6}
                  className="w-full h-[46px] flex items-center justify-center gap-2 rounded-xl font-bold text-[13px] text-white transition-all
                    bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] hover:from-[#143728] hover:to-[#1B4332]
                    shadow-md shadow-[#1B4332]/30 hover:shadow-lg
                    disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Vérification...</>
                  ) : (
                    'Valider le code'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setOtp(''); setError(''); setTicket(''); }}
                  className="w-full flex items-center justify-center gap-1.5 text-[12px] text-[#6B7280] hover:text-[#374151] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Retour à la connexion
                </button>
              </motion.form>
            ) : step === 'forgot' ? (
              <motion.form
                key="forgot"
                variants={cardVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
                onSubmit={handleForgotSubmitEmail}
                className="space-y-4"
              >
                {/* Info box */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-[12px] text-blue-700 flex items-start gap-2">
                  <Mail className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Saisissez votre email professionnel. Vous recevrez un code à 6 chiffres valable 10 minutes.</span>
                </div>

                <div>
                  <label className="block text-left text-[12px] font-semibold text-[#374151] mb-1.5">
                    Adresse email professionnelle
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="Entrez votre email professionnel"
                      required
                      disabled={isLoading}
                      className="w-full h-[44px] pl-10 pr-3 rounded-xl text-[13px] text-[#212529] placeholder-[#9CA3AF] bg-[#E5E7EB] border border-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#2D6A4F] transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !forgotEmail}
                  className="w-full h-[46px] flex items-center justify-center gap-2 rounded-xl font-bold text-[13px] text-white transition-all
                    bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] hover:from-[#143728] hover:to-[#1B4332]
                    shadow-md shadow-[#1B4332]/30 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</> : 'Envoyer le code'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setError(''); setForgotEmail(''); }}
                  className="w-full flex items-center justify-center gap-1.5 text-[12px] text-[#6B7280] hover:text-[#374151] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Retour à la connexion
                </button>
              </motion.form>
            ) : step === 'forgot_otp' ? (
              <motion.form
                key="forgot_otp"
                variants={cardVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
                onSubmit={handleForgotConfirm}
                className="space-y-4"
              >
                {forgotSuccess ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-emerald-600" />
                    </div>
                    <p className="text-[13px] font-semibold text-emerald-700 text-center">Mot de passe réinitialisé !</p>
                    <p className="text-[12px] text-[#6B7280] text-center">Vous allez être redirigé vers la connexion.</p>
                  </div>
                ) : (
                  <>
                    {/* Email hint */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-[12px] text-emerald-700 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>Code envoyé à <strong>{forgotEmailHint}</strong></span>
                    </div>

                    {/* OTP */}
                    <div>
                      <label className="block text-left text-[12px] font-semibold text-[#374151] mb-2">
                        Code de vérification
                      </label>
                      <OtpInput value={forgotOtp} onChange={setForgotOtp} disabled={isLoading} />
                    </div>

                    {/* Nouveau MDP */}
                    <div>
                      <label className="block text-left text-[12px] font-semibold text-[#374151] mb-1.5">
                        Nouveau mot de passe
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Min. 8 caractères"
                          required
                          disabled={isLoading}
                          className="w-full h-[44px] pl-10 pr-10 rounded-xl text-[13px] text-[#212529] placeholder-[#9CA3AF] bg-[#E5E7EB] border border-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#2D6A4F] transition-all disabled:opacity-60"
                        />
                        <button type="button" onClick={() => setShowNewPassword(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]">
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-left text-[12px] font-semibold text-[#374151] mb-1.5">
                        Confirmer le mot de passe
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                        <input
                          type={showNewPasswordConfirm ? 'text' : 'password'}
                          value={newPasswordConfirm}
                          onChange={e => setNewPasswordConfirm(e.target.value)}
                          placeholder="Répétez le mot de passe"
                          required
                          disabled={isLoading}
                          className="w-full h-[44px] pl-10 pr-10 rounded-xl text-[13px] text-[#212529] placeholder-[#9CA3AF] bg-[#E5E7EB] border border-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#2D6A4F] transition-all disabled:opacity-60"
                        />
                        <button type="button" onClick={() => setShowNewPasswordConfirm(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]">
                          {showNewPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || forgotOtp.length < 6 || newPassword.length < 8}
                      className="w-full h-[46px] flex items-center justify-center gap-2 rounded-xl font-bold text-[13px] text-white transition-all
                        bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] hover:from-[#143728] hover:to-[#1B4332]
                        shadow-md shadow-[#1B4332]/30 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Vérification...</> : 'Réinitialiser le mot de passe'}
                    </button>

                    <button
                      type="button"
                      onClick={() => { setStep('forgot'); setForgotOtp(''); setError(''); }}
                      className="w-full flex items-center justify-center gap-1.5 text-[12px] text-[#6B7280] hover:text-[#374151] transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Changer d'adresse email
                    </button>
                  </>
                )}
              </motion.form>
            ) : null}
          </AnimatePresence>

        </div>

        {/* ── Pied de carte ── */}
        <div className="bg-[#0F1F17] px-6 py-4 flex items-center justify-around">
          {[
            { label: 'Régions', value: '14' },
            { label: 'Commissariats', value: '127' },
            { label: 'Rapports', value: '9.2k' },
          ].map((stat, i) => (
            <div key={stat.label} className="flex items-center gap-3">
              {i > 0 && <span className="w-px h-7 bg-white/10" />}
              <div className="text-center">
                <div className="text-[15px] font-bold text-white leading-none">{stat.value}</div>
                <div className="text-[10px] text-white/35 mt-0.5 font-medium">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="relative z-10 text-center">
        <p className="text-[11px] text-white/25 font-medium">
          © 2026 Teranga GESCRIM — Direction de la Sécurité Publique
        </p>
        <p className="text-[10px] text-white/15 mt-0.5">
          Accès réservé au personnel autorisé. Toutes les connexions sont enregistrées.
        </p>
      </div>
    </div>
  );
}

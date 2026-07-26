export default function FormField({ id, label, error, required, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-[#64748B] dark:text-white/50 mb-1.5 uppercase tracking-wide">
        {label}
        {required && (
          <>
            <span className="text-[#DC2626] ml-0.5" aria-hidden="true">*</span>
            <span className="sr-only">(obligatoire)</span>
          </>
        )}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-[#DC2626] text-xs mt-1">
          {Array.isArray(error) ? error[0] : error}
        </p>
      )}
    </div>
  );
}

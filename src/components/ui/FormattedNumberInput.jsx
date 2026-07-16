import { useState, useEffect } from 'react';

/**
 * Input numérico que muestra separadores de miles mientras el usuario escribe,
 * pero devuelve al padre el valor numérico limpio (sin formato) vía onChange.
 *
 * Uso:
 * <FormattedNumberInput
 *   value={formData.cop_amount}
 *   onChange={(val) => setFormData(prev => ({ ...prev, cop_amount: val }))}
 *   prefix="$"
 * />
 */
export default function FormattedNumberInput({
  value,
  onChange,
  prefix = '',
  locale = 'en-US', // usa 'es-CO' si prefieres punto como separador de miles
  placeholder = '0',
  disabled = false,
  className = '',
  style = {},
  ...props
}) {
  const [display, setDisplay] = useState('');

  const formatNumber = (num) => {
    if (num === '' || num === null || num === undefined) return '';
    const clean = num.toString().replace(/[^\d]/g, '');
    if (!clean) return '';
    return new Intl.NumberFormat(locale).format(Number(clean));
  };

  useEffect(() => {
    setDisplay(formatNumber(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, locale]);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    setDisplay(formatNumber(raw));
    onChange(raw ? Number(raw) : 0);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      {prefix && (
        <span
          style={{
            position: 'absolute',
            left: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            pointerEvents: 'none',
          }}
        >
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        style={{
          paddingLeft: prefix ? 24 : 8,
          width: '100%',
          boxSizing: 'border-box',
          ...style,
        }}
        {...props}
      />
    </div>
  );
}

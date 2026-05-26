type NumberFieldProps = {
  className?: string;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  placeholder?: string;
  step?: number;
  value: number;
};

export function NumberField({ className = "field mt-1", max, min, onChange, placeholder, step, value }: NumberFieldProps) {
  return (
    <input
      className={className}
      type="number"
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      value={value === 0 ? "" : value}
      onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))}
    />
  );
}

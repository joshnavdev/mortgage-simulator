import type { FieldError, UseFormRegister, UseFormWatch } from "react-hook-form";
import type { FormValues } from "@/lib/types";

type SliderProps = {
  name: keyof FormValues;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  hint?: string | undefined;
  hintLabel?: string | undefined;
  required?: boolean;
  register: UseFormRegister<FormValues>;
  watch: UseFormWatch<FormValues>;
  error?: FieldError | undefined;
};

export default function Slider({
  name,
  label,
  min,
  max,
  step,
  suffix,
  hint,
  hintLabel,
  required,
  register,
  watch,
  error,
}: SliderProps) {
  const value = watch(name);
  return (
    <div>
      <label className="input-label">
        {label}
        {required && <span className="input-required">*</span>}
      </label>
      <div className="slider-row">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          className="slider"
          {...register(name, required ? { required: true } : undefined)}
        />
        <span className="slider-value">
          {value}
          {suffix ? ` ${suffix}` : ""}
        </span>
      </div>
      {hint && !error && 
        <div className="input-hint-container">
          {hintLabel && <div className="input-hint">{hintLabel}</div>}
          <div className="input-hint">{hint}</div>
        </div>}
      {error && <div className="input-error">{error.message}</div>}
    </div>
  );
}

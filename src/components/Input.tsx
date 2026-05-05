import type {
  FieldError,
  RegisterOptions,
  UseFormRegister,
} from "react-hook-form";
import type { FormValues } from "@/lib/types";

type InputProps = {
  name: keyof FormValues;
  label: string;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  variant?: "prestamo" | "seguros";
  size?: "sm" | "md";
  inputMode?: "decimal" | "numeric" | "text";
  hint?: string;
  required?: boolean;
  rules?: RegisterOptions<FormValues, keyof FormValues> | undefined;
  register: UseFormRegister<FormValues>;
  error?: FieldError | undefined;
};

export default function Input({
  name,
  label,
  placeholder,
  prefix,
  suffix,
  variant,
  size = "md",
  inputMode = "decimal",
  hint,
  required,
  rules,
  register,
  error,
}: InputProps) {
  const mergedRules: RegisterOptions<FormValues, keyof FormValues> = required
    ? { required: "Este campo es obligatorio", ...rules }
    : (rules ?? {});
  const isSm = size === "sm";
  const prefixCls = [
    "input-prefix",
    isSm && "input-prefix--sm",
    variant && `input-prefix--${variant}`,
  ]
    .filter(Boolean)
    .join(" ");
  const suffixCls = ["input-suffix", isSm && "input-suffix--sm"].filter(Boolean).join(" ");
  const inputCls = "input" + (isSm ? " input--sm" : "");
  const boxCls = "input-box" + (error ? " is-error" : "");

  return (
    <div>
      <label className="input-label">
        {label}
        {required && <span className="input-required">*</span>}
      </label>
      <div className={boxCls}>
        {prefix && <span className={prefixCls}>{prefix}</span>}
        <input
          type="text"
          inputMode={inputMode}
          placeholder={placeholder}
          className={inputCls}
          {...register(name, mergedRules)}
        />
        {suffix && <span className={suffixCls}>{suffix}</span>}
      </div>
      {hint && !error && <div className="input-hint">{hint}</div>}
      {error && <div className="input-error">{error.message}</div>}
    </div>
  );
}

import { useState } from "react";
import "./LoginForm.css";
import {
  CognitoAuthError,
  respondToNewPasswordChallenge,
  signIn,
  type CognitoChallenge,
  type CognitoConfig,
  type CognitoSession,
} from "@/lib/cognitoAuth";

type LoginFormProps = {
  config: CognitoConfig;
  onAuthenticated: (session: CognitoSession) => void;
};

export default function LoginForm({ config, onAuthenticated }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [challenge, setChallenge] = useState<CognitoChallenge | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSignIn() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await signIn(config, email.trim(), password);
      if (result.kind === "session") {
        onAuthenticated(result.session);
      } else {
        setChallenge(result.challenge);
      }
    } catch (err) {
      if (err instanceof CognitoAuthError) {
        setError(err.message);
      } else {
        setError("No se pudo iniciar sesión. Intenta de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNewPassword() {
    if (!challenge) return;
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const session = await respondToNewPasswordChallenge(config, challenge, newPassword);
      onAuthenticated(session);
    } catch (err) {
      if (err instanceof CognitoAuthError) {
        setError(err.message);
      } else {
        setError("No se pudo cambiar la contraseña. Intenta de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (challenge !== null) {
    const canSubmitNew = newPassword.length >= 8 && confirmPassword.length > 0 && !submitting;

    return (
      <form
        className="login"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmitNew) void handleNewPassword();
        }}
      >
        <p className="login__intro">Debes establecer una nueva contraseña para continuar.</p>

        <label className="login__label" htmlFor="login-new-password">
          Nueva contraseña
        </label>
        <input
          id="login-new-password"
          type="password"
          autoComplete="new-password"
          className="login__input"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
        />

        <label className="login__label" htmlFor="login-confirm-password">
          Confirmar contraseña
        </label>
        <input
          id="login-confirm-password"
          type="password"
          autoComplete="new-password"
          className="login__input"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repite la contraseña"
        />

        {error !== null && <p className="login__error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={!canSubmitNew}>
          {submitting ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </form>
    );
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  return (
    <form
      className="login"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) void handleSignIn();
      }}
    >
      <p className="login__intro">Inicia sesión para usar la integración de YNAB.</p>

      <label className="login__label" htmlFor="login-email">
        Correo electrónico
      </label>
      <input
        id="login-email"
        autoComplete="username"
        className="login__input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tucorreo@ejemplo.com"
      />

      <label className="login__label" htmlFor="login-password">
        Contraseña
      </label>
      <input
        id="login-password"
        type="password"
        autoComplete="current-password"
        className="login__input"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
      />

      {error !== null && <p className="login__error">{error}</p>}

      <button type="submit" className="btn-primary" disabled={!canSubmit}>
        {submitting ? "Iniciando sesión…" : "Iniciar sesión"}
      </button>
    </form>
  );
}

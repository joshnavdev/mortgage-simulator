import type { Dispatch, SetStateAction } from "react";
import "./Navbar.css";

export type AppView = "mortgage" | "salary";

const TABS: ReadonlyArray<{ key: AppView; label: string; icon: string }> = [
  { key: "mortgage", label: "Simulador Hipotecario", icon: "🏠" },
  { key: "salary", label: "Simulador de Sueldos", icon: "💵" },
];

type NavbarProps = {
  view: AppView;
  setView: Dispatch<SetStateAction<AppView>>;
};

export default function Navbar({ view, setView }: NavbarProps) {
  return (
    <nav className="navbar">
      {TABS.map(({ key, label, icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => setView(key)}
          className={"navbar__tab" + (view === key ? " is-active" : "")}
        >
          <span className="navbar__tab-icon">{icon}</span>
          <span className="navbar__tab-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}

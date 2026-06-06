import { useState } from "react";
import "./App.css";
import Navbar, { type AppView } from "@/components/Navbar";
import App from "@/App";
import SalaryApp from "@/SalaryApp";

export default function Root() {
  const [view, setView] = useState<AppView>("mortgage");

  return (
    <div className="app">
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700;800&display=swap"
        rel="stylesheet"
      />
      <div className="app__container">
        <Navbar view={view} setView={setView} />
        {view === "mortgage" ? <App /> : <SalaryApp />}
      </div>
    </div>
  );
}

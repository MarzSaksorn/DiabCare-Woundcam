import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Home from "./Home";
import { LOCAL_SESSION_KEY } from "./LocalLogin";

export default function LocalWorkspace() {
  const [, setLocation] = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hasLocalSession = Boolean(
      window.localStorage.getItem(LOCAL_SESSION_KEY)
    );
    if (!hasLocalSession) {
      setLocation("/");
      return;
    }
    setReady(true);
  }, [setLocation]);

  if (!ready) return null;

  return <Home demoMode />;
}

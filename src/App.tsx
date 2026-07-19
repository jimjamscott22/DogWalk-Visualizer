import { useEffect } from "react";
import { DashboardShell } from "./components/DashboardShell";
import { applyTheme, getStoredTheme } from "./lib/theme";
import { useAppStore } from "./store/appStore";

function App() {
  const init = useAppStore((s) => s.init);

  useEffect(() => {
    applyTheme(getStoredTheme());
    void init();
  }, [init]);

  return <DashboardShell />;
}

export default App;

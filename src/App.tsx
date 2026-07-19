import { useEffect } from "react";
import { DashboardShell } from "./components/DashboardShell";
import { useAppStore } from "./store/appStore";

function App() {
  const init = useAppStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  return <DashboardShell />;
}

export default App;

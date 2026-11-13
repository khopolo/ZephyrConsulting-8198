import { usePing } from "../queries/ping";
import { useDesktop } from "../hooks/use-desktop";

function Index() {
  const ping = usePing();
  const desktop = useDesktop();

  return (
    <div>
      <h1>Zephyr Consulting</h1>
      <p>Platform: {desktop ? `Desktop (${desktop.platform})` : "Web"}</p>
      <p>
        API status: {ping.isLoading ? "Loading..." : ping.isError ? "Unavailable" : ping.data?.message}
      </p>
    </div>
  );
}

export default Index;

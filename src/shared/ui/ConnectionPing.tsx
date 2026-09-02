import type { ReactElement } from "react";
import { useConnectionStatus, type ConnectionStatus } from "../lib/connectionStatus";

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  checking: "Checking connection...",
  online: "Connected",
  offline: "No connection",
};

/** Fixed top-right dot that pings a same-origin asset on an interval to confirm the kiosk is actually reachable. */
export function ConnectionPing(): ReactElement {
  const status = useConnectionStatus();

  return (
    <div className={`connection-ping connection-ping-${status}`} title={STATUS_LABEL[status]} aria-hidden="true">
      <span className="connection-ping-dot" />
    </div>
  );
}

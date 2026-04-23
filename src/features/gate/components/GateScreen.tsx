import type { FormEvent, ReactElement } from "react";
import { useState } from "react";

interface GateScreenProps {
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (locationCode: string, password: string) => Promise<void>;
}

export function GateScreen({ isSubmitting, error, onSubmit }: GateScreenProps): ReactElement {
  const [locationCode, setLocationCode] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    await onSubmit(locationCode, password);
  };

  return (
    <div className="gate-screen">
      <div className="gate-card" role="dialog" aria-modal="true" aria-labelledby="gate-title">
        <h1 id="gate-title" className="gate-title">
          Panel access
        </h1>
        <p className="gate-subtitle">Enter the access password and location code to continue.</p>
        <form className="gate-form" noValidate onSubmit={handleSubmit}>
          {error && (
            <p className="gate-error" role="alert">
              {error}
            </p>
          )}
          <label className="gate-label" htmlFor="gate-location">
            Location code
          </label>
          <input
            id="gate-location"
            type="text"
            className="gate-input"
            autoComplete="off"
            required
            value={locationCode}
            onChange={(event) => setLocationCode(event.target.value)}
          />
          <label className="gate-label" htmlFor="gate-password">
            Password
          </label>
          <input
            id="gate-password"
            type="password"
            className="gate-input"
            autoComplete="off"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button type="submit" className="gate-submit" disabled={isSubmitting}>
            {isSubmitting ? "Checking..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

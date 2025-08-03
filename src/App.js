import React, { useState } from "react";
import "./styles.css";

export default function App() {
  // Setup type: 'multi' = One vault per card, 'single' = One vault for all cards
  const [setupType, setSetupType] = useState("single");

  // Example data
  const [mainChecking, setMainChecking] = useState(2187.04);

  // Card and vault balances for demo
  const cards = [
    {
      name: "Wells Fargo Cash Back",
      balance: 898.77,
      vault: 898.77,
      vaultAcct: "WF 0374"
    },
    {
      name: "United Mileage Plus",
      balance: 452.60,
      vault: 452.60,
      vaultAcct: "WF 7231"
    }
  ];

  // For 'single' setup: one vault for all cards
  const totalCardBalance = cards.reduce((sum, c) => sum + c.balance, 0);
  const totalVaulted = setupType === "single"
    ? cards.reduce((sum, c) => sum + c.vault, 0)
    : null; // handled below for 'multi'

  // For 'multi' setup: sum each card's vault for total
  const multiVaulted = cards.reduce((sum, c) => sum + c.vault, 0);

  // Display helper
  const difference =
    setupType === "single"
      ? (totalVaulted - totalCardBalance).toFixed(2)
      : (multiVaulted - totalCardBalance).toFixed(2);

  // UI
  return (
    <div className="container">
      <h2>Dashboard</h2>
      <div className="card">
        <label className="setup-label">
          <span>Choose your vault setup:</span>
          <select
            value={setupType}
            onChange={e => setSetupType(e.target.value)}
            className="setup-select"
          >
            <option value="single">One Vault for All Cards</option>
            <option value="multi">One Vault per Credit Card</option>
          </select>
        </label>
      </div>

      <div className="card">
        <h3>Main Checking Account</h3>
        <div className="account-row">
          <span>Balance:</span>
          <span>${mainChecking.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
        </div>
      </div>

      {/* For MULTI-VAULT setup */}
      {setupType === "multi" &&
        cards.map((c, idx) => (
          <div className="card" key={c.name}>
            <h3>{c.name}</h3>
            <div className="account-row">
              <span>Card Balance:</span>
              <span>${c.balance.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
            </div>
            <div className="account-row">
              <span>Vault Account ({c.vaultAcct}):</span>
              <span>${c.vault.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
            </div>
          </div>
        ))
      }

      {/* For SINGLE-VAULT setup */}
      {setupType === "single" && (
        <>
          {cards.map((c) => (
            <div className="card" key={c.name}>
              <h3>{c.name}</h3>
              <div className="account-row">
                <span>Card Balance:</span>
                <span>${c.balance.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
              </div>
            </div>
          ))}
          <div className="card">
            <h3>Vault Account (WF 0374)</h3>
            <div className="account-row">
              <span>Balance:</span>
              <span>${totalVaulted.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
            </div>
          </div>
        </>
      )}

      {/* Totals & Status */}
      <div className="card highlight">
        <div className="account-row">
          <strong>Total Credit Card Balances:</strong>
          <span>${totalCardBalance.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
        </div>
        <div className="account-row">
          <strong>Total Vaulted Amount:</strong>
          <span>
            $
            {(setupType === "single" ? totalVaulted : multiVaulted).toLocaleString(undefined, {minimumFractionDigits:2})}
          </span>
        </div>
        <div className="account-row">
          <strong>Difference:</strong>
          <span style={{ color: difference === "0.00" ? "#17a500" : "#d32f2f" }}>
            ${difference}
            {difference === "0.00" ? " ✅" : " ⚠️"}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="actions-row">
        <button>Transfer Now</button>
        <button>Schedule Payment</button>
        <button>View Transactions</button>
      </div>
    </div>
  );
}

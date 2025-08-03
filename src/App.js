import React, { useState } from "react";
import "./styles.css";

export default function App() {
  const [vaultBalance, setVaultBalance] = useState(735.0);
  const [transactions, setTransactions] = useState([
    { id: 1, merchant: "Uber", amount: 16.43 },
    { id: 2, merchant: "Grocery Store", amount: 82.1 },
  ]);

  const simulateTransfer = (amount) => {
    setVaultBalance((prev) => prev + amount);
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Dashboard</h2>
        <p>Credit Card Balance: $732.00</p>
        <p>Vault Balance: ${vaultBalance.toFixed(2)}</p>
        <p className="success">✅ You’re on track to pay</p>
      </div>

      <div className="card">
        <h3>Recent Transactions</h3>
        {transactions.map((tx) => (
          <div className="row" key={tx.id}>
            <span>{tx.merchant}</span>
            <span>${tx.amount.toFixed(2)}</span>
            <button onClick={() => simulateTransfer(tx.amount)}>
              Simulate Vault Transfer
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Transfer Settings</h3>
        <p>Auto Transfer: <span className="success">Enabled</span></p>
        <p>Buffer: $50</p>
        <p>Round Up: Off</p>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import "./styles.css";

/**
 * MVP 1 – Manual mode (no bank link required)
 * - Add cards by nickname
 * - Add purchases manually (amount, date, note, pick card)
 * - Show per-card "Untransferred" (Pending) items with [Clear]
 * - Keep a running total of pending per card and all cards
 * - Optional manual "Main Checking" balance entry (display only)
 * - LocalStorage persistence
 */

const STORAGE_KEY = "vaultswipe_mvp1";

export default function App() {
  // -------- State --------
  const [checkingBalance, setCheckingBalance] = useState(0);
  const [cards, setCards] = useState([
    // Example starter cards; feel free to clear after first run
    { id: "c1", name: "Wells Fargo Cash Back", color: "#0F766E" },
    { id: "c2", name: "United Mileage Plus", color: "#1D4ED8" },
  ]);

  const [txns, setTxns] = useState([
    // Sample seed data (you can remove)
    {
      id: "t1",
      cardId: "c1",
      date: "2025-07-30",
      merchant: "Starbucks",
      amount: 12.57,
      note: "",
      cleared: false,
    },
    {
      id: "t2",
      cardId: "c1",
      date: "2025-07-29",
      merchant: "Amazon",
      amount: 40.0,
      note: "Waiting for refund",
      cleared: false,
    },
    {
      id: "t3",
      cardId: "c2",
      date: "2025-07-28",
      merchant: "Lyft",
      amount: 18.4,
      note: "",
      cleared: false,
    },
  ]);

  // -------- Persistence (localStorage) --------
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.checkingBalance != null) setCheckingBalance(parsed.checkingBalance);
      if (Array.isArray(parsed.cards)) setCards(parsed.cards);
      if (Array.isArray(parsed.txns)) setTxns(parsed.txns);
    } catch (_) {}
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ checkingBalance, cards, txns })
    );
  }, [checkingBalance, cards, txns]);

  // -------- Derived totals --------
  const pendingByCard = useMemo(() => {
    const map = {};
    cards.forEach((c) => (map[c.id] = 0));
    txns.forEach((t) => {
      if (!t.cleared) map[t.cardId] = (map[t.cardId] || 0) + Number(t.amount || 0);
    });
    return map;
  }, [cards, txns]);

  const totalPending = useMemo(
    () => Object.values(pendingByCard).reduce((a, b) => a + b, 0),
    [pendingByCard]
  );

  // -------- Handlers --------
  const addCard = (name, color) => {
    const id = "c_" + Math.random().toString(36).slice(2);
    setCards([...cards, { id, name, color: color || pickColor() }]);
  };

  const deleteCard = (cardId) => {
    // Also remove txns tied to the card
    setCards(cards.filter((c) => c.id !== cardId));
    setTxns(txns.filter((t) => t.cardId !== cardId));
  };

  const addTxn = (payload) => {
    const id = "t_" + Math.random().toString(36).slice(2);
    setTxns([
      ...txns,
      {
        id,
        cardId: payload.cardId,
        date: payload.date || new Date().toISOString().slice(0, 10),
        merchant: payload.merchant || "",
        amount: Number(payload.amount || 0),
        note: payload.note || "",
        cleared: false,
      },
    ]);
  };

  const toggleCleared = (txnId) => {
    setTxns(
      txns.map((t) => (t.id === txnId ? { ...t, cleared: !t.cleared } : t))
    );
  };

  const updateTxnNote = (txnId, note) => {
    setTxns(txns.map((t) => (t.id === txnId ? { ...t, note } : t)));
  };

  // -------- UI helpers --------
  function pickColor() {
    const palette = ["#0F766E", "#1D4ED8", "#9333EA", "#B45309", "#065F46"];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  // Simple reminder banner if anything pending
  const [hideReminder, setHideReminder] = useState(false);
  const showReminder = totalPending > 0 && !hideReminder;

  return (
    <div className="container">
      <Header />

      {/* Reminder banner */}
      {showReminder && (
        <div className="banner">
          <div>
            You have <strong>${totalPending.toFixed(2)}</strong> in pending
            manual transfers across your cards.
          </div>
          <button className="linkish" onClick={() => setHideReminder(true)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Checking balance (manual entry) */}
      <div className="card">
        <h3>Main Checking Account</h3>
        <div className="account-row">
          <span>Available Balance</span>
          <span>${Number(checkingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="row mt8">
          <input
            type="number"
            step="0.01"
            placeholder="Enter balance e.g. 2187.04"
            value={checkingBalance}
            onChange={(e) => setCheckingBalance(e.target.value)}
          />
          <button onClick={() => { /* value already stored via state/localStorage */ }}>
            Save
          </button>
        </div>
        <div className="hint">Tip: In later versions, you can link this to show the real-time balance.</div>
      </div>

      {/* Add card */}
      <AddCardForm onAdd={addCard} />

      {/* Add transaction */}
      <AddTxnForm cards={cards} onAdd={addTxn} />

      {/* Cards + pending items */}
      {cards.length === 0 ? (
        <div className="card">
          <em>Add your first card to get started.</em>
        </div>
      ) : (
        cards.map((c) => (
          <CardBlock
            key={c.id}
            card={c}
            txns={txns.filter((t) => t.cardId === c.id)}
            pendingTotal={pendingByCard[c.id] || 0}
            onToggleCleared={toggleCleared}
            onUpdateNote={updateTxnNote}
            onDeleteCard={() => deleteCard(c.id)}
          />
        ))
      )}

      {/* Footer totals */}
      <div className="card highlight">
        <div className="account-row">
          <strong>Total Pending Across All Cards:</strong>
          <span>${totalPending.toFixed(2)}</span>
        </div>
        <div className="hint">Clear items after you’ve made manual transfers in your bank.</div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="topbar">
      <h2>VaultSwipe — Manual Mode (MVP 1)</h2>
      <div className="subtle">Track purchases, mark them cleared after you move money.</div>
    </div>
  );
}

function AddCardForm({ onAdd }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("");

  return (
    <div className="card">
      <h3>Add Card</h3>
      <div className="row">
        <input
          placeholder="Card nickname (e.g., WF Cashback)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="Optional color hex (e.g., #0F766E)"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <button
          onClick={() => {
            if (!name.trim()) return;
            onAdd(name.trim(), color.trim() || undefined);
            setName("");
            setColor("");
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function AddTxnForm({ cards, onAdd }) {
  const [cardId, setCardId] = useState(cards[0]?.id || "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    // Keep selected card valid if cards list changes
    if (cards.length && !cards.find((c) => c.id === cardId)) {
      setCardId(cards[0].id);
    }
  }, [cards, cardId]);

  return (
    <div className="card">
      <h3>Add Purchase (Manual)</h3>
      {cards.length === 0 ? (
        <div className="hint">Add a card first.</div>
      ) : (
        <>
          <div className="row wrap">
            <label className="field">
              <span className="lbl">Card</span>
              <select value={cardId} onChange={(e) => setCardId(e.target.value)}>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="lbl">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="field flex1">
              <span className="lbl">Merchant</span>
              <input
                placeholder="Where did you spend?"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="lbl">Amount</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
          </div>
          <div className="row">
            <input
              className="flex1"
              placeholder="Optional note…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              onClick={() => {
                if (!cardId || !amount) return;
                onAdd({ cardId, date, merchant, amount, note });
                setMerchant("");
                setAmount("");
                setNote("");
              }}
            >
              Add Purchase
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function CardBlock({ card, txns, pendingTotal, onToggleCleared, onUpdateNote, onDeleteCard }) {
  const pending = txns.filter((t) => !t.cleared);
  const cleared = txns.filter((t) => t.cleared);

  return (
    <div className="card">
      <div className="card-header" style={{ borderLeft: `6px solid ${card.color}` }}>
        <h3>{card.name}</h3>
        <button className="danger-outline" onClick={onDeleteCard}>Delete Card</button>
      </div>

      <div className="account-row">
        <strong>Total Untransferred (Pending):</strong>
        <span>${pendingTotal.toFixed(2)}</span>
      </div>

      <Section title="Pending">
        {pending.length === 0 ? (
          <div className="muted">No pending items.</div>
        ) : (
          pending.map((t) => (
            <TxnRow key={t.id} txn={t} onToggleCleared={() => onToggleCleared(t.id)} onUpdateNote={onUpdateNote} />
          ))
        )}
      </Section>

      <Section title="Cleared">
        {cleared.length === 0 ? (
          <div className="muted">Nothing cleared yet.</div>
        ) : (
          cleared.map((t) => (
            <TxnRow key={t.id} txn={t} cleared onToggleCleared={() => onToggleCleared(t.id)} onUpdateNote={onUpdateNote} />
          ))
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="section">
      <div className="section-title">{title}</div>
      {children}
    </div>
  );
}

function TxnRow({ txn, cleared, onToggleCleared, onUpdateNote }) {
  const [editing, setEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState(txn.note || "");

  return (
    <div className={`txn-row ${cleared ? "cleared" : ""}`}>
      <div className="txn-main">
        <div className="txn-top">
          <div className="txn-merchant">{txn.merchant || "—"}</div>
          <div className="txn-amount">${Number(txn.amount).toFixed(2)}</div>
        </div>
        <div className="txn-meta">
          <span className="muted">{txn.date}</span>
          {txn.note && !editing && <span className="note-pill">{txn.note}</span>}
        </div>
      </div>

      <div className="txn-actions">
        <button className={cleared ? "secondary" : ""} onClick={onToggleCleared}>
          {cleared ? "Unclear" : "Clear"}
        </button>
        <button className="secondary" onClick={() => setEditing((v) => !v)}>
          {editing ? "Cancel" : "Add Note"}
        </button>
      </div>

      {editing && (
        <div className="row mt8">
          <input
            className="flex1"
            placeholder="Add a note (e.g., refund pending, verify charge)"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
          />
          <button
            onClick={() => {
              onUpdateNote(txn.id, noteDraft);
              setEditing(false);
            }}
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}

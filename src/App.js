import React, { useEffect, useMemo, useState } from "react";
import "./styles.css";

const STORAGE_KEY = "vaultswipe_mvp1";

export default function App() {
  const [checkingBalance, setCheckingBalance] = useState(0);
  const [cards, setCards] = useState([
    { id: "c1", name: "Wells Fargo Cash Back", color: "#2563EB" },
    { id: "c2", name: "United Mileage Plus", color: "#7C3AED" },
  ]);
  const [txns, setTxns] = useState([
    { id: "t1", cardId: "c1", date: "2025-07-30", merchant: "Starbucks", amount: 12.57, note: "", cleared: false },
    { id: "t2", cardId: "c1", date: "2025-07-29", merchant: "Amazon", amount: 40.0, note: "Waiting for refund", cleared: false },
    { id: "t3", cardId: "c2", date: "2025-07-28", merchant: "Lyft", amount: 18.4, note: "", cleared: false },
  ]);

  // UI collapsibles
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);

  // Load/save
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.checkingBalance != null) setCheckingBalance(parsed.checkingBalance);
      if (Array.isArray(parsed.cards)) setCards(parsed.cards);
      if (Array.isArray(parsed.txns)) setTxns(parsed.txns);
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ checkingBalance, cards, txns }));
  }, [checkingBalance, cards, txns]);

  // Derived totals
  const pendingByCard = useMemo(() => {
    const map = {};
    cards.forEach((c) => (map[c.id] = 0));
    txns.forEach((t) => {
      if (!t.cleared) map[t.cardId] = (map[t.cardId] || 0) + Number(t.amount || 0);
    });
    return map;
  }, [cards, txns]);
  const totalPending = useMemo(() => Object.values(pendingByCard).reduce((a, b) => a + b, 0), [pendingByCard]);

  // Actions
  const addCard = (name, color) => {
    const id = "c_" + Math.random().toString(36).slice(2);
    setCards([...cards, { id, name, color: color || pickColor() }]);
  };
  const deleteCard = (cardId) => {
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
    setTxns(txns.map((t) => (t.id === txnId ? { ...t, cleared: !t.cleared } : t)));
  };
  const updateTxnNote = (txnId, note) => {
    setTxns(txns.map((t) => (t.id === txnId ? { ...t, note } : t)));
  };

  function pickColor() {
    const palette = ["#2563EB", "#7C3AED", "#0EA5E9", "#10B981", "#F59E0B"];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  const [hideReminder, setHideReminder] = useState(false);
  const showReminder = totalPending > 0 && !hideReminder;

  return (
    <div className="container">
      <div className="topbar">
        <h2>VaultSwipe — Manual Mode</h2>
        <div className="subtle">Snapshot first. Add details only when you need them.</div>
      </div>

      {/* Snapshot actions */}
      <div className="toolbar card">
        <div className="toolbar-left">
          <button className="btn" onClick={() => setShowAddTxn((v) => !v)}>
            {showAddTxn ? "Close" : "Add Purchase"}
          </button>
          <button className="btn-outline" onClick={() => setShowAddCard((v) => !v)}>
            {showAddCard ? "Close" : "Add Card"}
          </button>
        </div>
        <div className="toolbar-right">
          <span className="pill">Pending to Transfer: ${totalPending.toFixed(2)}</span>
        </div>
      </div>

      {/* Reminder banner */}
      {showReminder && (
        <div className="banner">
          <div>You have <strong>${totalPending.toFixed(2)}</strong> in pending manual transfers.</div>
          <button className="linkish" onClick={() => setHideReminder(true)}>Dismiss</button>
        </div>
      )}

      {/* Checking (collapsed to a small editor) */}
      <div className="card">
        <h3>Main Checking Account</h3>
        <div className="account-row">
          <span>Available Balance</span>
          <span>${Number(checkingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <details className="details">
          <summary>Edit balance</summary>
          <div className="row mt8">
            <input
              type="number"
              step="0.01"
              placeholder="Enter balance e.g. 2187.04"
              value={checkingBalance}
              onChange={(e) => setCheckingBalance(e.target.value)}
            />
            <button className="btn">Save</button>
          </div>
          <div className="hint">Later: link this for real-time balance.</div>
        </details>
      </div>

      {/* Collapsible: Add Purchase */}
      {showAddTxn && <AddTxnForm cards={cards} onAdd={addTxn} />}

      {/* Collapsible: Add Card */}
      {showAddCard && <AddCardForm onAdd={addCard} />}

      {/* Cards */}
      {cards.length === 0 ? (
        <div className="card">
          <em>Add a card to get started.</em>
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
    </div>
  );
}

function AddCardForm({ onAdd }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("");

  return (
    <div className="card">
      <h3>Add Card</h3>
      <div className="row wrap">
        <input
          placeholder="Card nickname (e.g., WF Cashback)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="Optional color hex (e.g., #2563EB)"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <button
          className="btn"
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
    if (cards.length && !cards.find((c) => c.id === cardId)) {
      setCardId(cards[0].id);
    }
  }, [cards, cardId]);

  return (
    <div className="card">
      <h3>Add Purchase</h3>
      {cards.length === 0 ? (
        <div className="hint">Add a card first.</div>
      ) : (
        <>
          <div className="row wrap">
            <label className="field">
              <span className="lbl">Card</span>
              <select value={cardId} onChange={(e) => setCardId(e.target.value)}>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="lbl">Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
              className="btn"
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
        <button className="btn-danger-outline" onClick={onDeleteCard}>Delete Card</button>
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
            <TxnRow
              key={t.id}
              txn={t}
              onToggleCleared={() => onToggleCleared(t.id)}
              onUpdateNote={onUpdateNote}
            />
          ))
        )}
      </Section>

      <details className="details">
        <summary>Cleared</summary>
        <Section>
          {cleared.length === 0 ? (
            <div className="muted">Nothing cleared yet.</div>
          ) : (
            cleared.map((t) => (
              <TxnRow
                key={t.id}
                txn={t}
                cleared
                onToggleCleared={() => onToggleCleared(t.id)}
                onUpdateNote={onUpdateNote}
              />
            ))
          )}
        </Section>
      </details>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="section">
      {title && <div className="section-title">{title}</div>}
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
        <button className="btn-outline" onClick={onToggleCleared}>
          {cleared ? "Unclear" : "Clear"}
        </button>
        <button className="btn-ghost" onClick={() => setEditing((v) => !v)}>
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
            className="btn"
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

import React, { useEffect, useMemo, useState, useCallback } from "react";
import "./styles.css";

const STORAGE_KEY = "vaultswipe_mvp1";

/**
 * MVP 1 – Manual Mode
 * - Add cards by nickname (collapsed "Add Card" control above list)
 * - Per-card "Add Transaction" (compact inline form)
 * - Transactions are compact (two lines) with Clear/Note
 * - Edit card via card icon; Delete moved to far right
 * - LocalStorage persistence; no bank linking required
 */

export default function App() {
  // ---------- State ----------
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

  // Collapsible controls
  const [showEditChecking, setShowEditChecking] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);

  // ---------- Persistence ----------
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

  // ---------- Derived totals ----------
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

  // ---------- Actions ----------
  const addCard = useCallback((name, color) => {
    const id = "c_" + Math.random().toString(36).slice(2);
    setCards((prev) => [...prev, { id, name, color: color || pickColor() }]);
  }, []);

  const renameCard = useCallback((cardId, newName) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, name: newName } : c)));
  }, []);

  const recolorCard = useCallback((cardId, newColor) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, color: newColor } : c)));
  }, []);

  const deleteCard = useCallback((cardId) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setTxns((prev) => prev.filter((t) => t.cardId !== cardId));
  }, []);

  const addTxn = useCallback((payload) => {
    const id = "t_" + Math.random().toString(36).slice(2);
    setTxns((prev) => [
      ...prev,
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
  }, []);

  const toggleCleared = useCallback((txnId) => {
    setTxns((prev) => prev.map((t) => (t.id === txnId ? { ...t, cleared: !t.cleared } : t)));
  }, []);

  const updateTxnNote = useCallback((txnId, note) => {
    setTxns((prev) => prev.map((t) => (t.id === txnId ? { ...t, note } : t)));
  }, []);

  // ---------- UI helpers ----------
  const [hideReminder, setHideReminder] = useState(false);
  const showReminder = totalPending > 0 && !hideReminder;

  function pickColor() {
    const palette = ["#2563EB", "#7C3AED", "#0EA5E9", "#10B981", "#F59E0B"];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  return (
    <div className="container">
      <div className="topbar">
        <h2>VaultSwipe — Manual Mode</h2>
        <div className="subtle">Snapshot first. Add details only when needed.</div>
      </div>

      {/* Snapshot card */}
      <div className="card toolbar">
        <div className="toolbar-left">
          <span className="pill">Pending to Transfer: ${totalPending.toFixed(2)}</span>
        </div>
        <div className="toolbar-right" />
      </div>

      {/* Reminder banner */}
      {showReminder && (
        <div className="banner">
          <div>You have <strong>${totalPending.toFixed(2)}</strong> in pending manual transfers.</div>
          <button className="linkish" onClick={() => setHideReminder(true)}>Dismiss</button>
        </div>
      )}

      {/* Checking balance (collapsed editor) */}
      <div className="card">
        <h3>Main Checking Account</h3>
        <div className="account-row">
          <span>Available Balance</span>
          <span>${Number(checkingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <button className="btn-outline mt8" onClick={() => setShowEditChecking((v) => !v)}>
          {showEditChecking ? "Close" : "Edit balance"}
        </button>
        {showEditChecking && (
          <div className="row mt8 wrap">
            <input
              type="number"
              step="0.01"
              placeholder="Enter balance e.g. 2187.04"
              value={checkingBalance}
              onChange={(e) => setCheckingBalance(e.target.value)}
            />
            <button className="btn">Save</button>
          </div>
        )}
        <div className="hint">Later: link this for real-time balance.</div>
      </div>

      {/* Add Card control (collapsed) */}
      <div className="card">
        <div className="card-header">
          <h3>Add Card</h3>
          <button className="btn" onClick={() => setShowAddCard((v) => !v)}>
            {showAddCard ? "Close" : "Add Card"}
          </button>
        </div>
        {showAddCard && <AddCardForm onAdd={(name, color) => { addCard(name, color); setShowAddCard(false); }} />}
      </div>

      {/* Cards list */}
      {cards.length === 0 ? (
        <div className="card"><em>Add a card to get started.</em></div>
      ) : (
        cards.map((c) => (
          <CardBlock
            key={c.id}
            card={c}
            txns={txns.filter((t) => t.cardId === c.id)}
            pendingTotal={pendingByCard[c.id] || 0}
            onAddTxn={addTxn}
            onToggleCleared={toggleCleared}
            onUpdateNote={updateTxnNote}
            onRename={renameCard}
            onRecolor={recolorCard}
            onDeleteCard={() => deleteCard(c.id)}
          />
        ))
      )}
    </div>
  );
}

/* ---------- Components ---------- */

function AddCardForm({ onAdd }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("");

  return (
    <div className="row wrap">
      <input
        className="flex1"
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
        Save Card
      </button>
    </div>
  );
}

function CardBlock({
  card,
  txns,
  pendingTotal,
  onAddTxn,
  onToggleCleared,
  onUpdateNote,
  onRename,
  onRecolor,
  onDeleteCard,
}) {
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const pending = txns.filter((t) => !t.cleared);
  const cleared = txns.filter((t) => t.cleared);

  return (
    <div className="card">
      <div className="card-header cc-header" style={{ borderLeft: `6px solid ${card.color}` }}>
        <div className="cc-title">
          <button className="icon-btn" aria-label="Edit card" onClick={() => setShowEdit((v) => !v)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
              <rect x="3" y="8" width="18" height="3" fill="currentColor"/>
            </svg>
          </button>
          <h3>{card.name}</h3>
        </div>
        <div className="cc-actions">
          <button className="btn" onClick={() => setShowAddTxn((v) => !v)}>
            {showAddTxn ? "Close" : "Add Transaction"}
          </button>
          <button className="btn-danger-outline" onClick={onDeleteCard}>Delete</button>
        </div>
      </div>

      {showEdit && (
        <div className="cc-edit">
          <div className="row wrap">
            <label className="field flex1">
              <span className="lbl">Card name</span>
              <input
                defaultValue={card.name}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== card.name) onRename(card.id, v);
                }}
              />
            </label>
            <label className="field">
              <span className="lbl">Color</span>
              <input
                defaultValue={card.color}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== card.color) onRecolor(card.id, v);
                }}
              />
            </label>
          </div>
        </div>
      )}

      {showAddTxn && (
        <div className="cc-add-txn">
          <InlineAddTxn
            cardId={card.id}
            onAdd={(payload) => {
              onAddTxn(payload);
            }}
          />
        </div>
      )}

      <div className="account-row">
        <strong>Untransferred (Pending):</strong>
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

function InlineAddTxn({ cardId, onAdd }) {
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="row wrap">
      <input
        className="flex1"
        placeholder="Merchant"
        value={merchant}
        onChange={(e) => setMerchant(e.target.value)}
      />
      <input
        type="number"
        step="0.01"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <input
        className="flex1"
        placeholder="Optional note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button
        className="btn"
        onClick={() => {
          if (!amount) return;
          onAdd({
            cardId,
            date: new Date().toISOString().slice(0, 10),
            merchant,
            amount,
            note,
          });
          setMerchant("");
          setAmount("");
          setNote("");
        }}
      >
        Add
      </button>
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
    <div className={`txn-row compact ${cleared ? "cleared" : ""}`}>
      <div className="txn-line1">
        <div className="txn-merchant">{txn.merchant || "—"}</div>
        <div className="txn-amount">${Number(txn.amount).toFixed(2)}</div>
      </div>

      <div className="txn-line2">
        <div className="txn-meta-left">
          <span className="muted">{txn.date}</span>
          {txn.note && !editing && <span className="note-pill">{txn.note}</span>}
        </div>
        <div className="txn-actions">
          <button className="btn-outline" onClick={onToggleCleared}>
            {cleared ? "Unclear" : "Clear"}
          </button>
          <button className="btn-ghost" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "Note"}
          </button>
        </div>
      </div>

      {editing && (
        <div className="txn-note-editor">
          <input
            className="flex1"
            placeholder="Add a note (refund pending, verify charge)"
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

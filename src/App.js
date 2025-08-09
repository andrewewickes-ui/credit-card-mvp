import React, { useEffect, useMemo, useState, useCallback } from "react";
import "./styles.css";

const STORAGE_KEY = "vaultswipe_mvp1";

/**
 * MVP 1 – Manual Mode (with Due Dates)
 * - Add cards with nickname, color, and monthly due day (1–31)
 * - Card header shows big Untransferred total + compact Add button
 * - Shows "Due: 15th (in 3 days)" under card name; highlights if due soon
 * - Edit panel: rename, recolor, change due day (Delete to live here later)
 * - Compact two-line transactions, Clear/Note aligned
 * - LocalStorage persistence
 */

export default function App() {
  // ---------- State ----------
  const [checkingBalance, setCheckingBalance] = useState(0);

  const [cards, setCards] = useState([
    { id: "c1", name: "Wells Fargo Cash Back", color: "#2563EB", dueDay: 15 },
    { id: "c2", name: "United Mileage Plus", color: "#7C3AED", dueDay: 7 },
  ]);

  const [txns, setTxns] = useState([
    { id: "t1", cardId: "c1", date: "2025-07-30", merchant: "Starbucks", amount: 12.57, note: "", cleared: false },
    { id: "t2", cardId: "c1", date: "2025-07-29", merchant: "Amazon", amount: 40.0, note: "Waiting for refund", cleared: false },
    { id: "t3", cardId: "c2", date: "2025-07-28", merchant: "Lyft", amount: 18.4, note: "", cleared: false },
  ]);

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
  const addCard = useCallback((name, color, dueDay) => {
    const id = "c_" + Math.random().toString(36).slice(2);
    const dd = sanitizeDueDay(dueDay);
    setCards((prev) => [...prev, { id, name, color: color || pickColor(), dueDay: dd }]);
  }, []);

  const renameCard = useCallback((cardId, newName) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, name: newName } : c)));
  }, []);

  const recolorCard = useCallback((cardId, newColor) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, color: newColor } : c)));
  }, []);

  const changeDueDay = useCallback((cardId, dueDay) => {
    const dd = sanitizeDueDay(dueDay);
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, dueDay: dd } : c)));
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

  function sanitizeDueDay(d) {
    const n = Number(d);
    if (!Number.isFinite(n)) return 1;
    return Math.min(31, Math.max(1, Math.round(n)));
  }

  function ordinal(n) {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function daysUntilNextDue(dueDay) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const candidate = new Date(y, m, Math.min(dueDay, daysInMonth(y, m)));
    let target = candidate;
    if (candidate < stripTime(now)) {
      const m2 = m === 11 ? 0 : m + 1;
      const y2 = m === 11 ? y + 1 : y;
      target = new Date(y2, m2, Math.min(dueDay, daysInMonth(y2, m2)));
    }
    return Math.round((stripTime(target) - stripTime(now)) / 86400000);
  }

  function stripTime(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function daysInMonth(y, m) {
    return new Date(y, m + 1, 0).getDate();
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

      {/* Reminder */}
      {showReminder && (
        <div className="banner">
          <div>You have <strong>${totalPending.toFixed(2)}</strong> in pending manual transfers.</div>
          <button className="linkish" onClick={() => setHideReminder(true)}>Dismiss</button>
        </div>
      )}

      {/* Checking (compact inline editor to the right) */}
      <div className="card">
        <div className="row-inline">
          <div className="inline-left">
            <h3>Main Checking Account</h3>
            <div className="muted">Available Balance</div>
          </div>
          <div className="inline-right">
            {!showEditChecking ? (
              <>
                <div className="amt-inline">
                  ${Number(checkingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <button className="btn-outline btn-xs" onClick={() => setShowEditChecking(true)}>Edit</button>
              </>
            ) : (
              <div className="inline-edit">
                <input
                  className="input-sm"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={checkingBalance}
                  onChange={(e) => setCheckingBalance(e.target.value)}
                />
                <button className="btn btn-xs" onClick={() => setShowEditChecking(false)}>Save</button>
              </div>
            )}
          </div>
        </div>
        <div className="hint">Later: link this for real-time balance.</div>
      </div>

      {/* Add Card (aligned actions column) */}
      <div className="card">
        <div className="row-header">
          <div className="title-col">
            <h3>Add Card</h3>
          </div>
            <div className="actions-col">
              <button className="btn btn-sm" onClick={() => setShowAddCard((v) => !v)}>
                {showAddCard ? "Close" : "Add"}
              </button>
            </div>
        </div>
        {showAddCard && (
          <AddCardForm
            onAdd={(name, color, dueDay) => {
              addCard(name, color, dueDay);
              setShowAddCard(false);
            }}
          />
        )}
      </div>

      {/* Cards */}
      {cards.length === 0 ? (
        <div className="card"><em>Add a card to get started.</em></div>
      ) : (
        cards.map((c) => {
          const dueIn = daysUntilNextDue(c.dueDay || 1);
          const dueText = `Due: ${ordinal(c.dueDay || 1)}${Number.isFinite(dueIn) ? ` (in ${dueIn} day${dueIn === 1 ? "" : "s"})` : ""}`;
          const dueSoon = dueIn <= 5;
          return (
            <CardBlock
              key={c.id}
              card={c}
              dueText={dueText}
              dueSoon={dueSoon}
              txns={txns.filter((t) => t.cardId === c.id)}
              pendingTotal={pendingByCard[c.id] || 0}
              onAddTxn={addTxn}
              onToggleCleared={toggleCleared}
              onUpdateNote={updateTxnNote}
              onRename={renameCard}
              onRecolor={recolorCard}
              onChangeDueDay={changeDueDay}
            />
          );
        })
      )}
    </div>
  );
}

/* ---------- Components ---------- */

function AddCardForm({ onAdd }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [dueDay, setDueDay] = useState("");

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
      <input
        className="input-sm"
        type="number"
        min="1"
        max="31"
        placeholder="Due day (1–31)"
        value={dueDay}
        onChange={(e) => setDueDay(e.target.value)}
      />
      <button
        className="btn btn-sm"
        onClick={() => {
          if (!name.trim()) return;
          const dd = dueDay ? Number(dueDay) : 1;
          onAdd(name.trim(), color.trim() || undefined, dd);
          setName(""); setColor(""); setDueDay("");
        }}
      >
        Save
      </button>
    </div>
  );
}

function CardBlock({
  card,
  dueText,
  dueSoon,
  txns,
  pendingTotal,
  onAddTxn,
  onToggleCleared,
  onUpdateNote,
  onRename,
  onRecolor,
  onChangeDueDay,
}) {
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const pending = txns.filter((t) => !t.cleared);
  const cleared = txns.filter((t) => t.cleared);

  return (
    <div className="card">
      <div className="row-header" style={{ borderLeft: `6px solid ${card.color}` }}>
        <div className="title-col">
          <button
            className="icon-btn"
            aria-label="Edit card"
            title="Edit card"
            onClick={() => setShowEdit((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
              <rect x="3" y="8" width="18" height="3" fill="currentColor"/>
            </svg>
          </button>
          <div className="title-stack">
            <h3 className="truncate">{card.name}</h3>
            <div className={`due-line ${dueSoon ? "due-soon" : ""}`}>{dueText}</div>
          </div>
        </div>
        <div className="actions-col actions-col--tight">
          <div className="amt-large" title="Untransferred amount">
            ${pendingTotal.toFixed(2)}
          </div>
          <button
            className="btn-outline btn-sm"
            onClick={() => setShowAddTxn((v) => !v)}
            title="Add transaction"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Add
          </button>
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
            <label className="field" style={{ maxWidth: 160 }}>
              <span className="lbl">Payment due day (1–31)</span>
              <input
                type="number"
                min="1"
                max="31"
                defaultValue={card.dueDay || 1}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v) onChangeDueDay(card.id, Number(v));
                }}
              />
            </label>
          </div>
          <div className="hint">Destructive actions like Delete will live here later.</div>
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

      {/* List transactions */}
      {pending.length === 0 ? (
        <div className="muted">No untransferred items.</div>
      ) : (
        pending.map((t) => (
          <TxnRow
            key={t.id}
            txn={t}
            onToggleCleared={() => onToggleCleared(t.id)}
            onUpdateNote={(note) => onUpdateNote(t.id, note)}
          />
        ))
      )}

      <details className="details">
        <summary>Cleared</summary>
        <div className="section">
          {cleared.length === 0 ? (
            <div className="muted">Nothing cleared yet.</div>
          ) : (
            cleared.map((t) => (
              <TxnRow
                key={t.id}
                txn={t}
                cleared
                onToggleCleared={() => onToggleCleared(t.id)}
                onUpdateNote={(note) => onUpdateNote(t.id, note)}
              />
            ))
          )}
        </div>
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
        className="btn btn-sm"
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

function TxnRow({ txn, cleared, onToggleCleared, onUpdateNote }) {
  const [editing, setEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState(txn.note || "");

  return (
    <div className={`txn-row compact ${cleared ? "cleared" : ""}`}>
      <div className="txn-line1">
        <div className="txn-merchant">{txn.merchant || "—"}</div>
        <div className="txn-amount">${Number(txn.amount).toFixed(2)}</div>
      </div>

      {/* Fixed-height second line so actions align, note or not */}
      <div className="txn-line2">
        <div className="txn-meta-left">
          <span className="muted">{txn.date}</span>
          {txn.note && !editing ? (
            <span className="note-pill">{txn.note}</span>
          ) : (
            <span className="note-placeholder" />
          )}
        </div>
        <div className="txn-actions">
          <button className="btn-outline btn-sm" onClick={onToggleCleared}>
            {cleared ? "Unclear" : "Clear"}
          </button>
          <button className="btn-ghost btn-sm" onClick={() => setEditing((v) => !v)}>
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
            className="btn btn-sm"
            onClick={() => {
              onUpdateNote(noteDraft);
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

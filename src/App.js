import React, { useEffect, useMemo, useState, useCallback } from "react";
import "./styles.css";

const STORAGE_KEY = "vaultswipe_mvp4";

/**
 * Manual MVP with:
 * - Main Checking at top
 * - A centered "Transfer" button that opens a dialog for Main <-> Vault transfers (swap direction)
 * - Two-column snapshot: Vault Account | Total Card Balances (sum of UNCLEARED txns)
 * - "Difference" = Total Card Balances - Vault Account (never negative)
 * - Card blocks with: View Transactions, Add Transaction (collapsible), Edit
 * - Transaction actions order: Vault | Note | Clear
 * - Add Card is collapsible under the cards
 */

export default function App() {
  // ---------- State ----------
  const [checkingBalance, setCheckingBalance] = useState(2187.04);
  const [vaultBalance, setVaultBalance] = useState(0);

  const [cards, setCards] = useState([
    { id: "c1", name: "Wells Fargo Cash Back", color: "#2563EB", dueDay: 15 },
    { id: "c2", name: "United Mileage Plus", color: "#7C3AED", dueDay: 7 }
  ]);

  const [txns, setTxns] = useState([
    { id: "t1", cardId: "c1", date: "2025-08-01", merchant: "Starbucks", amount: 12.57, note: "", cleared: false },
    { id: "t2", cardId: "c1", date: "2025-07-30", merchant: "Amazon", amount: 40.00, note: "Waiting refund", cleared: false },
    { id: "t3", cardId: "c2", date: "2025-07-28", merchant: "Lyft", amount: 18.40, note: "", cleared: false }
  ]);

  const [showAddCard, setShowAddCard] = useState(false);

  // Transfer dialog state
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferAmt, setTransferAmt] = useState("");
  // direction: "toVault" = Main -> Vault, "toMain" = Vault -> Main
  const [transferDir, setTransferDir] = useState("toVault");

  // ---------- Persistence ----------
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.checkingBalance != null) setCheckingBalance(parsed.checkingBalance);
      if (parsed.vaultBalance != null) setVaultBalance(parsed.vaultBalance);
      if (Array.isArray(parsed.cards)) setCards(parsed.cards);
      if (Array.isArray(parsed.txns)) setTxns(parsed.txns);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ checkingBalance, vaultBalance, cards, txns })
    );
  }, [checkingBalance, vaultBalance, cards, txns]);

  // ---------- Derived ----------
  const pendingByCard = useMemo(() => {
    const map = {};
    cards.forEach((c) => (map[c.id] = 0));
    txns.forEach((t) => {
      if (!t.cleared) map[t.cardId] = (map[t.cardId] || 0) + Number(t.amount || 0);
    });
    return map;
  }, [cards, txns]);

  // Total Card Balances = SUM of all pending (uncleared) txn amounts
  const totalCardBalances = useMemo(
    () => Object.values(pendingByCard).reduce((a, b) => a + b, 0),
    [pendingByCard]
  );

  // "Difference" = Total Card Balances - Vault Account (never negative)
  const difference = useMemo(() => {
    const diff = totalCardBalances - Number(vaultBalance || 0);
    return diff > 0 ? diff : 0;
  }, [totalCardBalances, vaultBalance]);

  // ---------- Actions ----------
  const addCard = useCallback((name, color, dueDay) => {
    const id = "c_" + Math.random().toString(36).slice(2);
    setCards((prev) => [
      ...prev,
      {
        id,
        name: name || "New Card",
        color: color || pickColor(),
        dueDay: sanitizeDueDay(dueDay)
      }
    ]);
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
        cleared: false
      }
    ]);
  }, []);

  const toggleCleared = useCallback((txnId) => {
    setTxns((prev) => prev.map((t) => (t.id === txnId ? { ...t, cleared: !t.cleared } : t)));
  }, []);

  const updateTxnNote = useCallback((txnId, note) => {
    setTxns((prev) => prev.map((t) => (t.id === txnId ? { ...t, note } : t)));
  }, []);

  // Click "Vault" on a txn: move that amount from Main -> Vault
  const vaultTxnAmount = useCallback((amount) => {
    const amt = Number(amount || 0);
    if (!amt || amt <= 0) return;
    setCheckingBalance((b) => Number((b - amt).toFixed(2)));
    setVaultBalance((b) => Number((b + amt).toFixed(2)));
  }, []);

  // Transfer dialog actions
  const swapDirection = () => {
    setTransferDir((d) => (d === "toVault" ? "toMain" : "toVault"));
  };
  const performTransfer = () => {
    const amt = Number(transferAmt || 0);
    if (!amt || amt <= 0) return;

    if (transferDir === "toVault") {
      // Main -> Vault
      if (checkingBalance >= amt) {
        setCheckingBalance((b) => Number((b - amt).toFixed(2)));
        setVaultBalance((b) => Number((b + amt).toFixed(2)));
      }
    } else {
      // Vault -> Main
      if (vaultBalance >= amt) {
        setVaultBalance((b) => Number((b - amt).toFixed(2)));
        setCheckingBalance((b) => Number((b + amt).toFixed(2)));
      }
    }
    setTransferAmt("");
    setShowTransfer(false);
  };

  // ---------- UI Helpers ----------
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
  function daysInMonth(y, m) {
    return new Date(y, m + 1, 0).getDate();
  }
  function stripTime(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
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

  return (
    <div className="container">
      <div className="topbar">
        <h2>VaultSwipe — Manual Mode</h2>
        <div className="subtle">Snapshot first. Details on demand.</div>
      </div>

      {/* Main Checking Card */}
      <div className="card">
        <div className="row-inline">
          <div className="inline-left">
            <h3>Main Checking Account</h3>
            <div className="muted">Available Balance</div>
          </div>
          <div className="inline-right">
            <div className="amt-inline">
              ${Number(checkingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <InlineEditNumber label="Edit" value={checkingBalance} onChange={setCheckingBalance} small />
          </div>
        </div>

        {/* Transfer button (centered) */}
        <div className="transfer-center">
          <button className="btn-outline btn-sm" onClick={() => setShowTransfer(true)}>
            Transfer between Main ↔ Vault
          </button>
        </div>

        {/* Two columns: Vault | Total Card Balances */}
        <div className="two-col">
          <div className="mini-card">
            <div className="mini-head">
              <span>Vault Account</span>
              <InlineEditNumber label="Edit" value={vaultBalance} onChange={setVaultBalance} small />
            </div>
            <div className="mini-amt">
              ${Number(vaultBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="mini-card">
            <div className="mini-head">
              <span>Total Card Balances</span>
              <span className="hint">uncleared items</span>
            </div>
            <div className="mini-amt">
              ${Number(totalCardBalances || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Difference */}
        <div className="pending-note">
          Difference: <strong>${difference.toFixed(2)}</strong>
        </div>
      </div>

      {/* Cards list */}
      {cards.length === 0 ? (
        <div className="card"><em>Add a card to get started.</em></div>
      ) : (
        cards.map((c) => {
          const dueIn = daysUntilNextDue(c.dueDay || 1);
          const dueText = `Due: ${ordinal(c.dueDay || 1)}${Number.isFinite(dueIn) ? ` (in ${dueIn} day${dueIn === 1 ? "" : "s"})` : ""}`;
          const dueSoon = dueIn <= 5;
          const txnsForCard = txns.filter((t) => t.cardId === c.id);
          const pendingTotal = txnsForCard.filter(t => !t.cleared).reduce((s, t) => s + Number(t.amount || 0), 0);
          return (
            <CardBlock
              key={c.id}
              card={c}
              dueText={dueText}
              dueSoon={dueSoon}
              pendingTotal={pendingTotal}
              txns={txnsForCard}
              onAddTxn={addTxn}
              onToggleCleared={toggleCleared}
              onUpdateNote={updateTxnNote}
              onRename={renameCard}
              onRecolor={recolorCard}
              onChangeDueDay={changeDueDay}
              onVaultTxnAmount={(amt) => vaultTxnAmount(amt)}
            />
          );
        })
      )}

      {/* Add Card (collapsible) */}
      <div className="card">
        <div className="row-header">
          <div className="title-col">
            <h3>Add Card</h3>
          </div>
          <div className="actions-col">
            <button className="btn-outline btn-sm" onClick={() => setShowAddCard(v => !v)}>
              {showAddCard ? "Hide" : "Add Card"}
            </button>
          </div>
        </div>
        {showAddCard && (
          <AddCardForm
            onAdd={(name, color, dueDay) => {
              addCard(name, color, dueDay);
              setShowAddCard(false); // collapse after add
            }}
          />
        )}
      </div>

      {/* Transfer Dialog */}
      {showTransfer && (
        <div className="modal-overlay" onClick={() => setShowTransfer(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Transfer</h3>
            <div className="modal-body">
              <div className="transfer-row">
                <div className="transfer-endpoint">
                  <div className="endpoint-label">{transferDir === "toVault" ? "From" : "To"}</div>
                  <div className="endpoint-value">Main Checking</div>
                </div>

                <button className="swap-btn" onClick={swapDirection} title="Swap direction">
                  ↔
                </button>

                <div className="transfer-endpoint">
                  <div className="endpoint-label">{transferDir === "toVault" ? "To" : "From"}</div>
                  <div className="endpoint-value">Vault Account</div>
                </div>
              </div>

              <div className="row">
                <input
                  className="flex1"
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={transferAmt}
                  onChange={(e) => setTransferAmt(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-outline btn-sm" onClick={() => setShowTransfer(false)}>Cancel</button>
              <button className="btn btn-sm" onClick={performTransfer}>Transfer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Small subcomponents ---------- */

function InlineEditNumber({ label = "Edit", value, onChange, small }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? 0);
  useEffect(() => setDraft(value ?? 0), [value]);

  return (
    <div className="inline-edit">
      {!editing ? (
        <button className={small ? "btn-outline btn-xs" : "btn-outline btn-sm"} onClick={() => setEditing(true)}>
          {label}
        </button>
      ) : (
        <>
          <input
            className={small ? "input-sm" : ""}
            type="number"
            step="0.01"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button
            className={small ? "btn btn-xs" : "btn btn-sm"}
            onClick={() => {
              onChange(Number(draft || 0));
              setEditing(false);
            }}
          >
            Save
          </button>
        </>
      )}
    </div>
  );
}

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
          onAdd(name.trim(), color.trim() || undefined, dueDay ? Number(dueDay) : 1);
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
  pendingTotal,
  txns,
  onAddTxn,
  onToggleCleared,
  onUpdateNote,
  onRename,
  onRecolor,
  onChangeDueDay,
  onVaultTxnAmount
}) {
  const [showTransactions, setShowTransactions] = useState(false);
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  return (
    <div className="card">
      {/* Header */}
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
        <div className="actions-col actions-col--amt">
          <div className="amt-large" title="Untransferred amount">
            ${pendingTotal.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Controls row: View Transactions (left) + Add Transaction (right) */}
      <div className="controls-row">
        <button className="linkish" onClick={() => setShowTransactions((v) => !v)}>
          {showTransactions ? `Hide Transactions` : `View Transactions (${txns.length})`}
        </button>

        <button className="btn-outline btn-sm" onClick={() => setShowAddTxn((v) => !v)} title="Add transaction">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Add Transaction
        </button>
      </div>

      {/* Edit panel */}
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
        </div>
      )}

      {/* Add Txn form (collapses after Add) */}
      {showAddTxn && (
        <div className="cc-add-txn">
          <InlineAddTxn
            cardId={card.id}
            onAdd={(payload) => {
              onAddTxn(payload);
              setShowAddTxn(false); // collapse after add
            }}
          />
        </div>
      )}

      {/* Transactions (collapsed by default, expands on toggle) */}
      {showTransactions && (
        <>
          {txns.length === 0 ? (
            <div className="muted">No transactions yet.</div>
          ) : (
            txns
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .map((t) => (
                <TxnRow
                  key={t.id}
                  txn={t}
                  onVault={() => onVaultTxnAmount(t.amount)}
                  onToggleCleared={() => onToggleCleared(t.id)}
                  onUpdateNote={(note) => onUpdateNote(t.id, note)}
                />
              ))
          )}
        </>
      )}
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
            note
          });
          // parent collapses the whole form; we clear local state
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

function TxnRow({ txn, onVault, onToggleCleared, onUpdateNote }) {
  const [editing, setEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState(txn.note || "");

  return (
    <div className={`txn-row compact ${txn.cleared ? "cleared" : ""}`}>
      <div className="txn-line1">
        <div className="txn-merchant">{txn.merchant || "—"}</div>
        <div className="txn-amount">${Number(txn.amount).toFixed(2)}</div>
      </div>

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
          {/* Order: Vault | Note | Clear */}
          <button className="btn-outline btn-sm" onClick={onVault} title="Move amount to Vault">
            Vault
          </button>
          <button className="btn-ghost btn-sm" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "Note"}
          </button>
          <button className="btn-outline btn-sm" onClick={onToggleCleared}>
            {txn.cleared ? "Unclear" : "Clear"}
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

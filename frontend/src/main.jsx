import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLeft, ArrowRight, Loader2, Plus, RefreshCw, Search, ShieldAlert, Trash2 } from "lucide-react";
import "./style.css";

const API_URL = import.meta.env.VITE_API_URL || "";

const statuses = [
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
  { key: "closed", label: "Closed" },
];

const priorities = ["low", "medium", "high", "urgent"];

function formatAge(minutes = 0) {
  const safeMinutes = Math.max(0, minutes);
  const days = Math.floor(safeMinutes / 1440);
  const hours = Math.floor((safeMinutes % 1440) / 60);
  const mins = safeMinutes % 60;

  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function getMessage(error) {
  return error?.message || "Something went wrong";
}

function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState({});
  const [filters, setFilters] = useState({
    priority: "",
    breached: false,
  });
  const [form, setForm] = useState({
    subject: "",
    description: "",
    customerEmail: "",
    priority: "medium",
  });

  async function request(path, options) {
    const response = await fetch(`${API_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  async function loadData() {
    try {
      setError("");
      const params = new URLSearchParams();

      if (filters.priority) params.set("priority", filters.priority);
      if (filters.breached) params.set("breached", "true");

      const query = params.toString() ? `?${params.toString()}` : "";
      const [ticketData, statsData] = await Promise.all([
        request(`/api/tickets${query}`),
        request("/api/ticket-stats"),
      ]);

      setTickets(ticketData.tickets || []);
      setStats(statsData);
    } catch (error) {
      setError(getMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [filters.priority, filters.breached]);

  const groupedTickets = useMemo(() => {
    return statuses.reduce((board, status) => {
      board[status.key] = tickets.filter((ticket) => ticket.status === status.key);
      return board;
    }, {});
  }, [tickets]);

  function validateForm() {
    const errors = {};

    if (!form.subject.trim()) errors.subject = "Subject is required";
    if (!form.description.trim()) errors.description = "Description is required";
    if (!form.customerEmail.trim()) errors.customerEmail = "Customer email is required";
    if (form.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail)) {
      errors.customerEmail = "Enter a valid email";
    }

    setFormError(errors);
    return Object.keys(errors).length === 0;
  }

  async function createTicket(event) {
    event.preventDefault();

    if (!validateForm()) return;

    try {
      setSavingId("new");
      setError("");
      await request("/api/tickets", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({
        subject: "",
        description: "",
        customerEmail: "",
        priority: "medium",
      });
      setFormError({});
      await loadData();
    } catch (error) {
      setFormError({ submit: getMessage(error) });
    } finally {
      setSavingId("");
    }
  }

  async function moveTicket(ticket, nextStatus) {
    try {
      setSavingId(ticket._id);
      setError("");
      const data = await request(`/api/tickets?id=${ticket._id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setTickets((oldTickets) => oldTickets.map((item) => item._id === ticket._id ? data.ticket : item));
      const statsData = await request("/api/ticket-stats");
      setStats(statsData);
    } catch (error) {
      if (getMessage(error) === "Ticket not found") {
        const updatedTicket = {
          ...ticket,
          status: nextStatus,
          resolvedAt: nextStatus === "resolved" ? new Date().toISOString() : ticket.resolvedAt,
        };

        if (ticket.status === "resolved" && nextStatus === "in_progress") {
          updatedTicket.resolvedAt = null;
        }

        setTickets((oldTickets) => oldTickets.map((item) => item._id === ticket._id ? updatedTicket : item));
      } else {
        setError(getMessage(error));
      }
    } finally {
      setSavingId("");
    }
  }

  async function deleteTicket(ticket) {
    try {
      setSavingId(ticket._id);
      setError("");
      await request(`/api/tickets?id=${ticket._id}`, {
        method: "DELETE",
      });
      setTickets((oldTickets) => oldTickets.filter((item) => item._id !== ticket._id));
      const statsData = await request("/api/ticket-stats");
      setStats(statsData);
    } catch (error) {
      if (getMessage(error) === "Ticket not found") {
        setTickets((oldTickets) => oldTickets.filter((item) => item._id !== ticket._id));
      } else {
        setError(getMessage(error));
      }
    } finally {
      setSavingId("");
    }
  }

  return (
    <main className="app">
      <section className="topbar">
        <div>
          <p className="eyebrow">Support triage</p>
          <h1>DeskFlow</h1>
        </div>
        <button className="icon-button" onClick={loadData} title="Refresh tickets">
          <RefreshCw size={18} />
        </button>
      </section>

      <section className="controls">
        <div className="filter">
          <Search size={17} />
          <select
            value={filters.priority}
            onChange={(event) => setFilters({ ...filters, priority: event.target.value })}
          >
            <option value="">All priorities</option>
            {priorities.map((priority) => (
              <option value={priority} key={priority}>{priority}</option>
            ))}
          </select>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={filters.breached}
            onChange={(event) => setFilters({ ...filters, breached: event.target.checked })}
          />
          SLA breached only
        </label>
      </section>

      <section className="stats-strip">
        {statuses.map((status) => (
          <div className="stat" key={status.key}>
            <span>{status.label}</span>
            <strong>{stats?.statusCounts?.[status.key] ?? 0}</strong>
          </div>
        ))}
        <div className="stat danger">
          <span>Breached open</span>
          <strong>{stats?.breachedOpen ?? 0}</strong>
        </div>
      </section>

      {error && <div className="page-error">{error}</div>}

      <section className="board">
        {statuses.map((status, index) => (
          <div className="column" key={status.key}>
            <div className="column-head">
              <h2>{status.label}</h2>
              <span>{groupedTickets[status.key]?.length || 0}</span>
            </div>

            {loading ? (
              <div className="empty"><Loader2 className="spin" size={18} /> Loading</div>
            ) : groupedTickets[status.key]?.length ? (
              groupedTickets[status.key].map((ticket) => (
                <article className={`ticket ${ticket.slaBreached ? "breached" : ""}`} key={ticket._id}>
                  <div className="ticket-top">
                    <h3>{ticket.subject}</h3>
                    <span className={`badge ${ticket.priority}`}>{ticket.priority}</span>
                  </div>
                  <p>{ticket.description}</p>
                  <div className="ticket-meta">
                    <span>{ticket.customerEmail}</span>
                    <strong>{formatAge(ticket.ageMinutes)}</strong>
                  </div>
                  {ticket.slaBreached && (
                    <div className="sla">
                      <ShieldAlert size={15} />
                      SLA breached
                    </div>
                  )}
                  <div className="ticket-actions">
                    {index > 0 && (
                      <button
                        onClick={() => moveTicket(ticket, statuses[index - 1].key)}
                        disabled={savingId === ticket._id}
                        title={`Move to ${statuses[index - 1].label}`}
                      >
                        <ArrowLeft size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteTicket(ticket)}
                      disabled={savingId === ticket._id}
                      title="Delete ticket"
                    >
                      <Trash2 size={16} />
                    </button>
                    {index < statuses.length - 1 && (
                      <button
                        onClick={() => moveTicket(ticket, statuses[index + 1].key)}
                        disabled={savingId === ticket._id}
                        title={`Move to ${statuses[index + 1].label}`}
                      >
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="empty">No tickets</div>
            )}
          </div>
        ))}
      </section>

      <section className="create-panel">
        <div>
          <p className="eyebrow">New request</p>
          <h2>Create Ticket</h2>
        </div>

        <form onSubmit={createTicket}>
          <label>
            Subject
            <input
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
            />
            {formError.subject && <span>{formError.subject}</span>}
          </label>

          <label>
            Description
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
            {formError.description && <span>{formError.description}</span>}
          </label>

          <label>
            Customer Email
            <input
              value={form.customerEmail}
              onChange={(event) => setForm({ ...form, customerEmail: event.target.value })}
            />
            {formError.customerEmail && <span>{formError.customerEmail}</span>}
          </label>

          <label>
            Priority
            <select
              value={form.priority}
              onChange={(event) => setForm({ ...form, priority: event.target.value })}
            >
              {priorities.map((priority) => (
                <option value={priority} key={priority}>{priority}</option>
              ))}
            </select>
          </label>

          {formError.submit && <div className="form-error">{formError.submit}</div>}

          <button className="submit" disabled={savingId === "new"}>
            {savingId === "new" ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
            Create ticket
          </button>
        </form>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);

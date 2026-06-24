import { useState, useEffect, useCallback } from 'react';

function Avatar({ name }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: 'linear-gradient(135deg, #2557a7, #1a4285)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function UsersPage({ isActive }) {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ name: '', email: '', password: '' });
  const [formErr, setFormErr]   = useState('');
  const [saving, setSaving]     = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isActive) load();
  }, [isActive, load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormErr('');
    if (form.password.length < 8) { setFormErr('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setFormErr(data?.error || data?.message || 'Failed to create user'); return; }
      setForm({ name: '', email: '', password: '' });
      setShowForm(false);
      load();
    } catch {
      setFormErr('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleteId(id);
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE', credentials: 'include' });
      setUsers(prev => prev.filter(u => u.id !== id));
    } finally {
      setDeleteId(null);
    }
  };

  const inp = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px',
    background: 'var(--sf)', border: '1px solid var(--bdr2)',
    borderRadius: 7, color: 'var(--tx)', fontSize: 13, outline: 'none',
  };

  return (
    <div
      id="page-users"
      style={{ display: isActive ? 'flex' : 'none', flexDirection: 'column', padding: '28px 32px', gap: 24, flex: 1, overflowY: 'auto' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx)', letterSpacing: '-0.2px' }}>User Management</div>
          <div style={{ fontSize: 13, color: 'var(--tx3)', marginTop: 2 }}>Manage who has access to BondBulls Analytics</div>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormErr(''); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', background: '#2557a7', color: '#fff',
            border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add User
        </button>
      </div>

      {/* Add user form */}
      {showForm && (
        <div style={{
          background: 'var(--sf)', border: '1px solid var(--bdr2)',
          borderRadius: 10, padding: '20px 24px',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)', marginBottom: 16 }}>New User</div>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx3)', display: 'block', marginBottom: 5 }}>Full Name</label>
                <input style={inp} required placeholder="e.g. Rahul Sharma"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx3)', display: 'block', marginBottom: 5 }}>Email</label>
                <input style={inp} type="email" required placeholder="rahul@company.com"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx3)', display: 'block', marginBottom: 5 }}>Password</label>
                <input style={inp} type="password" required placeholder="Min 8 characters"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
            </div>
            {formErr && (
              <div style={{ fontSize: 12, color: '#e07070', marginBottom: 12, padding: '7px 12px', background: 'rgba(192,57,43,0.1)', borderRadius: 6 }}>
                {formErr}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={saving} style={{
                padding: '8px 18px', background: saving ? 'rgba(37,87,167,0.4)' : '#2557a7',
                color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}>
                {saving ? 'Creating…' : 'Create User'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{
                padding: '8px 18px', background: 'var(--sf2)', color: 'var(--tx2)',
                border: '1px solid var(--bdr)', borderRadius: 7, fontSize: 13, cursor: 'pointer',
              }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      <div style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 10, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1.4fr 120px 90px',
          padding: '10px 20px', background: 'var(--sf2)',
          borderBottom: '1px solid var(--bdr)',
          fontSize: 11, fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          <div>Name</div>
          <div>Email</div>
          <div>Joined</div>
          <div></div>
        </div>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--tx3)', fontSize: 13 }}>
            Loading users…
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--tx3)', fontSize: 13 }}>
            No users found
          </div>
        ) : (
          users.map((u, i) => (
            <div key={u.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 1.4fr 120px 90px',
              padding: '12px 20px', alignItems: 'center',
              borderBottom: i < users.length - 1 ? '1px solid var(--bdr)' : 'none',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--sf2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={u.name} />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx)' }}>{u.name}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--tx2)' }}>{u.email}</div>
              <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
                {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleDelete(u.id)}
                  disabled={deleteId === u.id}
                  title="Delete user"
                  style={{
                    background: 'none', border: '1px solid var(--bdr)',
                    color: deleteId === u.id ? 'var(--tx4)' : '#e07070',
                    borderRadius: 6, padding: '5px 8px', cursor: deleteId === u.id ? 'wait' : 'pointer',
                    fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                  {deleteId === u.id ? '…' : 'Remove'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ fontSize: 12, color: 'var(--tx4)' }}>
        {users.length} user{users.length !== 1 ? 's' : ''} · Passwords are hashed and stored securely in your database
      </div>
    </div>
  );
}

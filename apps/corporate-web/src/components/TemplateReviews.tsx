'use client';

import { useState } from 'react';

type ReviewItem = {
  id: string;
  author_name: string;
  rating: number;
  body: string;
  created_at: string;
};

export function TemplateReviews({
  code,
  initial,
}: {
  code: string;
  initial: { count: number; avg_rating: number | null; items: ReviewItem[] };
}) {
  const [items, setItems] = useState(initial.items);
  const [count, setCount] = useState(initial.count);
  const [avg, setAvg] = useState(initial.avg_rating);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const api =
        process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, '') ||
        'http://127.0.0.1:3001';
      const res = await fetch(`${api}/api/v1/public/templates/${encodeURIComponent(code)}/reviews`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ author_name: name, rating, body }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const created = (await res.json()) as ReviewItem;
      const next = [created, ...items];
      setItems(next);
      setCount(next.length);
      setAvg(Number((next.reduce((s, r) => s + r.rating, 0) / next.length).toFixed(2)));
      setName('');
      setBody('');
      setRating(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gửi review thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mkt-reviews" style={{ marginTop: 48 }}>
      <h2>
        Đánh giá
        {count > 0 ? (
          <span style={{ fontWeight: 400, fontSize: 15, marginLeft: 10, color: 'var(--ink-3)' }}>
            {avg?.toFixed(1)} / 5 · {count} review
          </span>
        ) : null}
      </h2>

      {items.length ? (
        <ul className="mkt-review-list">
          {items.map((r) => (
            <li key={r.id}>
              <div className="mkt-review-meta">
                <strong>{r.author_name}</strong>
                <span>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              </div>
              {r.body ? <p>{r.body}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>Chưa có đánh giá — hãy là người đầu tiên.</p>
      )}

      <form className="mkt-review-form" onSubmit={submit}>
        <h3>Viết đánh giá</h3>
        <label>
          Tên
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
        </label>
        <label>
          Rating
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nhận xét
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={2000} />
        </label>
        {error ? <p style={{ color: 'crimson', fontSize: 13 }}>{error}</p> : null}
        <button type="submit" className="corp-btn corp-btn-primary" disabled={busy || !name.trim()}>
          {busy ? 'Đang gửi…' : 'Gửi đánh giá'}
        </button>
      </form>
    </section>
  );
}

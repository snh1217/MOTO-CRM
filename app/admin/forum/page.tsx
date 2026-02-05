'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { strings } from '@/lib/strings.ko';

type ForumPost = {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
};

export default function ForumPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const loadPosts = async () => {
    setLoading(true);
    setError(null);
    setRequestId(null);

    try {
      const response = await fetch('/api/forum', { credentials: 'include' });
      if (response.status === 401) {
        router.replace('/');
        return;
      }
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || result.message || '게시글을 불러오지 못했습니다.');
        setRequestId(result.requestId || null);
        return;
      }
      setPosts(result.data || []);
    } catch (err) {
      setError('게시글을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);
    setRequestId(null);

    try {
      const response = await fetchWithTimeout(
        '/api/forum',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: trimmed }),
          credentials: 'include'
        },
        12000
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || result.message || '게시글 저장에 실패했습니다.');
        setRequestId(result.requestId || null);
        return;
      }
      setPosts((prev) => [result.data, ...prev]);
      setContent('');
    } catch (err) {
      setError('게시글 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="space-y-6">
      <Nav />
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">{strings.forum.title}</h2>
          <p className="text-sm text-slate-500">{strings.forum.description}</p>
        </div>

        <div className="mt-6 space-y-3">
          <textarea
            className="min-h-[120px] w-full rounded-md border border-slate-200 p-3 text-sm"
            placeholder={strings.forum.placeholder}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="h-11 rounded-md bg-slate-900 px-4 text-sm text-white disabled:opacity-60"
          >
            {saving ? strings.forum.submitting : strings.forum.submit}
          </button>
          {error && (
            <p className="text-xs text-red-500">
              {error}
              {requestId && <span className="ml-2">requestId: {requestId}</span>}
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">{strings.common.loading}</p>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{post.author_name}</span>
                <span>{new Date(post.created_at).toLocaleString('ko-KR')}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{post.content}</p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

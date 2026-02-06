'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { strings } from '@/lib/strings.ko';

type ForumMedia = {
  id: string;
  url: string;
  mime_type: string;
  created_at: string;
};

type ForumComment = {
  id: string;
  author_name: string;
  author_user_id: string;
  content: string;
  created_at: string;
};

type ForumPost = {
  id: string;
  author_name: string;
  author_user_id: string;
  content: string;
  created_at: string;
  updated_at?: string | null;
  center_name?: string | null;
  media: ForumMedia[];
  comments: ForumComment[];
};

type AdminMe = {
  id: string;
  is_superadmin?: boolean;
};

type Notification = {
  id: string;
  type: string;
  message: string;
  created_at: string;
  is_read: boolean;
  post_id?: string | null;
  comment_id?: string | null;
};

export default function ForumPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [me, setMe] = useState<AdminMe | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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

  const loadMe = async () => {
    try {
      const response = await fetch('/api/admin/me', { credentials: 'include' });
      if (!response.ok) return;
      const result = await response.json().catch(() => ({}));
      setMe(result.data || null);
    } catch (err) {
      setMe(null);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/forum/notifications', { credentials: 'include' });
      if (!response.ok) return;
      const result = await response.json().catch(() => ({}));
      setNotifications(result.data || []);
      setUnreadCount(result.unreadCount || 0);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    loadMe();
    loadPosts();
    loadNotifications();
  }, []);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);
    setRequestId(null);

    try {
      const payload = new FormData();
      payload.append('content', trimmed);
      files.forEach((file) => payload.append('media', file));

      const response = await fetchWithTimeout(
        '/api/forum',
        {
          method: 'POST',
          body: payload,
          credentials: 'include'
        },
        20000
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || result.message || '게시글 저장에 실패했습니다.');
        setRequestId(result.requestId || null);
        return;
      }
      setPosts((prev) => [result.data, ...prev]);
      setContent('');
      setFiles([]);
      await loadNotifications();
    } catch (err) {
      setError('게시글 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm('게시글을 삭제하시겠습니까?')) return;

    try {
      const response = await fetchWithTimeout(
        `/api/forum/${postId}`,
        {
          method: 'DELETE',
          credentials: 'include'
        },
        12000
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || result.message || '게시글 삭제에 실패했습니다.');
        setRequestId(result.requestId || null);
        return;
      }
      setPosts((prev) => prev.filter((post) => post.id !== postId));
    } catch (err) {
      setError('게시글 삭제에 실패했습니다.');
    }
  };

  const handleEditSave = async (postId: string) => {
    const trimmed = editingContent.trim();
    if (!trimmed) return;

    try {
      const response = await fetchWithTimeout(
        `/api/forum/${postId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: trimmed }),
          credentials: 'include'
        },
        12000
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || result.message || '게시글 수정에 실패했습니다.');
        setRequestId(result.requestId || null);
        return;
      }
      setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, ...result.data } : post)));
      setEditingId(null);
      setEditingContent('');
    } catch (err) {
      setError('게시글 수정에 실패했습니다.');
    }
  };

  const handleAddComment = async (postId: string) => {
    const value = (commentDrafts[postId] || '').trim();
    if (!value) return;

    try {
      const response = await fetchWithTimeout(
        `/api/forum/${postId}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: value }),
          credentials: 'include'
        },
        12000
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || result.message || '댓글 저장에 실패했습니다.');
        setRequestId(result.requestId || null);
        return;
      }
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, comments: [...post.comments, result.data] } : post
        )
      );
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
      await loadNotifications();
    } catch (err) {
      setError('댓글 저장에 실패했습니다.');
    }
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;

    try {
      const response = await fetchWithTimeout(
        `/api/forum/comments/${commentId}`,
        {
          method: 'DELETE',
          credentials: 'include'
        },
        12000
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || result.message || '댓글 삭제에 실패했습니다.');
        setRequestId(result.requestId || null);
        return;
      }
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, comments: post.comments.filter((comment) => comment.id !== commentId) }
            : post
        )
      );
    } catch (err) {
      setError('댓글 삭제에 실패했습니다.');
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await fetch('/api/forum/notifications', { method: 'PATCH', credentials: 'include' });
      await loadNotifications();
    } catch (err) {
      // ignore
    }
  };

  return (
    <main className="space-y-6">
      <Nav />
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">정비공유게시판</h2>
            <p className="text-sm text-slate-500">센터 내부 정비 노하우를 공유하세요.</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-full bg-slate-100 px-3 py-1">알림 {unreadCount}</span>
            <button
              type="button"
              onClick={handleMarkNotificationsRead}
              className="rounded-md border border-slate-200 px-3 py-1 text-xs"
            >
              알림 확인
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <textarea
            className="min-h-[120px] w-full rounded-md border border-slate-200 p-3 text-sm"
            placeholder={strings.forum.placeholder}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            className="text-sm"
          />
          {files.length > 0 && (
            <ul className="text-xs text-slate-500">
              {files.map((file) => (
                <li key={file.name}>{file.name}</li>
              ))}
            </ul>
          )}
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

      <section className="space-y-4">
        {loading ? (
          <p className="text-sm text-slate-500">{strings.common.loading}</p>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span>
                  {post.author_name} · {post.center_name || '센터'}
                </span>
                <span>{new Date(post.created_at).toLocaleString('ko-KR')}</span>
              </div>

              {editingId === post.id ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    className="min-h-[100px] w-full rounded-md border border-slate-200 p-3 text-sm"
                    value={editingContent}
                    onChange={(event) => setEditingContent(event.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditSave(post.id)}
                      className="rounded-md bg-slate-900 px-3 py-1 text-xs text-white"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setEditingContent('');
                      }}
                      className="rounded-md border border-slate-200 px-3 py-1 text-xs"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{post.content}</p>
              )}

              {post.media?.length > 0 && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {post.media.map((media) => (
                    <div key={media.id} className="rounded-lg border border-slate-200 p-2">
                      {media.mime_type.startsWith('video') ? (
                        <video controls className="w-full rounded-md">
                          <source src={media.url} />
                        </video>
                      ) : (
                        <img src={media.url} alt="media" className="w-full rounded-md object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {(me?.is_superadmin || me?.id === post.author_user_id) && (
                <div className="mt-3 flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(post.id);
                      setEditingContent(post.content);
                    }}
                    className="rounded-md border border-slate-200 px-3 py-1"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(post.id)}
                    className="rounded-md border border-red-200 px-3 py-1 text-red-600"
                  >
                    삭제
                  </button>
                </div>
              )}

              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500">댓글</p>
                {post.comments.map((comment) => (
                  <div key={comment.id} className="rounded-md bg-slate-50 p-3 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{comment.author_name}</span>
                      <span>{new Date(comment.created_at).toLocaleString('ko-KR')}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{comment.content}</p>
                    {(me?.is_superadmin || me?.id === comment.author_user_id) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.id, post.id)}
                        className="mt-2 text-[11px] text-red-500"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex flex-col gap-2 md:flex-row">
                  <input
                    className="h-10 flex-1 rounded-md border border-slate-200 px-3 text-sm"
                    placeholder="댓글을 입력하세요"
                    value={commentDrafts[post.id] || ''}
                    onChange={(event) =>
                      setCommentDrafts((prev) => ({ ...prev, [post.id]: event.target.value }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => handleAddComment(post.id)}
                    className="h-10 rounded-md bg-slate-900 px-3 text-xs text-white"
                  >
                    등록
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

import { useEffect, useRef, useState, type RefObject } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface MentionUser {
  username: string;
  nickname: string | null;
  avatarUrl: string | null;
  role?: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
}

/** 匹配光标前的 @query（须在行首或空白之后） */
function detectMention(text: string, caret: number): { query: string; start: number } | null {
  const before = text.slice(0, caret);
  const m = /(^|\s)@([\p{L}\p{N}_-]{0,24})$/u.exec(before);
  if (!m) return null;
  return { query: m[2], start: caret - m[2].length - 1 };
}

/** 带 @ 提及自动补全的文本域：输入 @ 后按用户名/昵称匹配，回车或点击插入 */
export function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength,
  className,
  textareaRef,
}: MentionTextareaProps) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  const setRef = (el: HTMLTextAreaElement | null) => {
    innerRef.current = el;
    if (textareaRef) (textareaRef as { current: HTMLTextAreaElement | null }).current = el;
  };
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [active, setActive] = useState(0);
  const listOpen = mention !== null && users.length > 0;

  // 输入时检测 @
  const detect = () => {
    const el = innerRef.current;
    if (!el) return;
    const found = detectMention(el.value, el.selectionStart ?? el.value.length);
    setMention(found);
    if (!found) setUsers([]);
  };

  // 查询防抖
  useEffect(() => {
    if (!mention) return;
    const q = mention.query;
    if (q.length > 24) {
      setUsers([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE ?? ''}/api/users/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { users: MentionUser[] };
        setUsers(data.users ?? []);
        setActive(0);
      } catch {
        setUsers([]);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [mention]);

  const select = (user: MentionUser) => {
    const el = innerRef.current;
    if (!el || !mention) return;
    const caret = el.selectionStart ?? el.value.length;
    const next = `${el.value.slice(0, mention.start)}@${user.username} ${el.value.slice(caret)}`;
    onChange(next);
    setMention(null);
    setUsers([]);
    requestAnimationFrame(() => {
      el.focus();
      const pos = mention.start + user.username.length + 2;
      el.setSelectionRange(pos, pos);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!listOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % users.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + users.length) % users.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      select(users[active]);
    } else if (e.key === 'Escape') {
      setMention(null);
      setUsers([]);
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={setRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyUp={detect}
        onClick={detect}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={className}
      />
      {listOpen && (
        <div className="bg-popover absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-none border shadow-md">
          {users.map((u, i) => (
            <button
              key={u.username}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent',
                i === active && 'bg-accent',
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                select(u);
              }}
            >
              <span className="font-medium">@{u.username}</span>
              {u.nickname && u.nickname !== u.username && (
                <span className="text-muted-foreground truncate text-xs">{u.nickname}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

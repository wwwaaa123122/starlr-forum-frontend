import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { api, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { usePageTitle } from '@/lib/use-page-title';
import { MarkdownView } from '@/components/markdown';
import { MentionTextarea } from '@/components/mention-textarea';
import { ImageUploadButton } from '@/components/image-upload-button';
import { PageContainer, PageHeader, PageSection } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { Category, PostDetail } from '@/lib/types';

export function PostEditorPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  usePageTitle(isEdit ? '编辑帖子' : '发布新帖');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const { data: popularTags } = useQuery({
    queryKey: ['popular-tags'],
    queryFn: () => api<{ tags: { name: string; count: number }[] }>('/api/posts/tags'),
    staleTime: 5 * 60 * 1000,
  });
  const [submitting, setSubmitting] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  /** 在光标处插入 Markdown（图片上传等） */
  function insertMarkdown(markdown: string) {
    const el = contentRef.current;
    if (!el) {
      setContent((c) => `${c}${c.endsWith('\n') || !c ? '' : '\n'}${markdown}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    setContent((current) => current.slice(0, start) + markdown + current.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + markdown.length;
      el.setSelectionRange(pos, pos);
    });
  }

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<{ categories: Category[] }>('/api/categories'),
    staleTime: 60_000,
  });

  // 编辑模式：加载原帖
  const { data: postData } = useQuery({
    queryKey: ['post', id],
    queryFn: () => api<{ post: PostDetail }>(`/api/posts/${id}`),
    enabled: isEdit,
  });

  useEffect(() => {
    if (postData?.post) {
      setTitle(postData.post.title);
      setContent(postData.post.content);
      setCategoryId(postData.post.categoryId ?? '');
      setTags((postData.post.tags ?? []).map((t) => (typeof t === 'string' ? t : t.name)));
    }
  }, [postData]);

  useEffect(() => {
    if (!loading && !user) {
      toast.error('请先登录');
      navigate('/login');
    }
  }, [loading, user, navigate]);

  const addTag = () => {
    // 支持一次输入多个：逗号 / 顿号 / 空格分隔
    const names = tagInput
      .split(/[,，、\s]+/)
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);
    setTagInput('');
    if (names.length === 0) return;
    const next = [...tags];
    for (const name of names) {
      if (next.includes(name)) continue;
      if (next.length >= 5) {
        toast.error('最多 5 个标签');
        break;
      }
      if (name.length > 24) {
        toast.error(`「${name}」超过 24 个字符`);
        continue;
      }
      next.push(name);
    }
    setTags(next);
  };

  const submit = async () => {
    if (title.trim().length < 2) {
      toast.error('标题至少 2 个字符');
      return;
    }
    if (!content.trim()) {
      toast.error('正文不能为空');
      return;
    }
    if (!categoryId) {
      toast.error('请选择分类');
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit) {
        await api(`/api/posts/${id}`, { method: 'PATCH', body: { title, content, categoryId, tags } });
        toast.success('帖子已更新');
        navigate(`/posts/${id}`);
      } else {
        const res = await api<{ id: string }>('/api/posts', {
          method: 'POST',
          body: { title, content, categoryId, tags },
        });
        toast.success('发布成功');
        navigate(`/posts/${res.id}`);
      }
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : '发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={isEdit ? '编辑帖子' : '发布新帖'}
        description="支持 Markdown；正文里输入 @ 可以提及他人。"
        back
      />

      <PageSection contentClassName="space-y-5 p-5">
        <div className="space-y-1.5">
          <Label htmlFor="title">标题</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="一句话说清问题或主题"
            maxLength={120}
            className="text-base"
          />
          <p className="text-muted-foreground text-right text-xs">{title.length} / 120</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>分类</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                {(categoriesData?.categories ?? []).map((c) => {
                  const staffOnly = c.postPolicy === 'staff' && !['moderator', 'admin'].includes(user?.role ?? '');
                  return (
                    <SelectItem key={c.id} value={c.id} disabled={staffOnly}>
                      {c.icon} {c.name}
                      {staffOnly ? '（仅版主）' : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags">标签（最多 5 个）</Label>
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="输入标签后回车添加"
            />
            <p className="text-muted-foreground text-xs">回车或逗号添加；点击已添加的标签可删除</p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                  >
                    #{tag} ×
                  </Badge>
                ))}
              </div>
            )}
            {(popularTags?.tags ?? []).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-muted-foreground text-xs">热门：</span>
                {(popularTags?.tags ?? [])
                  .filter((t) => !tags.includes(t.name))
                  .slice(0, 8)
                  .map((t) => (
                    <Badge
                      key={t.name}
                      variant="outline"
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => {
                        if (tags.length >= 5) {
                          toast.error('最多 5 个标签');
                          return;
                        }
                        setTags([...tags, t.name]);
                      }}
                    >
                      #{t.name}
                    </Badge>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>正文（支持 Markdown）</Label>
            <ImageUploadButton
              purpose="post"
              getValue={() => content}
              insertMarkdown={insertMarkdown}
              disabled={submitting}
            />
          </div>
          <Tabs defaultValue="write">
            <TabsList className="mb-2">
              <TabsTrigger value="write">编写</TabsTrigger>
              <TabsTrigger value="preview">预览</TabsTrigger>
            </TabsList>
            <TabsContent value="write">
              <MentionTextarea
                value={content}
                onChange={setContent}
                textareaRef={contentRef}
                placeholder="写点什么…（支持 Markdown，输入 @ 可提及他人）"
                rows={14}
                maxLength={50000}
                className="font-mono text-sm"
              />
            </TabsContent>
            <TabsContent value="preview">
              <div className="surface min-h-80 p-4">
                {content.trim() ? (
                  <MarkdownView content={content} />
                ) : (
                  <p className="text-muted-foreground text-sm">没有可预览的内容</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
          <p className="text-muted-foreground text-right text-xs">{content.length} / 50000</p>
        </div>
      </PageSection>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate(-1)} disabled={submitting}>
          取消
        </Button>
        <Button loading={submitting} onClick={() => void submit()}>
          <Send className="size-4" /> {isEdit ? '保存修改' : '发布'}
        </Button>
      </div>
    </PageContainer>
  );
}

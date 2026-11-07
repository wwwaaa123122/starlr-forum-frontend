import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * React 错误边界：捕获子树渲染期异常，避免整站白屏。
 * 顶层包裹整个应用（main.tsx），路由级包裹 <Routes>（App.tsx）。
 * 样式遵循全站直角 + 语义色约定（rounded-none / text-muted-foreground）。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  private reload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-4 py-14 text-center">
        <AlertTriangle className="mb-1 size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">页面出错了</p>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          页面渲染时发生异常，请重试或返回首页。若反复出现，请刷新页面或稍后再来。
        </p>
        {import.meta.env.DEV && (
          <pre className="max-w-md overflow-auto rounded-none border bg-card p-3 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}
        <div className="mt-2 flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={this.reset}>
            重试
          </Button>
          <Button variant="outline" size="sm" onClick={this.reload}>
            刷新页面
          </Button>
          <Button asChild size="sm">
            <Link to="/">回首页</Link>
          </Button>
        </div>
      </div>
    );
  }
}

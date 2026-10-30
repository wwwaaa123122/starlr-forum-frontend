import { useEffect } from 'react';
import { FileText, ShieldCheck } from 'lucide-react';

/** 法律文档页面（/privacy /terms）。内容为本站实际数据处理方式的说明。 */
function LegalShell({ icon, title, updated, children }: { icon: React.ReactNode; title: string; updated: string; children: React.ReactNode }) {
  useEffect(() => {
    document.title = `${title} - Starlr Forum`;
  }, [title]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="bg-primary/10 text-primary rounded-none p-2.5">{icon}</div>
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-muted-foreground text-xs">生效日期：{updated}</p>
        </div>
      </div>
      <div className="bg-card space-y-6 rounded-none border p-5 sm:p-7 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-1.5 [&_p]:text-muted-foreground [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-muted-foreground [&_li]:text-sm [&_li]:leading-relaxed [&_a]:text-primary [&_a]:hover:underline [&_code]:bg-muted [&_code]:rounded-none [&_code]:px-1 [&_code]:text-xs">
        {children}
      </div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell icon={<ShieldCheck className="size-5" />} title="隐私政策" updated="2026 年 10 月 6 日">
      <p>
        Starlr Forum（下称"本站"）非常重视你的隐私。本政策说明我们在你访问和注册本站时收集哪些信息、如何使用与保护这些信息，以及你拥有的权利。
      </p>

      <div>
        <h2>一、我们收集的信息</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong className="text-foreground">账号信息</strong>：注册时提供的用户名、邮箱地址、唯一用户 ID（uid）；你自愿设置的头像与个人简介。</li>
          <li><strong className="text-foreground">你发布的内容</strong>：帖子、评论、点赞、收藏、标签等由你主动提交的内容。</li>
          <li><strong className="text-foreground">浏览数据</strong>：为生成站内"浏览统计"，我们记录匿名浏览事件，包含：所浏览的帖子、时间、基于 Cloudflare IP 库的国家与城市、Cloudflare 边缘节点、粗粒度设备类型（手机/平板/电脑）。同一访客对同一帖子每小时仅计一次。该数据保留 30 天后自动删除。</li>
          <li><strong className="text-foreground">会话与安全数据</strong>：登录会话记录（设备信息、登录时间、近似地理位置），用于"设置 → 会话管理"向你展示；安全事件审计日志（如管理员操作）。</li>
        </ul>
      </div>

      <div>
        <h2>二、我们如何使用信息</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>提供论坛核心功能：发帖、评论、点赞、收藏、通知、搜索；</li>
          <li>发送与你账号相关的邮件（邮箱验证、密码重置、管理通知）；</li>
          <li>防范滥用：频率限制、人机验证、封禁违规账号；</li>
          <li>匿名统计访问情况以改进产品（仅聚合分析，不用于广告）。</li>
        </ul>
      </div>

      <div>
        <h2>三、Cookie 与本地存储</h2>
        <p>本站通过浏览器本地存储（localStorage）与少量 Cookie 维持功能运行：</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong className="text-foreground">必要类（始终开启）</strong>：登录令牌 <code>xc.access</code> / <code>xc.refresh</code>、主题偏好、Cookie 同意记录。没有它们，登录等功能无法使用。</li>
          <li><strong className="text-foreground">统计类（需你同意）</strong>：自托管的 Umami 匿名统计（umami.xc-lr.cn），记录页面浏览与来源。你可以通过页脚"Cookie 设置"随时开启或关闭；关闭后统计脚本不会加载，已写入的本地数据会被清除。</li>
        </ul>
        <p>我们不出售你的个人信息，不接入广告跟踪网络。</p>
      </div>

      <div>
        <h2>四、第三方服务</h2>
        <p>本站完全运行在 Cloudflare 基础设施上，并使用以下服务处理有限数据：</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong className="text-foreground">Cloudflare</strong>：托管、CDN、IP 地理信息（用于统计与会话展示）、Turnstile 人机验证；</li>
          <li><strong className="text-foreground">Resend</strong>：发送验证邮件、密码重置邮件；</li>
          <li><strong className="text-foreground">Umami（自托管）</strong>：在你同意后的匿名访问统计。</li>
        </ul>
      </div>

      <div>
        <h2>五、数据保留与删除</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>浏览事件：30 天后自动删除；</li>
          <li>你删除的帖子/评论：立即从前台移除；</li>
          <li>上传的图片：删除所属内容后可由管理员清理；</li>
          <li>如需注销账号并删除相关数据，可通过站内信联系管理员处理。</li>
        </ul>
      </div>

      <div>
        <h2>六、你的权利</h2>
        <p>你有权访问、更正自己的账号信息（设置页），管理登录会话（设置 → 会话管理），通过"Cookie 设置"撤回统计同意。其他数据请求可联系管理员。</p>
      </div>

      <div>
        <h2>七、未成年人</h2>
        <p>本站面向一般用户。未成年人使用本站应在监护人指导下进行。</p>
      </div>

      <div>
        <h2>八、政策更新</h2>
        <p>我们可能不时更新本政策，重大变更会在站内公告。继续使用即表示接受更新后的政策。</p>
      </div>

      <div>
        <h2>九、联系我们</h2>
        <p>对本政策或数据处理有任何问题，可通过站内 @admin 或注册邮箱联系管理员。</p>
      </div>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell icon={<FileText className="size-5" />} title="用户协议" updated="2026 年 10 月 6 日">
      <p>
        欢迎使用 Starlr Forum（下称"本站"）。注册或使用本站即表示你已阅读、理解并同意本协议。如不同意，请停止使用。
      </p>

      <div>
        <h2>一、账号</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>每位用户注册一个账号，不得买卖、出租、出借账号；</li>
          <li>请妥善保管账号凭证，通过你账号进行的行为视为你本人的行为；</li>
          <li>本站实行禁言与封禁制度：违规将按情节给予限时禁言或永久封禁，处理原因会通知你并可在举报/申诉渠道沟通。</li>
        </ul>
      </div>

      <div>
        <h2>二、内容规范</h2>
        <p>你承诺不发布、不传播以下内容：</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>违反法律法规、危害国家安全与社会公共利益的内容；</li>
          <li>淫秽色情、暴力恐怖、赌博诈骗等违法信息；</li>
          <li>侵犯他人知识产权、名誉权、隐私权的内容；</li>
          <li>垃圾广告、恶意灌水、人肉攻击或其他破坏社区秩序的行为。</li>
        </ul>
      </div>

      <div>
        <h2>三、用户内容的权利与许可</h2>
        <p>你发布内容的著作权归你所有。发布即表示你授予本站在本站范围内非独家、免费的展示与传播许可（例如在列表、搜索、通知中展示），你不因此丧失对自己内容的任何权利。</p>
      </div>

      <div>
        <h2>四、平台的管理</h2>
        <p>为维护社区秩序，本站管理员可以对违规内容采取删除、关闭举报等措施，对违规账号采取禁言、封禁等措施，相关操作会记录审计日志。管理员行为同样受社区规则约束，你可以通过站内渠道申诉。</p>
      </div>

      <div>
        <h2>五、免责声明</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>本站按"现状"提供服务，不保证服务不中断或无错误，因维护、升级、不可抗力导致的服务中断不承担责任；</li>
          <li>用户发布的内容仅代表其个人观点，与本站立场无关；</li>
          <li>本站展示的外部链接内容不受我们控制，请自行甄别。</li>
        </ul>
      </div>

      <div>
        <h2>六、服务变更与终止</h2>
        <p>本站可能调整功能或暂停服务。你可以随时停止使用并删除自己的内容；严重违规的账号可能被终止服务。</p>
      </div>

      <div>
        <h2>七、法律适用</h2>
        <p>本协议适用中华人民共和国法律。因本协议产生的争议，双方应友好协商解决。</p>
      </div>

      <div>
        <h2>八、联系我们</h2>
        <p>对本协议有任何疑问，可通过站内 @admin 联系管理员。相关数据处理见
          <a href="/privacy">《隐私政策》</a>。
        </p>
      </div>
    </LegalShell>
  );
}

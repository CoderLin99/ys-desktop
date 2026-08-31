import { AiChatPanel } from "@/components/ai/ai-chat-panel";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * 登录后主工作台：后续在此挂载排盘、记录列表等业务模块。
 */
export default function WorkspacePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">工作台</h1>
        <p className="text-muted-foreground">
          架构骨架已就绪。下一步：从 ys-desktop 迁移排盘引擎或封装为 npm 包，在此调用。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">待接入模块</CardTitle>
          <CardDescription>
            lib/divination · api/divination/create · 会员/积分 · 管理后台
          </CardDescription>
        </CardHeader>
      </Card>

      <AiChatPanel />
    </div>
  );
}

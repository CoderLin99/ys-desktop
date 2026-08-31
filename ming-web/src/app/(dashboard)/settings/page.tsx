import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * 用户设置页占位（账号、订阅、API 偏好等）。
 */
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">设置</h1>
        <p className="text-muted-foreground">会员与支付模块可在 db/migrations 中扩展。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">账号</CardTitle>
          <CardDescription>邮箱密码由 Better Auth 管理</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          后续可在此接入：订阅状态、积分余额、发票记录。
        </CardContent>
      </Card>
    </div>
  );
}

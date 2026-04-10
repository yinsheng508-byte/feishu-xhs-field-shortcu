# 小红书扫码发布 - 飞书多维表格字段捷径
## 技术审查报告 & 打包上架清单

> 生成日期：2026-04-10  
> 审查范围：前端字段捷径（FaaS）+ 后端服务完整链路  
> 审查方式：静态代码阅读 + 本地执行验证（npm test / build / pack）

---

## 一、链路现状总结

### 1.1 链路通路结论

**主链路是通的，但有几段没有闭环。**

| 链路段 | 状态 | 说明 |
|--------|------|------|
| 字段捷径取值 & 校验 | ✅ 通 | 本地校验逻辑完整，三语国际化 |
| 前端 → 后端 `/execute` | ✅ 通 | API 路由、认证、限流均存在 |
| 后端下载飞书临时附件 | ✅ 通 | 含 30s 超时 + AbortController |
| 上传到腾讯 COS | ✅ 通 | 但 PUT 无超时（见问题 4） |
| 创建发布任务 + 生成二维码 | ✅ 通 | scene/taskId 生成、DB 写入完整 |
| 二维码写回飞书字段 | ✅ 通 | 返回 Attachment 类型符合规范 |
| 小红书扫码 → 预发布页消费 mediaInfo | ⚠️ 无法验证 | 扫码端源码不在本仓库，链路末端不可证 |
| 回调更新 PUBLISHED 状态 | ⚠️ 半通 | 回调入库完整，但处理失败无补偿（见问题 3） |
| 付费 / 额度校验 | 🔴 未闭环 | billing 字段由前端透传，后端不独立校验（见问题 1） |
| 来源身份验签 | 🔴 未实现 | baseSignature / packId 未在后端验证（见问题 1） |

### 1.2 打包状态

```
feishu-xhs-field-shortcu/output/
├── output_4_10_2026__9_59_28_AM.zip   ← Codex 执行 npm run pack 生成，结构合规
│   ├── build/index.js
│   ├── config.json
│   ├── meta.json
│   └── package.json
└── main.md                            ← 本文档
```

**打包本身合格**（走了 `npm run pack`，结构符合 FaaS 开发指南要求），`npm test`（12 项）、`npm run build`、`npm run check` 均通过。但注意：所有测试均 mock 了外部服务，未做飞书/COS/小红书真实联调。

---

## 二、核心问题（按优先级排列）

### 问题 1 — 🔴 P0：鉴权链路未闭环，付费与来源均可伪造

#### 1a. 后端不验证 baseSignature / packId

**位置**：[backend-remote-work/src/middleware/auth.js:33](../backend-remote-work/src/middleware/auth.js#L33)、[src/utils/validators.js:292](../backend-remote-work/src/utils/validators.js#L292)

飞书 FaaS 开发指南明确要求：

> 如果你的捷径需要调用你自己的后端服务，**务必在服务端使用文档提供的公钥和方法，对请求中的 `context.baseSignature` 和 `context.packID` 进行验签**，防止恶意调用。

当前后端的认证只有两种：`X-API-Key` 对比 env 中的固定值，或 HMAC-SHA256 签名。`auth.js` 完全不看 `source.baseSignature` 或 `source.packId`。`validators.js` 虽然接收这两个字段，但只做了字符串透传，没有任何验签逻辑。

**影响**：任何知道 API Key 的人都可以构造任意 `source`、`billing` 字段（含 `tenantKey`、`baseId`、`isNeedPayPack: false`、`hasQuota: true`）发请求，完全绕过飞书的身份约束。

#### 1b. API Key 硬编码在前端源码，随 ZIP 包提交

**位置**：[feishu-xhs-field-shortcu/src/index.ts:14-17](../feishu-xhs-field-shortcu/src/index.ts#L14-L17)

```typescript
const EXTERNAL_AUTH_CONFIG = {
  apiKey: 'lf_publish_api_key_20260215',  // ← 明文写死
  strict: true,
};
```

该常量在 `buildExternalAuthHeaders()`（line 350）中直接写入 `X-API-Key` 请求头，并随 `npm run pack` 编译打包进 `build/index.js`。

**影响**：
- 安全审核团队会审查 bundle 内容，Key 直接可读
- 结合 1a，拿到 Key 即可伪造任意租户请求
- 1a 和 1b 共同导致付费校验可绕过：只需携带 `billing: {isNeedPayPack: false, hasQuota: true}` 即可跳过付费拦截（[feishuShortcutService.js:252](../backend-remote-work/src/services/feishuShortcutService.js#L252)）

#### 正确的安全模型

后端应：
1. 用飞书官方公钥对 `(packId, baseSignature)` 做 RSA-SHA256 验签
2. 校验 packId 是否与已备案的插件一致
3. 独立从飞书服务端查询付费/额度状态，不信任前端传来的 `billing` 字段
4. 在此基础上才决定是否接受请求

---

### 问题 2 — 🟠 P1：幂等与限流都是单进程级，横向扩容后失效

**位置**：[backend-remote-work/src/services/idempotencyService.js:5,7](../backend-remote-work/src/services/idempotencyService.js#L5)、[src/middleware/rateLimit.js:3](../backend-remote-work/src/middleware/rateLimit.js#L3)

```javascript
// idempotencyService.js
this.inFlight = new Map();  // ← 纯内存

// rateLimit.js
this.buckets = new Map();   // ← 纯内存
```

`executeWithIdempotency` 的执行顺序是：先执行副作用（下载、上传、建任务），再 `INSERT OR IGNORE` 存结果（[idempotencyService.js:59](../backend-remote-work/src/services/idempotencyService.js#L59)）。即使是单进程，如果两个并发请求同时通过 `inFlight` 检查（时间窗口内），仍有可能两次都触发 `execute()`。

**影响**：
- 同一个 idempotencyKey 在多进程下可能触发多次上传、多次建任务
- 限流窗口在多实例下被各自独立计数，实际允许流量是配置值 × 实例数
- 当前是单实例部署（nginx → 127.0.0.1:18081），现阶段风险低，但不具备横向扩容能力

---

### 问题 3 — 🟠 P1：回调处理 ack 后异步执行，崩溃时状态永久丢失

**位置**：[backend-remote-work/src/controllers/callbackController.js:6](../backend-remote-work/src/controllers/callbackController.js#L6)、[src/services/callbackService.js:91](../backend-remote-work/src/services/callbackService.js#L91)

```javascript
// callbackController.js
this.callbackService.receiveCallback(req.body || {});  // 不 await
return res.status(200).type('text/plain').send('success');  // 先 200

// callbackService.js（queueRunner 默认是 setImmediate）
this.queueRunner(() => this.callbackWorkerService.process(logEntry));
```

小红书看到 200 后不会重发回调。真正的处理逻辑在 `setImmediate` 回调里，如果进程在此之后崩溃，或 `callbackWorkerService.process()` 抛出未被 catch 的错误，任务会永久停在 PENDING 状态。

仓库内没有：
- 定时扫描 `callback_logs.processed = 0` 并重试的补偿任务
- 死信队列或持久化消息队列
- 重启后自动重跑 unprocessed callback 的逻辑

**影响**：用户在小红书完成发布，但多维表格字段状态永远不会更新为 PUBLISHED。

---

### 问题 4 — 🟡 P2：上游网络调用部分缺少超时控制

**位置**：

| 调用 | 超时 | 文件 |
|------|------|------|
| 飞书临时附件下载 | ✅ 30s + AbortController | [feishuShortcutService.js:123-181](../backend-remote-work/src/services/feishuShortcutService.js#L123) |
| COS PUT 上传 | ❌ 无超时 | [feishuShortcutService.js:197-211](../backend-remote-work/src/services/feishuShortcutService.js#L197) |
| 小红书 token 接口 | ❌ 无超时 | [xhsTokenService.js:40](../backend-remote-work/src/services/xhsTokenService.js#L40) |
| 小红书二维码接口 | ❌ 无超时 | [xhsQRCodeService.js:34](../backend-remote-work/src/services/xhsQRCodeService.js#L34) |

nginx 配置了 `proxy_read_timeout 90s`，这是整条链路的兜底硬超时，但对于单个外部调用（尤其是大文件 COS 上传）来说粒度太粗。COS PUT 或小红书 API 卡住时，整条链路会等到 nginx 超时才收尾，期间资源被占用。

---

### 问题 5 — 🟡 P2：billing 校验完全信任前端传值

**位置**：[backend-remote-work/src/services/feishuShortcutService.js:252](../backend-remote-work/src/services/feishuShortcutService.js#L252)

```javascript
if (input.billing.isNeedPayPack && !input.billing.hasQuota) {
  throw new AppError('PAYMENT_REQUIRED', 'no remaining quota', 402);
}
```

`isNeedPayPack` 和 `hasQuota` 直接来自请求体，由前端从 `context` 读取后透传。虽然飞书平台在传递这两个字段时有签名保障，但由于问题 1（baseSignature 未验签），任何人都可以伪造这两个字段，使付费校验形同虚设。

---

### 问题 6 — 🟢 P3：其余稳定性隐患（低优先级）

| 隐患 | 说明 |
|------|------|
| 媒体下载/COS 上传无重试 | 一次网络抖动导致整批失败，需指数退避重试 |
| inFlight Map 无超时保护 | execute() 卡死时 Promise 不 settle，Map entry 永不释放 |
| 媒体 URL 预检查超时仅 3s | CDN 响应慢时合法请求被拒，建议 8-10s |
| 孤儿媒体资源无清理 | 任务建立失败后 COS 对象无引用，存储持续增长 |
| 扫码端链路不可验证 | 预发布页消费 `mediaInfo` 的逻辑不在本仓库 |

---

## 三、已符合规范的部分

| 项目 | 状态 | 说明 |
|------|------|------|
| 打包命令 | ✅ | 走 `npm run pack`，结构合规 |
| console.log 带 logID | ✅ | `debugLog()` 统一附加 `logID: context?.logID` |
| 域名白名单 | ✅ | 6 个域名均在 `addDomainList` 中声明 |
| 三语国际化 | ✅ | zh-CN / en-US / ja-JP 完整 |
| resultType | ✅ | 返回 `FieldType.Attachment`，符合规范 |
| 限流配置 | ✅ | 30 req/min 执行端，分级合理 |
| 回调签名验证 | ✅ | SHA1 + 时间戳 ±5min + Nonce 防重放 |
| AES 解密回调 | ✅ | XHS_ENCODING_AES_KEY 加密正确处理 |
| 幂等键字段 | ✅ | 24h 过期、DB 持久化（单进程下有效） |
| 错误码映射 | ✅ | ShortcutErrorCode → FieldCode 完整覆盖 |

---

## 四、上架结论

| 维度 | 结论 |
|------|------|
| **打包合格** | ✅ ZIP 结构正确，测试通过 |
| **功能链路** | ✅ 主链路通，但末端（扫码页）无法本地证明 |
| **生产安全性** | 🔴 **不达标** — baseSignature 未验签、API Key 裸露 |
| **并发稳定性** | 🟠 **单实例可用，不具备扩容能力** |
| **上架物料** | 🟠 **不完整** — 缺截图、视频、隐私政策、协议、自检清单 |
| **全量上线标准** | 🔴 **未达到** |

---

## 五、修复优先级清单

### 阻塞上架（必须修复）

| # | 问题 | 涉及文件 |
|---|------|----------|
| 1 | 后端增加 baseSignature + packId 验签 | `backend-remote-work/src/middleware/auth.js` |
| 2 | 前端移除硬编码 API Key，改为仅依赖验签 | `feishu-xhs-field-shortcu/src/index.ts:14-17` |
| 3 | 服务端独立校验付费状态（不信任前端 billing 字段） | `backend-remote-work/src/services/feishuShortcutService.js:252` |

### 生产稳定性（建议上线前修复）

| # | 问题 | 影响 |
|---|------|------|
| 4 | 回调处理增加补偿扫描（定时重跑 processed=0 的记录） | 防止发布后状态永久 PENDING |
| 5 | COS PUT、XHS token/QR 接口增加超时控制（10-30s） | 防外部卡住拖垮整条链路 |
| 6 | 媒体下载/上传增加指数退避重试（最多 3 次） | 降低偶发网络错误导致的失败率 |

### 扩容前修复（当前单实例可接受，扩容前必须解决）

| # | 问题 | 影响 |
|---|------|------|
| 7 | 幂等去重改为 DB 行锁或 Redis 原子操作（替换内存 inFlight） | 多实例下防重复任务 |
| 8 | 限流改为 Redis 滑动窗口（替换内存 Map） | 多实例下限流精度 |

### 物料准备（上架流程需要）

| # | 物料 | 要求 |
|---|------|------|
| 9 | 插件名称（中文 ≤15 字） | 简洁描述性，不含误导词 |
| 10 | 描述（中文 ≤100 字）+ 使用介绍（Markdown，≤1000 字） | 含功能、使用方法、限制条件 |
| 11 | 功能截图（580×320，中英各一张） | 反映真实运行效果 |
| 12 | 操作视频（≤20s，MP4 或 GIF） | 展示扫码发布全流程 |
| 13 | 隐私政策链接 + 用户使用协议链接 | 用飞书云文档发布，开启互联网可阅读 |
| 14 | 模板多维表格（5-10 行示例数据） | 供审核团队测试 |
| 15 | 自检清单回填 | 对照「多维表格应用 & 插件上线标准及自检清单.docx」逐项填写 |
| 16 | 安全问卷回填 | 含部署架构图、端口控制、WAF/DDoS 防护、联系人等 |

---

## 六、打包流程（修复完成后执行）

```bash
cd feishu-xhs-field-shortcu

# 1. 类型检查
npm run check

# 2. 单元测试
npm run unit

# 3. 生成上架包（禁止手动打包）
npm run pack
# → 输出 output/output_<timestamp>.zip

# 4. 提交到飞书插件中心，同步填写物料提交表单
```

> ⚠️ 注意：`npm run pack` 命令内含必要步骤，禁止手动修改或绕过，否则包结构错误无法上架。

---

## 七、运维持续指标（上架后）

| 指标 | 官方下架线 | 建议目标 |
|------|-----------|----------|
| 日调用成功率 | <80% 触发预警 | >95% |
| 日调用量 | <50 次考虑下架 | 尽快推广至 >100/天 |
| 回调处理延迟 | — | <5s P99 |
| 任务 PENDING 超 24h 率 | — | <1% |

日志排查：通过"字段捷径调试助手"按 logID 过滤，需提前配置插件管理员权限（联系上架群运营）。

---

*本文档综合人工代码审查 + Codex 静态分析结果生成，不含任何自动修改。最终上架以飞书平台审核结果为准。*

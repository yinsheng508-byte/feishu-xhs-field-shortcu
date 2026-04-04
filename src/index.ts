import {
  basekit,
  FieldType,
  field,
  FieldComponent,
  FieldCode,
} from '@lark-opdev/block-basekit-server-api';

const { t } = field;

const SHORTCUT_API =
  'https://publish.liuliangfeng.com/api/integrations/feishu/xhs-field-shortcut/execute';

const i18nMessages = {
  'zh-CN': {
    titleLabel: '标题字段',
    contentLabel: '正文字段',
    imagesLabel: '图片字段',
    tagsLabel: '标签字段',
    qrCodeLabel: '发布二维码',
    publishUrlLabel: '发布链接',
    statusLabel: '发布状态',
    successStatus: '✅ 发布成功，请扫码完成发布',
    missingTitle: '❌ 标题不能为空',
    missingContent: '正文可为空',
    missingCover: '❌ 封面图片不能为空',
    networkError: '❌ 网络请求失败，请稍后重试',
    authError: '❌ 请求来源验证失败，请联系管理员',
    validationError: '❌ 参数验证失败：{reason}',
    insufficientPoints: '❌ 剩余权益不足，请购买后重试',
    duplicateNote: '❌ 请求已处理，请勿重复提交',
    serverError: '❌ 服务器错误，请稍后重试',
    unknownError: '❌ 发布失败，请稍后重试',
    // 付费相关提示
    quotaExhausted: '❌ 使用次数已用完，请购买更多次数后继续使用',
    quotaExhaustedTip: '请在飞书插件中心购买更多次数后继续使用',
    paymentRequired: '❌ 此功能需要付费使用',
    paymentRequiredTip: '请按飞书插件中心购买引导完成开通后再使用',
  },
  'en-US': {
    titleLabel: 'Title',
    contentLabel: 'Content',
    imagesLabel: 'Images',
    tagsLabel: 'Tags',
    qrCodeLabel: 'XHS QR Code',
    publishUrlLabel: 'Publish URL',
    statusLabel: 'Status',
    successStatus: '✅ Published, scan the code to finish',
    missingTitle: '❌ Title is required',
    missingContent: 'Content may be empty',
    missingCover: '❌ Cover image is required',
    networkError: '❌ Network request failed, please retry later',
    authError: '❌ Request source validation failed, please contact admin',
    validationError: '❌ Validation failed: {reason}',
    insufficientPoints: '❌ No remaining entitlement, please purchase more and retry',
    duplicateNote: '❌ Request already processed, please do not resubmit',
    serverError: '❌ Server error, please retry later',
    unknownError: '❌ Publish failed, please retry',
    // Payment related messages
    quotaExhausted: '❌ Usage quota exhausted, please purchase more credits',
    quotaExhaustedTip: 'Please purchase more usage in Feishu Plugin Center before continuing',
    paymentRequired: '❌ This feature requires payment',
    paymentRequiredTip: 'Please complete the purchase flow in Feishu Plugin Center before using this feature',
  },
  'ja-JP': {
    titleLabel: 'タイトル',
    contentLabel: '本文',
    imagesLabel: '画像',
    tagsLabel: 'タグ',
    qrCodeLabel: '小紅書QRコード',
    publishUrlLabel: '公開リンク',
    statusLabel: 'ステータス',
    successStatus: '✅ 公開成功、QRをスキャンしてください',
    missingTitle: '❌ タイトルは必須です',
    missingContent: '本文は空でもかまいません',
    missingCover: '❌ カバー画像は必須です',
    networkError: '❌ ネットワークエラーが発生しました。後でもう一度お試しください',
    authError: '❌ リクエスト元の検証に失敗しました。管理者に連絡してください',
    validationError: '❌ パラメータ検証に失敗：{reason}',
    insufficientPoints: '❌ 利用可能な権益が不足しています。購入後に再試行してください',
    duplicateNote: '❌ このリクエストは既に処理されています。再送しないでください',
    serverError: '❌ サーバーエラー。後でもう一度お試しください',
    unknownError: '❌ 公開に失敗しました。再度お試しください',
    // 支払い関連メッセージ
    quotaExhausted: '❌ 使用回数が上限に達しました。追加購入してください',
    quotaExhaustedTip: '続行するには、Feishuプラグインセンターで利用回数を追加購入してください',
    paymentRequired: '❌ この機能は有料です',
    paymentRequiredTip: '利用前にFeishuプラグインセンターで購入手続きを完了してください',
  },
};

type LocaleKey = keyof typeof i18nMessages;

const getLocale = (locale?: string): LocaleKey => {
  const candidate = (locale || '').trim();
  if (candidate === 'en-US' || candidate === 'ja-JP') {
    return candidate;
  }
  return 'zh-CN';
};

const messageOf = (
  key: keyof typeof i18nMessages['zh-CN'],
  locale?: string,
  params?: Record<string, string | number>
): string => {
  const currentLocale = getLocale(locale);
  const template =
    i18nMessages[currentLocale][key] || i18nMessages['zh-CN'][key] || '';
  if (!params) {
    return template;
  }
  return Object.keys(params).reduce((msg, pKey) => {
    const value = String(params[pKey]);
    return msg.replace(`{${pKey}}`, value);
  }, template);
};

type AttachmentItem = {
  name?: string;
  tmp_url?: string;
  size?: number;
  type?: string;
};

type ExecuteParams = {
  titleField?: { text?: string }[];
  contentField?: { text?: string }[];
  imagesField?: AttachmentItem[];
  tagsField?: any;
};

type FeishuContext = {
  fetch: (url: string, options?: Record<string, any>) => Promise<any>;
  logID?: string;
  packID?: string;
  baseSignature?: string;
  tenantKey?: string;
  baseID?: string;
  tableID?: string;
  baseOwnerID?: string;
  timeZone?: string;
  isNeedPayPack?: boolean;
  hasQuota?: boolean;
};

type ShortcutExecuteRequest = {
  requestId: string;
  idempotencyKey: string;
  source: {
    platform: 'feishu_base';
    packId: string;
    baseSignature: string;
    tenantKey: string;
    baseId?: string;
    tableId?: string;
    baseOwnerId?: string;
    timeZone?: string;
  };
  billing: {
    isNeedPayPack: boolean;
    hasQuota: boolean;
  };
  note: {
    title: string;
    content: string;
    tags: string[];
    images: Array<{
      name: string;
      tmpUrl: string;
      size?: number;
      mime?: string;
    }>;
  };
};

type ShortcutSuccessResponse = {
  success: true;
  data?: {
    taskId?: string;
    bizId?: string;
    scene?: string;
    qrCodeUrl?: string;
    status?: 'PENDING' | 'PUBLISHED';
    createdAt?: string;
  };
};

type ShortcutErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED_SOURCE'
  | 'PAYMENT_REQUIRED'
  | 'QUOTA_EXHAUSTED'
  | 'RATE_LIMITED'
  | 'UPSTREAM_TEMPORARY_ERROR'
  | 'INTERNAL_ERROR';

type ShortcutErrorResponse = {
  success: false;
  error?: {
    code?: ShortcutErrorCode | string;
    message?: string;
  };
};

type ShortcutExecuteResponse = ShortcutSuccessResponse | ShortcutErrorResponse;

const ERROR_CODE_MAP: Record<ShortcutErrorCode, FieldCode> = {
  INVALID_INPUT: FieldCode.InvalidArgument,
  UNAUTHORIZED_SOURCE: FieldCode.AuthorizationError,
  PAYMENT_REQUIRED: FieldCode.PayError,
  QUOTA_EXHAUSTED: FieldCode.QuotaExhausted,
  RATE_LIMITED: FieldCode.RateLimit,
  UPSTREAM_TEMPORARY_ERROR: FieldCode.Error,
  INTERNAL_ERROR: FieldCode.Error,
};

const debugLog = (context: any, payload: any) => {
  console.log(
    JSON.stringify(
      {
        logID: context?.logID,
        ...payload,
      },
      null,
      2
    ),
    '\n'
  );
};

const extractPlainText = (value: any): string => {
  if (!Array.isArray(value)) {
    return '';
  }
  return value
    .map((item) => (item && typeof item.text === 'string' ? item.text : ''))
    .join('')
    .replace(/\r\n/g, '\n')
    .trim();
};

const normalizeTag = (tag: string): string => {
  // 去掉开头的 # 号，小红书 API 会自动添加
  const cleaned = tag.replace(/^#+/, '').trim();
  return cleaned;
};

const LETTER_ORDER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGIT_ORDER = '1234567890';

const parseTags = (tagsField: any): string[] => {
  if (!tagsField) return [];
  let candidates: string[] = [];

  if (Array.isArray(tagsField)) {
    const first = tagsField[0];
    if (typeof first === 'string') {
      candidates = tagsField as string[];
    } else if (first && typeof first === 'object' && 'text' in first) {
      const raw = (tagsField as { text?: string }[])
        .map((item) => item?.text || '')
        .join(' ');
      candidates = raw.split(/[#,\s]+/);
    }
  } else if (typeof tagsField === 'string') {
    candidates = tagsField.split(/[#,\s]+/);
  }

  const normalized: string[] = [];
  const seen = new Set<string>();
  candidates.forEach((tag) => {
    const normalizedTag = normalizeTag(tag);
    if (normalizedTag && !seen.has(normalizedTag)) {
      seen.add(normalizedTag);
      normalized.push(normalizedTag);
    }
  });
  return normalized;
};

const charCategory = (ch: string): number => {
  if (!ch) return -1;
  if (/[\u4e00-\u9fff]/.test(ch)) return 2;
  if (/[A-Za-z]/.test(ch)) return 1;
  if (/\d/.test(ch)) return 0;
  return -1;
};

const letterOrderRank = (ch: string): number => {
  const upper = ch.toUpperCase();
  const idx = LETTER_ORDER.indexOf(upper);
  return idx === -1 ? LETTER_ORDER.length : idx;
};

const digitOrderRank = (ch: string): number => {
  const idx = DIGIT_ORDER.indexOf(ch);
  return idx === -1 ? DIGIT_ORDER.length : idx;
};

const compareAttachmentName = (aName: string, bName: string): number => {
  const left = (aName || '').trim();
  const right = (bName || '').trim();
  let aIdx = 0;
  let bIdx = 0;

  while (aIdx < left.length || bIdx < right.length) {
    const aChar = left[aIdx] || '';
    const bChar = right[bIdx] || '';
    const aCat = charCategory(aChar);
    const bCat = charCategory(bChar);
    if (aCat !== bCat) {
      return bCat - aCat; // category: 汉字 > 字母 > 数字
    }

    if (aCat === 0) {
      const aMatch = left.slice(aIdx).match(/^\d+/)?.[0] || '';
      const bMatch = right.slice(bIdx).match(/^\d+/)?.[0] || '';
      const aNum = parseInt(aMatch, 10);
      const bNum = parseInt(bMatch, 10);
      if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) {
        return aNum - bNum; // 数字按自然数从小到大
      }
      if (aMatch.length !== bMatch.length) {
        return aMatch.length - bMatch.length;
      }
      aIdx += aMatch.length || 1;
      bIdx += bMatch.length || 1;
      continue;
    }

    if (aCat === 1) {
      const cmp = letterOrderRank(aChar) - letterOrderRank(bChar);
      if (cmp !== 0) return cmp;
    } else if (aCat === 2) {
      const cmp = aChar.localeCompare(bChar, 'zh-CN');
      if (cmp !== 0) return cmp;
    } else {
      const cmp = aChar.localeCompare(bChar, 'zh-CN');
      if (cmp !== 0) return cmp;
    }

    aIdx += 1;
    bIdx += 1;
  }

  return left.length - right.length;
};

const sortAttachments = (attachments: AttachmentItem[]): AttachmentItem[] => {
  return [...attachments].sort((a, b) => {
    const nameA = a?.name || '';
    const nameB = b?.name || '';
    return compareAttachmentName(nameA, nameB);
  });
};

const buildAttachmentResult = (
  options: {
    code?: FieldCode;
    qrCodeUrl?: string;
  }
) => {
  const { code = FieldCode.Success, qrCodeUrl } = options;
  if (qrCodeUrl) {
    return {
      code,
      data: [
        {
          name: 'xiaohongshu_qr.png',
          content: qrCodeUrl,
          contentType: 'attachment/url',
        },
      ],
    };
  }
  // 错误时返回空数组
  return {
    code,
    data: [],
  };
};

export const __test__ = {
  extractPlainText,
  parseTags,
  sortAttachments,
  compareAttachmentName,
  getLocale,
  messageOf,
};

basekit.addDomainList(['publish.liuliangfeng.com']);

/**
 * 付费状态检查结果
 */
type PaymentCheckResult = {
  passed: boolean;
  reason?: 'payment_required';
};

/**
 * 检查用户付费状态
 * @param context 执行上下文
 * @returns 付费检查结果
 */
const checkPaymentStatus = (context: any): PaymentCheckResult => {
  // context.isNeedPayPack: 是否是付费插件
  // context.hasQuota: 用户是否有剩余权益（有配额或在订阅期内）

  // 如果不是付费插件，直接通过
  if (!context.isNeedPayPack) {
    return { passed: true };
  }

  // 如果是付费插件但用户没有剩余额度
  if (!context.hasQuota) {
    return { passed: false, reason: 'payment_required' };
  }

  // 付费检查通过
  return { passed: true };
};

const normalizeBackendErrorCode = (
  value: unknown
): ShortcutErrorCode | undefined => {
  switch (value) {
    case 'INVALID_INPUT':
    case 'UNAUTHORIZED_SOURCE':
    case 'PAYMENT_REQUIRED':
    case 'QUOTA_EXHAUSTED':
    case 'RATE_LIMITED':
    case 'UPSTREAM_TEMPORARY_ERROR':
    case 'INTERNAL_ERROR':
      return value;
    default:
      return undefined;
  }
};

const buildShortcutRequest = (
  formItemParams: ExecuteParams,
  context: FeishuContext,
  title: string,
  content: string,
  sortedImages: AttachmentItem[],
  tags: string[]
): ShortcutExecuteRequest => {
  const requestId = context.logID || `xhs-${Date.now()}`;
  return {
    requestId,
    idempotencyKey: `xhs-${requestId}`,
    source: {
      platform: 'feishu_base',
      packId: context.packID || '',
      baseSignature: context.baseSignature || '',
      tenantKey: context.tenantKey || '',
      baseId: context.baseID,
      tableId: context.tableID,
      baseOwnerId: context.baseOwnerID,
      timeZone: context.timeZone || 'Asia/Shanghai',
    },
    billing: {
      isNeedPayPack: Boolean(context.isNeedPayPack),
      hasQuota: Boolean(context.hasQuota),
    },
    note: {
      title,
      content,
      tags,
      images: sortedImages.map((item) => ({
        name: item?.name || '',
        tmpUrl: item?.tmp_url || '',
        size: item?.size,
        mime: item?.type,
      })),
    },
  };
};

export const executeHandler = async (
  formItemParams: ExecuteParams,
  context: FeishuContext
) => {
  // ==================== 第1步：付费状态检查 ====================
  const paymentCheck = checkPaymentStatus(context);

  debugLog(context, {
    step: 'payment_check',
    isNeedPayPack: context.isNeedPayPack,
    hasQuota: context.hasQuota,
    tenantKey: context.tenantKey,
    passed: paymentCheck.passed,
    reason: paymentCheck.reason,
  });

  // 如果付费检查不通过，返回相应错误
  if (!paymentCheck.passed) {
    debugLog(context, {
      step: 'blocked',
      reason: paymentCheck.reason || 'payment_required',
    });
    return {
      code: FieldCode.PayError,
    };
  }

  // ==================== 第2步：参数提取与验证 ====================
  const titleRaw = extractPlainText(formItemParams.titleField);
  const contentRaw = extractPlainText(formItemParams.contentField);
  const title = titleRaw.slice(0, 20);
  const content = contentRaw;
  const attachments = Array.isArray(formItemParams.imagesField)
    ? formItemParams.imagesField.filter(Boolean)
    : [];
  const sortedImages = sortAttachments(attachments);
  const tags = parseTags(formItemParams.tagsField);

  debugLog(context, {
    step: 'input',
    titleLength: title.length,
    contentLength: content.length,
    imagesCount: sortedImages.length,
    tagsCount: tags.length,
  });

  if (!title) {
    debugLog(context, { step: 'error', reason: 'missing_title' });
    return buildAttachmentResult({ code: FieldCode.Error });
  }
  if (!sortedImages.length) {
    debugLog(context, { step: 'error', reason: 'missing_images' });
    return buildAttachmentResult({ code: FieldCode.Error });
  }

  const requestBody = buildShortcutRequest(
    formItemParams,
    context,
    title,
    content,
    sortedImages,
    tags
  );

  debugLog(context, {
    step: 'request',
    requestId: requestBody.requestId,
    idempotencyKey: requestBody.idempotencyKey,
    imagesCount: requestBody.note.images.length,
    tagsCount: requestBody.note.tags.length,
  });

  try {
    const response = await context.fetch(SHORTCUT_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': requestBody.idempotencyKey,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    let responseJson: ShortcutExecuteResponse | null = null;
    try {
      responseJson = JSON.parse(responseText) as ShortcutExecuteResponse;
    } catch (_err) {
      debugLog(context, { step: 'parse_error', responseText });
      return buildAttachmentResult({ code: FieldCode.Error });
    }

    debugLog(context, {
      step: 'response',
      status: response.status,
      success: responseJson?.success,
      errorCode:
        responseJson && responseJson.success === false && responseJson.error
          ? responseJson.error.code
          : undefined,
    });

    if (!response.ok || !responseJson || responseJson.success === false) {
      const backendCode = normalizeBackendErrorCode(
        responseJson && responseJson.success === false && responseJson.error
          ? responseJson.error.code
          : undefined
      );
      const mappedCode = backendCode
        ? ERROR_CODE_MAP[backendCode]
        : FieldCode.Error;
      debugLog(context, {
        step: 'api_error',
        backendCode,
        mappedCode,
        status: response.status,
      });
      return buildAttachmentResult({ code: mappedCode });
    }

    const data = responseJson.data || {};
    const qrUrl = data.qrCodeUrl || '';
    if (!qrUrl) {
      debugLog(context, { step: 'error', reason: 'no_qr_url' });
      return buildAttachmentResult({ code: FieldCode.Error });
    }

    debugLog(context, {
      step: 'success',
      taskId: data.taskId,
      status: data.status,
      qrUrl,
    });
    return buildAttachmentResult({ code: FieldCode.Success, qrCodeUrl: qrUrl });
  } catch (error) {
    debugLog(context, { step: 'network_error', error: String(error) });
    return buildAttachmentResult({ code: FieldCode.Error });
  }
};

basekit.addField({
  i18n: {
    messages: i18nMessages,
  },
  formItems: [
    {
      key: 'titleField',
      label: t('titleLabel'),
      component: FieldComponent.FieldSelect,
      props: {
        supportType: [FieldType.Text],
      },
      validator: { required: true },
    },
    {
      key: 'contentField',
      label: t('contentLabel'),
      component: FieldComponent.FieldSelect,
      props: {
        supportType: [FieldType.Text],
      },
    },
    {
      key: 'imagesField',
      label: t('imagesLabel'),
      component: FieldComponent.FieldSelect,
      props: {
        supportType: [FieldType.Attachment],
      },
      validator: { required: true },
    },
    {
      key: 'tagsField',
      label: t('tagsLabel'),
      component: FieldComponent.FieldSelect,
      props: {
        supportType: [FieldType.Text, FieldType.MultiSelect],
      },
    },
  ],
  resultType: {
    type: FieldType.Attachment,
  },
  execute: executeHandler,
});

export default basekit;

import {
  basekit,
  FieldType,
  field,
  FieldComponent,
  FieldCode,
} from '@lark-opdev/block-basekit-server-api';

const { t } = field;

const API_URL = 'https://prenote.limyai.com/api/openapi/publish_note';
const API_KEY = 'xhs_5bbd21069b386761bdd1e2124f41752426efb84f6f679558c9f9186f68c7f8d7';

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
    missingContent: '❌ 正文不能为空',
    missingCover: '❌ 封面图片不能为空',
    networkError: '❌ 网络请求失败，请稍后重试',
    authError: '❌ API密钥验证失败，请联系管理员',
    validationError: '❌ 参数验证失败：{reason}',
    insufficientPoints: '❌ 积分不足，请充值后重试',
    duplicateNote: '❌ 笔记ID已存在',
    serverError: '❌ 服务器错误，请稍后重试',
    unknownError: '❌ 发布失败，请稍后重试',
    // 付费相关提示
    quotaExhausted: '❌ 使用次数已用完，请购买更多次数后继续使用',
    quotaExhaustedTip: '每次成功发布消耗 0.1 元，请在插件设置中购买套餐',
    paymentRequired: '❌ 此功能需要付费使用',
    paymentRequiredTip: '首次使用可享受免费试用，之后每次发布 0.1 元',
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
    missingContent: '❌ Content is required',
    missingCover: '❌ Cover image is required',
    networkError: '❌ Network request failed, please retry later',
    authError: '❌ API key is invalid, please contact admin',
    validationError: '❌ Validation failed: {reason}',
    insufficientPoints: '❌ Insufficient credits, please recharge',
    duplicateNote: '❌ Note ID already exists',
    serverError: '❌ Server error, please retry later',
    unknownError: '❌ Publish failed, please retry',
    // Payment related messages
    quotaExhausted: '❌ Usage quota exhausted, please purchase more credits',
    quotaExhaustedTip: 'Each successful publish costs ¥0.1, please purchase a package in plugin settings',
    paymentRequired: '❌ This feature requires payment',
    paymentRequiredTip: 'First-time users get a free trial, then ¥0.1 per publish',
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
    missingContent: '❌ 本文は必須です',
    missingCover: '❌ カバー画像は必須です',
    networkError: '❌ ネットワークエラーが発生しました。後でもう一度お試しください',
    authError: '❌ APIキーが無効です。管理者に連絡してください',
    validationError: '❌ パラメータ検証に失敗：{reason}',
    insufficientPoints: '❌ ポイントが不足しています。チャージしてください',
    duplicateNote: '❌ ノートIDが既に存在します',
    serverError: '❌ サーバーエラー。後でもう一度お試しください',
    unknownError: '❌ 公開に失敗しました。再度お試しください',
    // 支払い関連メッセージ
    quotaExhausted: '❌ 使用回数が上限に達しました。追加購入してください',
    quotaExhaustedTip: '公開1回につき0.1元、プラグイン設定でパッケージを購入してください',
    paymentRequired: '❌ この機能は有料です',
    paymentRequiredTip: '初回は無料トライアル、以降は公開1回0.1元',
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

basekit.addDomainList(['prenote.limyai.com']);

/**
 * 付费状态检查结果
 */
type PaymentCheckResult = {
  passed: boolean;
  reason?: 'quota_exhausted' | 'payment_required';
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
    return { passed: false, reason: 'quota_exhausted' };
  }

  // 付费检查通过
  return { passed: true };
};

export const executeHandler = async (
  formItemParams: ExecuteParams,
  context: any
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
    if (paymentCheck.reason === 'quota_exhausted') {
      debugLog(context, { step: 'blocked', reason: 'quota_exhausted' });
      // 返回 QuotaExhausted 错误码，飞书会显示额度不足提示
      return {
        code: FieldCode.QuotaExhausted,
      };
    }

    // 其他付费错误
    debugLog(context, { step: 'blocked', reason: 'payment_required' });
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
  const coverImage = sortedImages[0]?.tmp_url || '';
  const bodyImages = sortedImages
    .slice(1)
    .map((item) => item?.tmp_url || '')
    .filter(Boolean);
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
  if (!content) {
    debugLog(context, { step: 'error', reason: 'missing_content' });
    return buildAttachmentResult({ code: FieldCode.Error });
  }
  if (!coverImage) {
    debugLog(context, { step: 'error', reason: 'missing_cover' });
    return buildAttachmentResult({ code: FieldCode.Error });
  }

  const idempotencyKey = `${context?.logID || 'xhs'}-${Date.now()}`;
  const payload: Record<string, any> = {
    title,
    content,
    coverImage,
  };
  if (bodyImages.length) {
    payload.images = bodyImages;
  }
  if (tags.length) {
    payload.tags = tags;
  }

  debugLog(context, {
    step: 'request',
    payloadPreview: JSON.stringify(payload).slice(0, 300),
  });

  try {
    const response = await (context as any).fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseJson: any;
    try {
      responseJson = JSON.parse(responseText);
    } catch (err) {
      debugLog(context, { step: 'parse_error', responseText });
      return buildAttachmentResult({ code: FieldCode.Error });
    }

    debugLog(context, {
      step: 'response',
      status: response.status,
      bodyPreview: responseText.slice(0, 500),
    });

    if (!response.ok || responseJson?.success === false) {
      const errorType =
        responseJson?.error_type ||
        responseJson?.error ||
        responseJson?.errorCode ||
        responseJson?.error_code ||
        responseJson?.code;
      debugLog(context, { step: 'api_error', errorType, status: response.status });
      return buildAttachmentResult({ code: FieldCode.Error });
    }

    const data = responseJson?.data || {};
    const qrUrl = data.xiaohongshu_qr_image_url || '';
    if (!qrUrl) {
      debugLog(context, { step: 'error', reason: 'no_qr_url' });
      return buildAttachmentResult({ code: FieldCode.Error });
    }

    debugLog(context, { step: 'success', qrUrl });
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
      validator: { required: true },
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

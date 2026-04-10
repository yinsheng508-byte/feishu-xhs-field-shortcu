import {
  basekit,
  FieldType,
  field,
  FieldComponent,
  FieldCode,
} from '@lark-opdev/block-basekit-server-api';

const { t } = field;

const API_BASE = 'https://publish.liuliangfeng.com/api';
const FEISHU_SHORTCUT_EXECUTE_API = `${API_BASE}/integrations/feishu/xhs-field-shortcut/execute`;

const EXTERNAL_AUTH_CONFIG = {
  apiKey: 'lf_publish_api_key_20260215',
  strict: true,
};

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
]);
const IMAGE_FILE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
]);
const VIDEO_FILE_EXTENSIONS = new Set([
  '.mp4',
  '.mov',
]);

const i18nMessages = {
  'zh-CN': {
    titleLabel: '标题字段',
    contentLabel: '正文字段',
    mediaLabel: '图片/视频字段',
    tagsLabel: '标签字段',
    qrCodeLabel: '发布二维码',
    publishUrlLabel: '发布链接',
    statusLabel: '发布状态',
    successStatus: '✅ 发布成功，请扫码完成发布',
    missingTitle: '❌ 标题不能为空',
    missingContent: '正文可为空',
    missingMedia: '❌ 图片/视频不能为空',
    unsupportedMediaType: '❌ 存在不支持的图片/视频格式',
    multipleVideosNotAllowed: '❌ 不支持同时上传多个视频',
    videoWithMultipleImagesNotAllowed: '❌ 单个视频仅允许不带封面或搭配 1 张封面图',
    networkError: '❌ 网络请求失败，请稍后重试',
    authError: '❌ 请求来源验证失败，请联系管理员',
    validationError: '❌ 参数验证失败：{reason}',
    insufficientPoints: '❌ 剩余权益不足，请购买后重试',
    duplicateNote: '❌ 请求已处理，请勿重复提交',
    serverError: '❌ 服务器错误，请稍后重试',
    unknownError: '❌ 发布失败，请稍后重试',
    quotaExhausted: '❌ 使用次数已用完，请购买更多次数后继续使用',
    quotaExhaustedTip: '请在飞书插件中心购买更多次数后继续使用',
    paymentRequired: '❌ 此功能需要付费使用',
    paymentRequiredTip: '请按飞书插件中心购买引导完成开通后再使用',
  },
  'en-US': {
    titleLabel: 'Title',
    contentLabel: 'Content',
    mediaLabel: 'Image/Video',
    tagsLabel: 'Tags',
    qrCodeLabel: 'XHS QR Code',
    publishUrlLabel: 'Publish URL',
    statusLabel: 'Status',
    successStatus: '✅ Published, scan the code to finish',
    missingTitle: '❌ Title is required',
    missingContent: 'Content may be empty',
    missingMedia: '❌ Image or video is required',
    unsupportedMediaType: '❌ Unsupported image or video format detected',
    multipleVideosNotAllowed: '❌ Multiple videos are not supported',
    videoWithMultipleImagesNotAllowed: '❌ A single video can only have zero or one cover image',
    networkError: '❌ Network request failed, please retry later',
    authError: '❌ Request source validation failed, please contact admin',
    validationError: '❌ Validation failed: {reason}',
    insufficientPoints: '❌ No remaining entitlement, please purchase more and retry',
    duplicateNote: '❌ Request already processed, please do not resubmit',
    serverError: '❌ Server error, please retry later',
    unknownError: '❌ Publish failed, please retry',
    quotaExhausted: '❌ Usage quota exhausted, please purchase more credits',
    quotaExhaustedTip: 'Please purchase more usage in Feishu Plugin Center before continuing',
    paymentRequired: '❌ This feature requires payment',
    paymentRequiredTip: 'Please complete the purchase flow in Feishu Plugin Center before using this feature',
  },
  'ja-JP': {
    titleLabel: 'タイトル',
    contentLabel: '本文',
    mediaLabel: '画像/動画',
    tagsLabel: 'タグ',
    qrCodeLabel: '小紅書QRコード',
    publishUrlLabel: '公開リンク',
    statusLabel: 'ステータス',
    successStatus: '✅ 公開成功、QRをスキャンしてください',
    missingTitle: '❌ タイトルは必須です',
    missingContent: '本文は空でもかまいません',
    missingMedia: '❌ 画像または動画は必須です',
    unsupportedMediaType: '❌ サポートされていない画像または動画形式が含まれています',
    multipleVideosNotAllowed: '❌ 複数動画の同時アップロードはサポートされていません',
    videoWithMultipleImagesNotAllowed: '❌ 単一動画に設定できるカバー画像は 0 枚または 1 枚のみです',
    networkError: '❌ ネットワークエラーが発生しました。後でもう一度お試しください',
    authError: '❌ リクエスト元の検証に失敗しました。管理者に連絡してください',
    validationError: '❌ パラメータ検証に失敗：{reason}',
    insufficientPoints: '❌ 利用可能な権益が不足しています。購入後に再試行してください',
    duplicateNote: '❌ このリクエストは既に処理されています。再送しないでください',
    serverError: '❌ サーバーエラー。後でもう一度お試しください',
    unknownError: '❌ 公開に失敗しました。再度お試しください',
    quotaExhausted: '❌ 使用回数が上限に達しました。追加購入してください',
    quotaExhaustedTip: '続行するには、Feishuプラグインセンターで利用回数を追加購入してください',
    paymentRequired: '❌ この機能は有料です',
    paymentRequiredTip: '利用前にFeishuプラグインセンターで購入手続きを完了してください',
  },
};

type LocaleKey = keyof typeof i18nMessages;
type I18nMessageKey = keyof typeof i18nMessages['zh-CN'];
type MediaKind = 'image' | 'video' | 'unknown';
type MediaValidationReason =
  | 'missing_media'
  | 'unsupported_media_type'
  | 'multiple_videos_not_allowed'
  | 'video_with_multiple_images_not_allowed';

type AttachmentItem = {
  name?: string;
  tmp_url?: string;
  size?: number;
  type?: string;
};

type ExecuteParams = {
  titleField?: { text?: string }[];
  contentField?: { text?: string }[];
  mediaField?: AttachmentItem[];
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

type ShortcutMediaItem = {
  name: string;
  tmpUrl: string;
  size?: number;
  mime?: string;
};

type ShortcutMediaInput =
  | {
      type: 'image';
      items: ShortcutMediaItem[];
    }
  | {
      type: 'video';
      items: [ShortcutMediaItem];
      cover?: ShortcutMediaItem;
    };

type RequestContextMeta = {
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
};

type ShortcutExecuteRequest = RequestContextMeta & {
  note: {
    title: string;
    content: string;
    tags: string[];
    media: ShortcutMediaInput;
  };
};

type ShortcutExecuteResponseData = {
  taskId?: string;
  bizId?: string;
  scene?: string;
  qrCodeUrl?: string;
  status?: 'PENDING' | 'PUBLISHED';
  createdAt?: string;
};

type ShortcutErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED_SOURCE'
  | 'PAYMENT_REQUIRED'
  | 'QUOTA_EXHAUSTED'
  | 'RATE_LIMITED'
  | 'INVALID_MEDIA'
  | 'INVALID_MEDIA_URL'
  | 'INVALID_CONTENT_TYPE'
  | 'INVALID_MEDIA_HEADER'
  | 'INVALID_MEDIA_TYPE'
  | 'INVALID_TITLE'
  | 'INVALID_CONTENT'
  | 'MEDIA_NOT_FOUND'
  | 'MEDIA_NOT_UPLOADED'
  | 'VIDEO_NOT_PUBLISHABLE'
  | 'MEDIA_NOT_CONFIRMED'
  | 'VIDEO_COMPATIBILITY_CHECK_FAILED'
  | 'UPSTREAM_TEMPORARY_ERROR'
  | 'INTERNAL_ERROR';

type ApiErrorResponse = {
  success: false;
  code?: string;
  message?: string;
  data?: any;
};

type ApiSuccessResponse<T> = {
  success: true;
  code?: string;
  message?: string;
  data?: T;
};

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

type NormalizedPluginMedia =
  | {
      type: 'image';
      items: AttachmentItem[];
      imageCount: number;
      videoCount: number;
      hasCover: false;
    }
  | {
      type: 'video';
      items: [AttachmentItem];
      cover?: AttachmentItem;
      imageCount: number;
      videoCount: number;
      hasCover: boolean;
    };

type MediaValidationResult =
  | {
      ok: true;
      media: NormalizedPluginMedia;
    }
  | {
      ok: false;
      reason: MediaValidationReason;
      imageCount: number;
      videoCount: number;
      unsupportedNames?: string[];
    };

type PaymentCheckResult = {
  passed: boolean;
  reason?: 'payment_required';
};

const ERROR_CODE_MAP: Record<ShortcutErrorCode, FieldCode> = {
  INVALID_INPUT: FieldCode.InvalidArgument,
  INVALID_MEDIA: FieldCode.InvalidArgument,
  INVALID_MEDIA_URL: FieldCode.InvalidArgument,
  INVALID_CONTENT_TYPE: FieldCode.InvalidArgument,
  INVALID_MEDIA_HEADER: FieldCode.InvalidArgument,
  INVALID_MEDIA_TYPE: FieldCode.InvalidArgument,
  INVALID_TITLE: FieldCode.InvalidArgument,
  INVALID_CONTENT: FieldCode.InvalidArgument,
  UNAUTHORIZED_SOURCE: FieldCode.AuthorizationError,
  PAYMENT_REQUIRED: FieldCode.PayError,
  QUOTA_EXHAUSTED: FieldCode.QuotaExhausted,
  RATE_LIMITED: FieldCode.RateLimit,
  MEDIA_NOT_FOUND: FieldCode.InvalidArgument,
  MEDIA_NOT_UPLOADED: FieldCode.InvalidArgument,
  VIDEO_NOT_PUBLISHABLE: FieldCode.InvalidArgument,
  MEDIA_NOT_CONFIRMED: FieldCode.InvalidArgument,
  VIDEO_COMPATIBILITY_CHECK_FAILED: FieldCode.Error,
  UPSTREAM_TEMPORARY_ERROR: FieldCode.Error,
  INTERNAL_ERROR: FieldCode.Error,
};

const getLocale = (locale?: string): LocaleKey => {
  const candidate = (locale || '').trim();
  if (candidate === 'en-US' || candidate === 'ja-JP') {
    return candidate;
  }
  return 'zh-CN';
};

const messageOf = (
  key: I18nMessageKey,
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

const buildExternalAuthHeaders = (): Record<string, string> => {
  if (!EXTERNAL_AUTH_CONFIG.strict || !EXTERNAL_AUTH_CONFIG.apiKey) {
    return {};
  }
  return {
    'X-API-Key': EXTERNAL_AUTH_CONFIG.apiKey,
  };
};

const parseJsonResponse = async <T>(response: any) => {
  const text = await response.text();
  let json: T | null = null;
  try {
    json = text ? (JSON.parse(text) as T) : null;
  } catch (_err) {
    json = null;
  }
  return {
    ok: Boolean(response.ok),
    status: Number(response.status || 0),
    text,
    json,
  };
};

class BackendApiError extends Error {
  status: number;
  code?: string;
  details?: any;

  constructor(options: {
    status: number;
    code?: string;
    message?: string;
    details?: any;
  }) {
    super(options.message || options.code || 'backend api error');
    this.name = 'BackendApiError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

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
      return bCat - aCat;
    }

    if (aCat === 0) {
      const aMatch = left.slice(aIdx).match(/^\d+/)?.[0] || '';
      const bMatch = right.slice(bIdx).match(/^\d+/)?.[0] || '';
      const aNum = parseInt(aMatch, 10);
      const bNum = parseInt(bMatch, 10);
      if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) {
        return aNum - bNum;
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

const normalizeMime = (value?: string): string => {
  return String(value || '')
    .toLowerCase()
    .split(';')[0]
    .trim();
};

const getFileExtension = (name?: string): string => {
  return String(name || '')
    .trim()
    .toLowerCase()
    .match(/\.[^.]+$/)?.[0] || '';
};

const detectAttachmentKind = (attachment: AttachmentItem): MediaKind => {
  const mime = normalizeMime(attachment.type);
  if (IMAGE_MIME_TYPES.has(mime)) return 'image';
  if (VIDEO_MIME_TYPES.has(mime)) return 'video';

  const ext = getFileExtension(attachment.name);
  if (IMAGE_FILE_EXTENSIONS.has(ext)) return 'image';
  if (VIDEO_FILE_EXTENSIONS.has(ext)) return 'video';
  return 'unknown';
};

const normalizeSelectedMedia = (
  attachments: AttachmentItem[]
): MediaValidationResult => {
  const items = Array.isArray(attachments) ? attachments.filter(Boolean) : [];
  if (!items.length) {
    return {
      ok: false,
      reason: 'missing_media',
      imageCount: 0,
      videoCount: 0,
    };
  }

  const images: AttachmentItem[] = [];
  const videos: AttachmentItem[] = [];
  const unsupported: AttachmentItem[] = [];

  items.forEach((attachment) => {
    const kind = detectAttachmentKind(attachment);
    if (kind === 'image') {
      images.push(attachment);
      return;
    }
    if (kind === 'video') {
      videos.push(attachment);
      return;
    }
    unsupported.push(attachment);
  });

  if (unsupported.length) {
    return {
      ok: false,
      reason: 'unsupported_media_type',
      imageCount: images.length,
      videoCount: videos.length,
      unsupportedNames: unsupported.map((item) => item.name || ''),
    };
  }

  if (videos.length >= 2) {
    return {
      ok: false,
      reason: 'multiple_videos_not_allowed',
      imageCount: images.length,
      videoCount: videos.length,
    };
  }

  if (videos.length === 1 && images.length > 1) {
    return {
      ok: false,
      reason: 'video_with_multiple_images_not_allowed',
      imageCount: images.length,
      videoCount: videos.length,
    };
  }

  if (videos.length === 1) {
    const cover = images.length === 1 ? sortAttachments(images)[0] : undefined;
    return {
      ok: true,
      media: {
        type: 'video',
        items: [videos[0]],
        cover,
        imageCount: images.length,
        videoCount: videos.length,
        hasCover: Boolean(cover),
      },
    };
  }

  return {
    ok: true,
    media: {
      type: 'image',
      items: sortAttachments(images),
      imageCount: images.length,
      videoCount: videos.length,
      hasCover: false,
    },
  };
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
  return { code };
};

const checkPaymentStatus = (context: any): PaymentCheckResult => {
  if (!context.isNeedPayPack) {
    return { passed: true };
  }
  if (!context.hasQuota) {
    return { passed: false, reason: 'payment_required' };
  }
  return { passed: true };
};

const normalizeBackendErrorCode = (
  value: unknown
): ShortcutErrorCode | undefined => {
  switch (value) {
    case 'INVALID_INPUT':
    case 'INVALID_REQUEST':
      return 'INVALID_INPUT';
    case 'INVALID_MEDIA':
      return 'INVALID_MEDIA';
    case 'INVALID_MEDIA_URL':
      return 'INVALID_MEDIA_URL';
    case 'INVALID_CONTENT_TYPE':
      return 'INVALID_CONTENT_TYPE';
    case 'INVALID_MEDIA_HEADER':
      return 'INVALID_MEDIA_HEADER';
    case 'INVALID_TITLE':
      return 'INVALID_TITLE';
    case 'INVALID_CONTENT':
      return 'INVALID_CONTENT';
    case 'INVALID_MEDIA_TYPE':
      return 'INVALID_MEDIA_TYPE';
    case 'UNAUTHORIZED_SOURCE':
    case 'UNAUTHORIZED':
      return 'UNAUTHORIZED_SOURCE';
    case 'PAYMENT_REQUIRED':
      return 'PAYMENT_REQUIRED';
    case 'QUOTA_EXHAUSTED':
      return 'QUOTA_EXHAUSTED';
    case 'RATE_LIMITED':
      return 'RATE_LIMITED';
    case 'MEDIA_NOT_FOUND':
      return 'MEDIA_NOT_FOUND';
    case 'MEDIA_NOT_UPLOADED':
      return 'MEDIA_NOT_UPLOADED';
    case 'VIDEO_NOT_PUBLISHABLE':
      return 'VIDEO_NOT_PUBLISHABLE';
    case 'MEDIA_NOT_CONFIRMED':
      return 'MEDIA_NOT_CONFIRMED';
    case 'VIDEO_COMPATIBILITY_CHECK_FAILED':
      return 'VIDEO_COMPATIBILITY_CHECK_FAILED';
    case 'UPSTREAM_TEMPORARY_ERROR':
      return 'UPSTREAM_TEMPORARY_ERROR';
    case 'INTERNAL_ERROR':
      return 'INTERNAL_ERROR';
    default:
      return undefined;
  }
};

const toShortcutMediaItem = (item: AttachmentItem): ShortcutMediaItem => ({
  name: item?.name || '',
  tmpUrl: item?.tmp_url || '',
  size: item?.size,
  mime: item?.type,
});

const buildRequestContextMeta = (
  context: FeishuContext,
): RequestContextMeta => {
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
  };
};

const buildShortcutExecuteRequest = (
  requestMeta: RequestContextMeta,
  title: string,
  content: string,
  tags: string[],
  media: ShortcutMediaInput
): ShortcutExecuteRequest => {
  return {
    ...requestMeta,
    note: {
      title,
      content,
      tags,
      media,
    },
  };
};

const buildApiHeaders = (
  extraHeaders?: Record<string, string>
): Record<string, string> => {
  return {
    ...buildExternalAuthHeaders(),
    ...(extraHeaders || {}),
  };
};

const requestBackendApi = async <T>(
  context: FeishuContext,
  url: string,
  options: Record<string, any>
): Promise<T> => {
  const response = await context.fetch(url, options);
  const parsed = await parseJsonResponse<ApiResponse<T>>(response);
  const responseJson = parsed.json;

  if (!responseJson) {
    throw new BackendApiError({
      status: parsed.status,
      code: 'INTERNAL_ERROR',
      message: parsed.text || 'invalid backend response',
    });
  }

  if (!parsed.ok || responseJson.success === false) {
    throw new BackendApiError({
      status: parsed.status,
      code: responseJson.code,
      message: responseJson.message,
      details: responseJson.data,
    });
  }

  return (responseJson.data || {}) as T;
};

const mapValidationReasonToFieldCode = (): FieldCode => {
  return FieldCode.InvalidArgument;
};

export const executeHandler = async (
  formItemParams: ExecuteParams,
  context: FeishuContext
) => {
  const paymentCheck = checkPaymentStatus(context);

  debugLog(context, {
    step: 'payment_check',
    isNeedPayPack: context.isNeedPayPack,
    hasQuota: context.hasQuota,
    tenantKey: context.tenantKey,
    passed: paymentCheck.passed,
    reason: paymentCheck.reason,
  });

  if (!paymentCheck.passed) {
    debugLog(context, {
      step: 'blocked',
      reason: paymentCheck.reason || 'payment_required',
    });
    return {
      code: FieldCode.PayError,
    };
  }

  const titleRaw = extractPlainText(formItemParams.titleField);
  const contentRaw = extractPlainText(formItemParams.contentField);
  const title = titleRaw.slice(0, 20);
  const content = contentRaw;
  const selectedMedia = normalizeSelectedMedia(formItemParams.mediaField || []);
  const tags = parseTags(formItemParams.tagsField);
  let imageCount = 0;
  let videoCount = 0;
  let unsupportedNames: string[] | undefined;
  if (selectedMedia.ok) {
    imageCount = selectedMedia.media.imageCount;
    videoCount = selectedMedia.media.videoCount;
  } else {
    const invalidMedia = selectedMedia as Extract<
      MediaValidationResult,
      { ok: false }
    >;
    imageCount = invalidMedia.imageCount;
    videoCount = invalidMedia.videoCount;
    unsupportedNames = invalidMedia.unsupportedNames;
  }

  debugLog(context, {
    step: 'input',
    titleLength: title.length,
    contentLength: content.length,
    mediaValidationOk: selectedMedia.ok,
    imageCount,
    videoCount,
    tagsCount: tags.length,
    unsupportedNames,
  });

  if (!title) {
    debugLog(context, { step: 'error', reason: 'missing_title' });
    return buildAttachmentResult({ code: FieldCode.InvalidArgument });
  }

  if (!selectedMedia.ok) {
    const invalidMedia = selectedMedia as Extract<
      MediaValidationResult,
      { ok: false }
    >;
    debugLog(context, {
      step: 'error',
      reason: invalidMedia.reason,
      imageCount,
      videoCount,
      unsupportedNames,
    });
    return buildAttachmentResult({
      code: mapValidationReasonToFieldCode(),
    });
  }

  const requestMeta = buildRequestContextMeta(context);

  debugLog(context, {
    step: 'request',
    requestId: requestMeta.requestId,
    idempotencyKey: requestMeta.idempotencyKey,
    mediaType: selectedMedia.media.type,
    itemCount: selectedMedia.media.items.length,
    hasCover:
      selectedMedia.media.type === 'video' && Boolean(selectedMedia.media.cover),
    tagsCount: tags.length,
  });

  try {
    const executeRequest = buildShortcutExecuteRequest(
      requestMeta,
      title,
      content,
      tags,
      selectedMedia.media.type === 'image'
        ? {
            type: 'image',
            items: selectedMedia.media.items.map((item) =>
              toShortcutMediaItem(item)
            ),
          }
        : {
            type: 'video',
            items: [toShortcutMediaItem(selectedMedia.media.items[0])],
            ...(selectedMedia.media.cover
              ? {
                  cover: toShortcutMediaItem(selectedMedia.media.cover),
                }
              : {}),
          }
    );

    debugLog(context, {
      step: 'execute_started',
      mediaType: executeRequest.note.media.type,
      itemCount: executeRequest.note.media.items.length,
      hasCover:
        executeRequest.note.media.type === 'video' &&
        Boolean(executeRequest.note.media.cover),
    });

    const data = await requestBackendApi<ShortcutExecuteResponseData>(
      context,
      FEISHU_SHORTCUT_EXECUTE_API,
      {
        method: 'POST',
        headers: buildApiHeaders({
          'Content-Type': 'application/json',
          'X-Idempotency-Key': requestMeta.idempotencyKey,
        }),
        body: JSON.stringify(executeRequest),
      }
    );

    debugLog(context, {
      step: 'execute_succeeded',
      taskId: data.taskId,
      status: data.status,
      qrUrl: data.qrCodeUrl,
    });

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
    if (error instanceof BackendApiError) {
      const backendCode = normalizeBackendErrorCode(error.code);
      const mappedCode =
        error.status === 401 || error.status === 403
          ? FieldCode.AuthorizationError
          : error.status === 402
            ? FieldCode.PayError
            : error.status === 429
              ? FieldCode.RateLimit
              : backendCode
                ? ERROR_CODE_MAP[backendCode]
                : FieldCode.Error;
      debugLog(context, {
        step: 'api_error',
        backendCode,
        mappedCode,
        status: error.status,
        message: error.message,
      });
      return buildAttachmentResult({ code: mappedCode });
    }
    debugLog(context, { step: 'network_error', error: String(error) });
    return buildAttachmentResult({ code: FieldCode.Error });
  }
};

export const __test__ = {
  extractPlainText,
  parseTags,
  sortAttachments,
  compareAttachmentName,
  detectAttachmentKind,
  normalizeSelectedMedia,
  getLocale,
  messageOf,
};

basekit.addDomainList([
  'publish.liuliangfeng.com',
  'feishu.cn',
  'feishucdn.com',
  'larksuite.com',
  'larksuitecdn.com',
  'myqcloud.com',
]);

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
      key: 'mediaField',
      label: t('mediaLabel'),
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

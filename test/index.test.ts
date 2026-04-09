import assert from 'node:assert/strict';
import { FieldCode } from '@lark-opdev/block-basekit-server-api';
import { __test__, executeHandler } from '../src/index';

const { detectAttachmentKind, normalizeSelectedMedia } = __test__;

async function main() {
  assert.equal(
    detectAttachmentKind({
      name: 'cover.jpg',
      type: 'image/jpeg',
    }),
    'image'
  );

  assert.equal(
    detectAttachmentKind({
      name: 'video.mp4',
      type: 'video/mp4',
    }),
    'video'
  );

  assert.equal(
    detectAttachmentKind({
      name: 'mystery.bin',
      type: 'application/octet-stream',
    }),
    'unknown'
  );

  const imageMode = normalizeSelectedMedia([
    { name: '02.jpg', tmp_url: 'https://tmp.example.com/02.jpg', type: 'image/jpeg' },
    { name: '01.jpg', tmp_url: 'https://tmp.example.com/01.jpg', type: 'image/jpeg' },
  ]);

  assert.equal(imageMode.ok, true);
  if (imageMode.ok) {
    assert.equal(imageMode.media.type, 'image');
    assert.deepEqual(
      imageMode.media.items.map((item: { name?: string }) => item.name),
      ['01.jpg', '02.jpg']
    );
  }

  const videoMode = normalizeSelectedMedia([
    { name: 'video.mp4', tmp_url: 'https://tmp.example.com/video.mp4', type: 'video/mp4' },
    { name: 'cover.jpg', tmp_url: 'https://tmp.example.com/cover.jpg', type: 'image/jpeg' },
  ]);

  assert.equal(videoMode.ok, true);
  if (videoMode.ok) {
    assert.equal(videoMode.media.type, 'video');
    assert.equal(videoMode.media.hasCover, true);
    assert.equal(videoMode.media.cover?.name, 'cover.jpg');
  }

  const multiVideo = normalizeSelectedMedia([
    { name: 'video-1.mp4', tmp_url: 'https://tmp.example.com/video-1.mp4', type: 'video/mp4' },
    { name: 'video-2.mov', tmp_url: 'https://tmp.example.com/video-2.mov', type: 'video/quicktime' },
  ]);

  assert.equal(multiVideo.ok, false);
  if (!multiVideo.ok) {
    assert.equal(multiVideo.reason, 'multiple_videos_not_allowed');
  }

  const videoWithMultipleImages = normalizeSelectedMedia([
    { name: 'video.mp4', tmp_url: 'https://tmp.example.com/video.mp4', type: 'video/mp4' },
    { name: 'cover-1.jpg', tmp_url: 'https://tmp.example.com/cover-1.jpg', type: 'image/jpeg' },
    { name: 'cover-2.jpg', tmp_url: 'https://tmp.example.com/cover-2.jpg', type: 'image/jpeg' },
  ]);

  assert.equal(videoWithMultipleImages.ok, false);
  if (!videoWithMultipleImages.ok) {
    assert.equal(videoWithMultipleImages.reason, 'video_with_multiple_images_not_allowed');
  }

  let receivedPublishTaskBody: any = null;
  const executeVideoResult = await executeHandler(
    {
      titleField: [{ text: '视频标题' }],
      contentField: [{ text: '视频内容' }],
      mediaField: [
        { name: 'video.mp4', tmp_url: 'https://tmp.example.com/video.mp4', type: 'video/mp4' },
        { name: 'cover.jpg', tmp_url: 'https://tmp.example.com/cover.jpg', type: 'image/jpeg' },
      ],
      tagsField: ['#视频', '封面'],
    },
    {
      fetch: async (url: string, options?: Record<string, any>) => {
        if (url === 'https://tmp.example.com/video.mp4') {
          return {
            ok: true,
            status: 200,
            headers: {
              get: (key: string) =>
                key.toLowerCase() === 'content-type' ? 'video/mp4' : '',
            },
            arrayBuffer: async () => Buffer.from('video-bytes'),
          };
        }

        if (url === 'https://tmp.example.com/cover.jpg') {
          return {
            ok: true,
            status: 200,
            headers: {
              get: (key: string) =>
                key.toLowerCase() === 'content-type' ? 'image/jpeg' : '',
            },
            arrayBuffer: async () => Buffer.from('cover-bytes'),
          };
        }

        if (url === 'https://publish.liuliangfeng.com/api/media/upload-token') {
          const body = JSON.parse(String(options?.body || '{}'));
          const mediaId = body.contentType === 'video/mp4' ? 'm_video_001' : 'm_cover_001';
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                success: true,
                data: {
                  mediaId,
                  uploadUrl: `https://bucket.myqcloud.com/${mediaId}`,
                  headers: {
                    'Content-Type': body.contentType,
                    'Content-Disposition': 'inline',
                  },
                },
              }),
          };
        }

        if (url.startsWith('https://bucket.myqcloud.com/')) {
          return {
            ok: true,
            status: 200,
          };
        }

        if (url === 'https://publish.liuliangfeng.com/api/media/confirm') {
          const body = JSON.parse(String(options?.body || '{}'));
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                success: true,
                data: {
                  mediaId: body.mediaId,
                  status: 'UPLOADED',
                  validationStatus: body.mediaId === 'm_video_001' ? 'PASSED' : 'PASSED',
                },
              }),
          };
        }

        if (url === 'https://publish.liuliangfeng.com/api/publishTasks') {
          receivedPublishTaskBody = JSON.parse(String(options?.body || '{}'));
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                success: true,
                data: {
                  taskId: 'pt_test_001',
                  scene: 'scene_001',
                  qrCodeUrl: 'https://cdn.example.com/qrcode.png',
                  status: 'PENDING',
                },
              }),
          };
        }

        throw new Error(`unexpected url: ${url}`);
      },
      logID: 'log_001',
      packID: 'pack_001',
      baseSignature: 'base_sig_001',
      tenantKey: 'tenant_001',
      isNeedPayPack: false,
      hasQuota: true,
    }
  );

  assert.equal(executeVideoResult.code, FieldCode.Success);
  assert.deepEqual(receivedPublishTaskBody.media, {
    type: 'video',
    mediaId: 'm_video_001',
    coverMediaId: 'm_cover_001',
  });

  assert.equal(receivedPublishTaskBody.callbackContext.requestId, 'log_001');

  const incompatibleVideoResult = await executeHandler(
    {
      titleField: [{ text: '不兼容视频' }],
      mediaField: [
        { name: 'video.mp4', tmp_url: 'https://tmp.example.com/video.mp4', type: 'video/mp4' },
      ],
    },
    {
      fetch: async (url: string, options?: Record<string, any>) => {
        if (url === 'https://tmp.example.com/video.mp4') {
          return {
            ok: true,
            status: 200,
            headers: {
              get: (key: string) =>
                key.toLowerCase() === 'content-type' ? 'video/mp4' : '',
            },
            arrayBuffer: async () => Buffer.from('video-bytes'),
          };
        }

        if (url === 'https://publish.liuliangfeng.com/api/media/upload-token') {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                success: true,
                data: {
                  mediaId: 'm_video_bad',
                  uploadUrl: 'https://bucket.myqcloud.com/m_video_bad',
                  headers: {
                    'Content-Type': 'video/mp4',
                    'Content-Disposition': 'inline',
                  },
                },
              }),
          };
        }

        if (url === 'https://bucket.myqcloud.com/m_video_bad') {
          return {
            ok: true,
            status: 200,
          };
        }

        if (url === 'https://publish.liuliangfeng.com/api/media/confirm') {
          return {
            ok: false,
            status: 400,
            text: async () =>
              JSON.stringify({
                success: false,
                code: 'VIDEO_NOT_PUBLISHABLE',
                message: 'video codec must be h264',
              }),
          };
        }

        throw new Error(`unexpected url: ${url}`);
      },
      logID: 'log_003',
      isNeedPayPack: false,
      hasQuota: true,
    }
  );

  assert.equal(incompatibleVideoResult.code, FieldCode.InvalidArgument);

  let invalidFetchCalled = false;
  const invalidExecuteResult = await executeHandler(
    {
      titleField: [{ text: '非法视频' }],
      mediaField: [
        { name: 'video.mp4', tmp_url: 'https://tmp.example.com/video.mp4', type: 'video/mp4' },
        { name: 'cover-1.jpg', tmp_url: 'https://tmp.example.com/cover-1.jpg', type: 'image/jpeg' },
        { name: 'cover-2.jpg', tmp_url: 'https://tmp.example.com/cover-2.jpg', type: 'image/jpeg' },
      ],
    },
    {
      fetch: async () => {
        invalidFetchCalled = true;
        throw new Error('should not call fetch for invalid media');
      },
      logID: 'log_002',
      isNeedPayPack: false,
      hasQuota: true,
    }
  );

  assert.equal(invalidExecuteResult.code, FieldCode.InvalidArgument);
  assert.equal(invalidFetchCalled, false);

  const unconfirmedMediaResult = await executeHandler(
    {
      titleField: [{ text: '未确认媒体' }],
      mediaField: [
        { name: 'video.mp4', tmp_url: 'https://tmp.example.com/video.mp4', type: 'video/mp4' },
      ],
    },
    {
      fetch: async (url: string, options?: Record<string, any>) => {
        if (url === 'https://tmp.example.com/video.mp4') {
          return {
            ok: true,
            status: 200,
            headers: {
              get: (key: string) =>
                key.toLowerCase() === 'content-type' ? 'video/mp4' : '',
            },
            arrayBuffer: async () => Buffer.from('video-bytes'),
          };
        }

        if (url === 'https://publish.liuliangfeng.com/api/media/upload-token') {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                success: true,
                data: {
                  mediaId: 'm_video_pending',
                  uploadUrl: 'https://bucket.myqcloud.com/m_video_pending',
                  headers: {
                    'Content-Type': 'video/mp4',
                    'Content-Disposition': 'inline',
                  },
                },
              }),
          };
        }

        if (url === 'https://bucket.myqcloud.com/m_video_pending') {
          return {
            ok: true,
            status: 200,
          };
        }

        if (url === 'https://publish.liuliangfeng.com/api/media/confirm') {
          return {
            ok: false,
            status: 409,
            text: async () =>
              JSON.stringify({
                success: false,
                code: 'MEDIA_NOT_CONFIRMED',
                message: 'media validation has not passed',
              }),
          };
        }

        throw new Error(`unexpected url: ${url}`);
      },
      logID: 'log_004',
      isNeedPayPack: false,
      hasQuota: true,
    }
  );

  assert.equal(unconfirmedMediaResult.code, FieldCode.InvalidArgument);

  console.log('plugin unit tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

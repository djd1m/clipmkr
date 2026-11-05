import { afterAll, beforeAll, describe, it, expect, vi } from 'vitest';
import { Children, createElement, isValidElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Pool } from 'pg';
import { presentVideo, presentClip, failedStageOf, type VideoRow, type ClipRow, ScreenService } from '../apps/web/src/server/screen';
import { ribbonOf } from '../apps/web/src/lib/progress-ribbon';
import { ProgressPanel } from '../apps/web/src/app/videos/[videoId]/VideoDetail';
import { ClipCard } from '../apps/web/src/app/clips/ClipCard';
import { createClipFileHandler } from '../apps/web/src/server/clip-file';
import { VIDEO_FAILURE_REASON, VIDEO_STATUS } from '../packages/shared/src/enums';
import { appRouter } from '../apps/web/src/server/trpc';
import { startClipDownload } from '../apps/web/src/app/clips/useClipDownload';
import * as rpcClient from '../apps/web/src/lib/rpc';
import { allowRead, allowMutation } from '../apps/web/src/server/rate-limit';
import type Redis from 'ioredis';
import { createS3Client, generateDownloadUrl } from '../packages/s3/src';
import { loadWebConfig } from '../packages/shared/src/config';
import { environment } from './fixtures/environment';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import type { ViteDevServer } from 'vite';
import type { Page } from 'playwright';
import type { ClipScreen } from '../apps/web/src/lib/screen-contract';
const now = new Date('2026-09-22T12:00:00Z');
const id = '00000000-0000-4000-8000-000000000001';
export const video: VideoRow = { id, status: 'rendering', created_at: now, updated_at: now, finished_at: null,
  duration_seconds: '600', stage_progress: 40, clips_done: 1, clips_total: 2, failure_reason: null,
  object_key: 'source', actual_bytes: '100', plan: 'free', wait_reason: null };
const clip: ClipRow = { id, index: 1, start_seconds: '2', end_seconds: '25', title: 'Сильный момент', status: 'done',
  watermarked: true, object_key: 'file', expires_at: null, score: 60, score_hook: 20, score_completeness: 20, score_length: 20,
  explain_hook: 'Вопрос с первых слов', explain_completeness: 'Есть законченный ответ', explain_length: 'Нет лишних слов' };
const markup = (row: VideoRow) => renderToStaticMarkup(createElement(ProgressPanel, { video: presentVideo(row, now) }));
describe('экран прогресса и оценки', () => {
  it('три состояния различимы в HTML и тексте', () => {
    const running = markup(video), success = markup({ ...video, status: 'done' }), failed = markup({ ...video, status: 'failed', failure_reason: 'render_failed' });
    expect(running).toContain('data-state="running"'); expect(running).toContain('Выполняется');
    expect(success).toContain('data-state="success"'); expect(success).toContain('Клипы готовы');
    expect(failed).toContain('data-state="failure"'); expect(failed).toContain('Обработка не завершена');
    expect(failed).toContain('Повторить'); expect(failed).not.toContain('<progress');
  });
  it('молчание после пяти минут не показывается как идёт', () => {
    const stale = { ...video, updated_at: new Date(now.getTime() - 300001) };
    expect(presentVideo(stale, now).no_response).toBe(true);
    expect(markup(stale)).toContain('data-state="silent"'); expect(markup(stale)).toContain('Обновляем статус');
    expect(markup(stale)).toContain('role="status"'); expect(markup(stale)).not.toContain('Нет ответа');
    expect(markup(stale)).not.toContain('Выполняется'); expect(markup(stale)).not.toContain('<progress');
    expect(presentVideo({ ...stale, updated_at: new Date(now.getTime() - 300000) }, now).no_response).toBe(false);
    expect(presentVideo({ ...stale, status: 'done' }, now).no_response).toBe(false);
  });
  it('все причины имеют человеческий текст; незаконный retry скрыт', () => {
    for (const failure_reason of VIDEO_FAILURE_REASON) {
      expect(presentVideo({ ...video, status: 'failed', failure_reason }, now).failure_reason?.length).toBeGreaterThan(10);
    }
    expect(presentVideo({ ...video, status: 'failed', failure_reason: 'no_audio' }, now).next_action).toBe('upload');
    expect(presentVideo({ ...video, status: 'failed', failure_reason: 'refused_user_uploads' }, now).next_action).toBe('tomorrow');
    expect(presentVideo({ ...video, status: 'failed', object_key: null }, now).next_action).toBe('upload');
    const refusal = presentVideo({ ...video, status: 'failed', failure_reason: 'refused_user_minutes' }, now);
    expect(refusal.retry_after).toBe('2026-09-22T21:00:00.000Z');
    expect(presentVideo({ ...video, status: 'failed', failure_reason: 'refused_user_minutes' }, new Date('2026-09-23T12:00:00Z')).retry_after).toBe(refusal.retry_after);
    expect(presentVideo({ ...video, wait_reason: 'no_disk' }, now).stage_label).toBe('Ждём свободного места');
  });
  it('ошибка длительности не приписывает блогеру обычный лимит 90 минут', () => {
    const html = markup({ ...video, status: 'failed', failure_reason: 'too_long' });
    expect(html).toContain('допустимую длительность для вашего аккаунта');
    expect(html).not.toContain('90 минут');
  });
  it('пустое объяснение оценки отвергается, null score не становится нулём', () => {
    for (const field of ['explain_hook', 'explain_completeness', 'explain_length']) {
      for (const value of ['', '   ', null]) expect(() => presentClip({ ...clip, [field]: value }, video, now)).toThrow();
    }
    expect(presentClip({ ...clip, score: null }, video, now)).not.toHaveProperty('score');
    expect(presentClip({ ...clip, score: null }, video, now)).not.toHaveProperty('explanations');
    expect(() => presentClip({ ...clip, score: 99 }, video, now)).toThrow();
    const html = renderToStaticMarkup(createElement(ClipCard, { clip: presentClip(clip, video, now) }));
    for (const text of ['Цепкость', 'Самодостаточность', 'Длина', 'Вопрос с первых слов', 'Есть законченный ответ', 'Нет лишних слов']) expect(html).toContain(text);
  });
  it('срок бесплатного файла считается с первого дня, истёкший нельзя скачать', () => {
    const finished_at = new Date(now.getTime() - 4 * 86400000);
    const expired = presentClip(clip, { plan: 'free', finished_at }, now);
    expect(expired.available).toBe(false); expect(expired.expires_at).not.toBeNull();
    expect(presentClip(clip, { plan: 'paid', finished_at }, now).available).toBe(true);
  });
});
// Фича 29 progress-ribbon: лента стадий. Заголовки describe/it — цели мутаций scripts/test-progress-mutations.mjs.
const views = (row: VideoRow) => ribbonOf(presentVideo(row, now)).steps.map(step => step.view);
const text = (html: string) => html.replace(/<[^>]+>/g, '');
describe('лента стадий экрана записи', () => {
  it('лента: каждый статус канона даёт свою стадию и вид', () => {
    const expected: Record<string, string[]> = {
      uploading: ['running', 'pending', 'pending', 'pending'], queued: ['running', 'pending', 'pending', 'pending'],
      transcribing: ['done', 'running', 'pending', 'pending'], selecting: ['done', 'done', 'running', 'pending'],
      rendering: ['done', 'done', 'done', 'running'], done: ['done', 'done', 'done', 'done'],
      failed: ['failed', 'pending', 'pending', 'pending'],
    };
    for (const status of VIDEO_STATUS) expect(views({ ...video, status }), status).toEqual(expected[status]);
    expect(ribbonOf(presentVideo(video, now)).steps.map(step => step.label)).toEqual(['Загрузка', 'Расшифровка', 'Выбор', 'Монтаж']);
    // «N из M» — только у идущего Монтажа.
    expect(ribbonOf(presentVideo(video, now)).steps.map(step => step.detail)).toEqual([null, null, null, '1 из 2']);
    expect(ribbonOf(presentVideo({ ...video, status: 'selecting' }, now)).steps.every(step => step.detail === null)).toBe(true);
    const html = markup(video);
    expect(html).toContain('<ol class="progress-ribbon" aria-label="Этапы обработки">');
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="step"[^>]*>.*?Монтаж.*?1 из 2.*? — идёт/);
    for (const state of ['сделано', 'идёт']) expect(html).toContain(` — ${state}`);
    // Место на диске кончилось: задача жива, стадия та же, текст говорит, чего ждём.
    const waiting = presentVideo({ ...video, wait_reason: 'no_disk' }, now);
    expect(ribbonOf(waiting).steps[3]!.view).toBe('running'); expect(markup({ ...video, wait_reason: 'no_disk' })).toContain('Ждём свободного места');
  });
  it('лента: молчание пять минут — проверяем статус', () => {
    const stale = { ...video, updated_at: new Date(now.getTime() - 300001) };
    expect(views(stale)).toEqual(['done', 'done', 'done', 'silent']);
    const html = markup(stale);
    expect(html).toContain('data-view="silent"'); expect(html).not.toContain('data-view="running"');
    expect(html).toContain(' — проверяем статус'); expect(html).not.toContain(' — идёт');
    // Граница: ровно 5 минут — ещё «идёт».
    expect(views({ ...video, updated_at: new Date(now.getTime() - 300000) })).toEqual(['done', 'done', 'done', 'running']);
    // Локальные часы экрана (сеть пропала) дают тот же вид.
    expect(ribbonOf({ ...presentVideo(video, now), no_response: true }).steps[3]!.view).toBe('silent');
  });
  it('лента: стадия отказа — из последней попытки', () => {
    const failed = { ...video, status: 'failed' as const, failure_reason: 'stalled' as const };
    expect(views(failed)).toEqual(['failed', 'pending', 'pending', 'pending']);
    expect(views({ ...failed, last_stage: 'stt', last_stage_status: 'failed' })).toEqual(['done', 'failed', 'pending', 'pending']);
    expect(views({ ...failed, last_stage: 'select', last_stage_status: 'failed' })).toEqual(['done', 'done', 'failed', 'pending']);
    expect(views({ ...failed, last_stage: 'render', last_stage_status: 'running' })).toEqual(['done', 'done', 'done', 'failed']);
    // Успешная последняя попытка: отказ случился на СЛЕДУЮЩЕЙ стадии до её первой попытки.
    expect(failedStageOf({ last_stage: 'stt', last_stage_status: 'succeeded' })).toBe('select');
    expect(failedStageOf({ last_stage: 'select', last_stage_status: 'succeeded' })).toBe('render');
    // Не из закрытого набора / нет попыток — «Загрузка».
    for (const last_stage of [null, undefined, '', 'STT', 'probe']) expect(failedStageOf({ last_stage, last_stage_status: 'failed' })).toBe('upload');
    expect(presentVideo({ ...video, last_stage: 'stt', last_stage_status: 'failed' }, now).failed_stage).toBeNull();
    const html = markup({ ...failed, last_stage: 'select', last_stage_status: 'failed' });
    expect(html).toMatch(/data-view="failed" aria-current="step">.*?Выбор.*? — отказ/);
    expect(html).toContain('Обработка перестала отвечать.'); expect(html).toContain('Повторить');
  });
  it('лента: готово — одна строка «Клипы готовы · N из M»', () => {
    const html = markup({ ...video, status: 'done', clips_done: 3, clips_total: 4 });
    expect(html).not.toContain('<ol'); expect(html).not.toContain('<progress'); expect(html).not.toContain('<h2');
    expect(text(html)).toContain('Клипы готовы · 3 из 4'); expect(html).toContain('status-panel success compact');
  });
  it('лента: SQL берёт стадию последней попытки без пересборок', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ ...video, status: 'failed', failure_reason: 'stalled', last_stage: 'select', last_stage_status: 'failed' }] });
    const screen = await new ScreenService({ query } as unknown as Pool, () => now).get('owner', id);
    expect(screen.failed_stage).toBe('select');
    const sql = String(query.mock.calls[0]?.[0]).replace(/\s+/g, ' ');
    expect(sql).toContain('LEFT JOIN LATERAL (SELECT j.stage, j.status FROM job_attempt j WHERE j.video_id=v.id AND NOT j.rerender ORDER BY j.fence DESC LIMIT 1) last ON true');
  });
});
describe('авторизованный redirect файла и превью', () => {
  const row = { status: 'done', object_key: 'clips/free/file.mp4', thumbnail_key: 'thumb.jpg', title: 'Имя; выпуска', expires_at: null, finished_at: null, plan: 'free' };
  function fixture(rows: object[] = [row]) {
    const query = vi.fn().mockResolvedValue({ rows });
    const auth = { authenticate: vi.fn().mockResolvedValue({ account_id: 'owner' }) };
    const sign = vi.fn().mockResolvedValue('https://storage.example/file?signed=true');
    const deps = { pool: { query } as unknown as Pick<Pool, 'query'>, auth, sign, clock: () => now };
    const request = new Request(`https://app.example/api/clips/${id}/file?download=1`, { headers: { 'x-forwarded-for': '192.0.2.1, 127.0.0.1', cookie: `__Host-n5_session=${'a'.repeat(43)}`, 'x-user-id': 'attacker' } });
    return { query, auth, sign, deps, request };
  }
  it('чужой и отсутствующий клип дают один 404, не 403; фильтр по владельцу из сессии', async () => {
    const f = fixture([]); const handler = createClipFileHandler({ ...f.deps, allowRead: async () => true, trustedProxyHops: 1 });
    const foreign = await handler(f.request, id), absent = await handler(f.request, '00000000-0000-4000-8000-000000000002');
    expect(foreign.status).toBe(404); expect(absent.status).toBe(404); expect(await foreign.text()).toBe(await absent.text());
    expect(f.query.mock.calls[0]?.[0]).toContain('v.account_id=$2'); expect(f.query.mock.calls[0]?.[1]).toEqual([id, 'owner', null, now]);
    expect(f.sign).not.toHaveBeenCalled();
  });
  it('клип не done даёт 404, соседний готовый отдаётся', async () => {
    const f = fixture(); const handler = createClipFileHandler({ ...f.deps, allowRead: async () => true, trustedProxyHops: 1 });
    for (const status of ['queued', 'rendering', 'failed']) {
      f.query.mockResolvedValueOnce({ rows: [{ ...row, status }] }); expect((await handler(f.request, id)).status).toBe(404);
    }
    expect(f.sign).not.toHaveBeenCalled();
    const response = await handler(f.request, id); expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://storage.example/file?signed=true');
    expect(f.sign).toHaveBeenCalledWith('clips/free/file.mp4', 'Имя выпуска.mp4');
    expect(response.headers.get('cache-control')).toContain('no-store');
    const thumbnail = await createClipFileHandler({ ...f.deps, allowRead: async () => true, trustedProxyHops: 1 }, 'thumbnail')(f.request, id);
    expect(thumbnail.status).toBe(302); expect(f.sign).toHaveBeenLastCalledWith('thumb.jpg', undefined);
  });
  it('нет сессии / плохой id / истечение / нет ключа — без подписи; ошибка хранилища видима', async () => {
    const f = fixture(); const handler = createClipFileHandler({ ...f.deps, allowRead: async () => true, trustedProxyHops: 1 });
    expect((await handler(new Request(f.request.url, { headers: { 'x-forwarded-for': '192.0.2.1, 127.0.0.1' } }), id)).status).toBe(404);
    expect((await handler(f.request, 'bad')).status).toBe(404); expect(f.query).not.toHaveBeenCalled();
    f.query.mockResolvedValueOnce({ rows: [{ ...row, expires_at: now }] }); expect((await handler(f.request, id)).status).toBe(404);
    f.query.mockResolvedValueOnce({ rows: [{ ...row, object_key: null }] }); expect((await handler(f.request, id)).status).toBe(404);
    expect(f.sign).not.toHaveBeenCalled(); f.sign.mockRejectedValueOnce(new Error('private details'));
    const failed = await handler(f.request, id); expect(failed.status).toBe(503); expect(await failed.text()).not.toContain('private details');
  });
});
describe('tRPC read contract', () => {
  it('GET video.get passes canonical input and ownership into service; result wrapper matches client', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [video] });
    const response = await fetchRequestHandler({ endpoint: '/api/trpc',
      req: new Request(`https://app.example/api/trpc/video.get?input=${encodeURIComponent(JSON.stringify({ video_id: id }))}`),
      router: appRouter, createContext: () => ({ account: 'owner', idempotencyKey: null, requestId: 'test',
        video: { create: vi.fn() }, screen: new ScreenService({ query } as unknown as Pool, () => now) }) });
    expect(response.status).toBe(200); expect((await response.json()).result.data.data.video_id).toBe(id);
    expect(query.mock.calls[0]?.[1]).toEqual(['owner', id]);
  });
});

it('чтения 120/мин отдельно от 30 мутаций', async () => {
  const counts = new Map<string, number>();
  const redis = { status: 'ready', eval: vi.fn(async (_script, _count, key: string) => {
    const next = (counts.get(key) ?? 0) + 1; counts.set(key, next); return next;
  }) } as unknown as Redis;
  const reads = await Promise.all(Array.from({ length: 121 }, () => allowRead(redis, '203.0.113.5', 'test-key', 'owner')));
  expect(reads.filter(Boolean)).toHaveLength(120);
  expect(await allowMutation(redis, '203.0.113.5', 'test-key', 'owner')).toBe(true);
});
it('скачивание: UTF-8 имя в подписанном Content-Disposition, TTL 900', async () => {
  const config = loadWebConfig(environment()).s3, client = createS3Client(config);
  try {
    const url = new URL(await generateDownloadUrl({ client, bucket: config.bucket }, 'clip.mp4', 'Мой выпуск.mp4'));
    expect(url.searchParams.get('response-content-disposition')).toContain("filename*=UTF-8''%D0");
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
  } finally { client.destroy(); }
});

it('файл открывается сразу, даже если запись события не отвечает', () => {
  const anchor = { href: '', download: '', rel: '', click: vi.fn(), remove: vi.fn() };
  const analytics = vi.spyOn(rpcClient, 'rpc').mockImplementation(() => new Promise(() => {}));
  vi.stubGlobal('document', { createElement: () => anchor, body: { appendChild: vi.fn() } });
  try {
    startClipDownload(id, 'Мой клип');
    expect(anchor.click).toHaveBeenCalledOnce(); expect(anchor.href).toBe(`/api/clips/${id}/file?download=1`);
    expect(anchor.click.mock.invocationCallOrder[0]).toBeLessThan(analytics.mock.invocationCallOrder[0]!);
  } finally { vi.unstubAllGlobals(); analytics.mockRestore(); }
});

it('actual clip duration is numeric in screen and used by ClipCard; null falls back', () => {
  const screen = presentClip({ ...clip, duration_seconds: '20.12' }, video, now);
  expect(screen.duration_seconds).toBe(20.12);
  expect(renderToStaticMarkup(createElement(ClipCard, { clip: screen }))).toContain('20.1');
  expect(renderToStaticMarkup(createElement(ClipCard, { clip: { ...screen, duration_seconds: null } }))).toContain('23.0');
});

it('uploading_is_never_stale_processing', () => {
  for (const age of [0,300001,86400000]) {
    const current=presentVideo({...video,status:'uploading',stage_progress:99,updated_at:new Date(now.getTime()-age)},now);
    expect(current.no_response).toBe(false);expect(current.stage_progress).toBeNull();
    expect(current.stage_label).toContain('Обработка ещё не началась');
    const html=renderToStaticMarkup(createElement(ProgressPanel,{video:current}));
    expect(html).not.toContain('<progress');expect(html).not.toContain('Выполняется');expect(html).toContain('/dashboard?upload=recovery#source-file');
  }
});
it('uploading_row_has_no_detail_link', async () => {
  const {VideoRow:Row}=await import('../apps/web/src/app/videos/VideoList');
  for (const status of ['uploading','queued','done'] as const) {
    const html=renderToStaticMarkup(createElement(Row,{video:presentVideo({...video,status},now)}));
    expect(html.includes(`href="/dashboard/videos/${video.id}"`)).toBe(status!=='uploading');
  }
});
it('other_processing_staleness_is_unchanged',()=>{
  for(const status of ['queued','transcribing','rendering'] as const) expect(presentVideo({...video,status,updated_at:new Date(now.getTime()-300001)},now).no_response).toBe(true);
});

it('local_uploading_staleness_keeps_projection_neutral',async()=>{
  // Inspect the actual parent-to-panel projection: the uploading panel's early return
  // otherwise masks an incorrect no_response value in rendered HTML.
  vi.resetModules();
  vi.doMock('react',async()=>({...await vi.importActual<typeof import('react')>('react'),
    useEffect:()=>{},useState:(initial:unknown)=>[typeof initial==='function'?initial():initial,vi.fn()]}));
  vi.doMock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
  const clock=vi.spyOn(Date,'now');
  try{
    const {VideoDetail,ProgressPanel:Panel}=await import('../apps/web/src/app/videos/[videoId]/VideoDetail');
    for(const status of ['uploading','queued','transcribing'] as const)for(const age of [0,300001,86400000]){
      clock.mockReturnValue(now.getTime()+age);const initial=presentVideo({...video,status},now);
      const tree=VideoDetail({videoId:id,initialVideo:initial,initialClips:[]});
      const projected: typeof initial[] = [];
      const visit = (node: ReactNode): void => {
        Children.forEach(node, child => {
          if (!isValidElement<{ children?: ReactNode; video?: typeof initial }>(child)) return;
          if (child.type === Panel && child.props.video) projected.push(child.props.video);
          visit(child.props.children);
        });
      };
      visit(tree);
      expect(projected).toHaveLength(1);
      expect(projected[0]!.no_response).toBe(status!=='uploading'&&age>300000);
      if(status==='uploading')expect(projected[0]!.stage_label).toBe(initial.stage_label);
    }
  }finally{clock.mockRestore();vi.doUnmock('react');vi.doUnmock('next/navigation');vi.resetModules();}
});


describe('согласованная композиция результата', () => {
  it('карточка сохраняет реальный video и предоставляет явный просмотр с selection identity', () => {
    const current = presentClip(clip, video, now);
    const html = renderToStaticMarkup(createElement(ClipCard, { clip: current, selected: true, onSelect: vi.fn() }));
    expect(html).toContain(`data-clip-id="${current.clip_id}"`);
    expect(html).toContain('data-selected="true"');
    expect(html).toContain(`src="/api/clips/${id}/file?v=1"`);
    expect(html).toContain('Просмотр');
    expect((html.match(/<video/g) ?? [])).toHaveLength(1);
    expect(html).not.toContain('autoplay');
    expect(html).toContain('Оценка и настройки клипа');
  });
});
// Настоящие mounted React/video/native details; RPC и файл контролируются loopback fixture.
// Это проверка lifecycle, а не доказательство Next/provider/published acceptance.
describe('выбранный player и гостевая форма в настоящем браузере', () => {
  let server: ViteDevServer, origin: string, cache: string;
  const fixtureClips: ClipScreen[] = Array.from({ length: 4 }, (_, index) => ({
    clip_id: `00000000-0000-4000-8000-00000000000${index + 1}`, index: index + 1, start: 0, end: 20,
    title: index === 3 ? 'Очень длинное название '.repeat(4) + 'ф'.repeat(80) : `Настоящий фрагмент ${index + 1}`,
    status: 'done', available: true, watermarked: false, expires_at: null, published_render_version: 1,
  }));
  const initialVideo = { ...presentVideo({ ...video, status: 'done', clips_done: 4, clips_total: 4 }, now), updated_at: new Date().toISOString() };
  beforeAll(async () => {
    const { createServer } = await import('vite');
    cache = mkdtempSync(join(tmpdir(), 'clipmkr-player-b-'));
    const entry = '\0selected-player-fixture', navigation = '\0selected-player-navigation', link = '\0selected-player-link';
    server = await createServer({ configFile: false, cacheDir: cache, root: process.cwd(), esbuild: { jsx: 'automatic' },
      optimizeDeps: { include: ['react', 'react-dom/client', 'react/jsx-runtime'], exclude: ['next/navigation', 'next/link'] },
      resolve: { alias: { '@clipmaker/shared/enums': resolve('packages/shared/src/enums.ts'),
        '@clipmaker/shared/cta': resolve('packages/shared/src/cta.ts'), '@clipmaker/shared/tariff': resolve('packages/shared/src/tariff.ts'),
        '@clipmaker/shared/music-catalog': resolve('packages/shared/src/music-catalog.ts') } },
      server: { host: '127.0.0.1', port: 0, watch: { ignored: ['**/.next/**', '**/dist/**'] } },
      plugins: [{ name: 'selected-player-fixture', enforce: 'pre',
        resolveId(value) { if (value === 'next/navigation') return navigation; if (value === 'next/link') return link; if (value === entry) return entry; },
        load(value) {
          if (value === navigation) return 'export const useRouter=()=>({push(){},refresh(){}});';
          if (value === link) return `import {createElement} from 'react';export default function Link(props){return createElement('a',props);}`;
          if (value === entry) return `import {createElement} from 'react';import {createRoot} from 'react-dom/client';
            import {VideoDetail} from '/apps/web/src/app/videos/[videoId]/VideoDetail.tsx';
            import {WorkspaceSettings} from '/apps/web/src/app/WorkspaceSettings.tsx';
            const count=Number(new URL(location.href).searchParams.get('clips')??4);
            const clips=${JSON.stringify(fixtureClips)}.slice(0,count);
            if(new URL(location.href).searchParams.has('unavailable')&&clips[0])clips[0].available=false;
            const root=createRoot(document.getElementById('root'));
            root.render(createElement('div',null,createElement(WorkspaceSettings,{initialLayout:'workspace',initialTheme:'dark'}),
              createElement(VideoDetail,{videoId:${JSON.stringify(id)},initialVideo:{...${JSON.stringify(initialVideo)},clips_done:clips.filter(c=>c.available).length,clips_total:clips.length},
              initialClips:clips,consentHash:'fixture-consent',initialPacks:[]})));`;
        },
        configureServer(vite) { vite.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/player-fixture')) { next(); return; }
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(await vite.transformIndexHtml('/player-fixture.html', `<!doctype html><html lang="ru" data-workspace-layout="workspace" data-theme="dark">
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
            <link rel="stylesheet" href="/apps/web/src/app/globals.css"></head><body><main class="container workspace-shell"><div id="root"></div></main>
            <script type="module" src="/@id/__x00__selected-player-fixture"></script></body></html>`));
        }); },
      }],
    });
    await server.listen();
    const address = server.httpServer?.address();
    if (!address || typeof address === 'string') throw new Error('Нет loopback port');
    origin = `http://127.0.0.1:${address.port}`;
  }, 20000);
  afterAll(async () => { await server?.close(); if (cache) rmSync(cache, { recursive: true, force: true }); });
  async function prepare(page: Page) {
    const media = readFileSync('tests/artifacts/render-and-watermark/clip.mp4');
    await page.route('**/api/clips/**/thumbnail?*', route => route.fulfill({ status: 200, contentType: 'image/jpeg',
      body: readFileSync('tests/artifacts/render-and-watermark/thumb.jpg') }));
    await page.route('**/api/clips/**/file?*', route => {
      const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range ?? '');
      const start = range ? Number(range[1]) : 0, end = range?.[2] ? Math.min(Number(range[2]), media.length - 1) : media.length - 1;
      return route.fulfill({ status: range ? 206 : 200, contentType: 'video/mp4', headers: { 'accept-ranges': 'bytes',
        ...(range ? { 'content-range': `bytes ${start}-${end}/${media.length}` } : {}) }, body: media.subarray(start, end + 1) });
    });
  }
  it.each(['chromium', 'webkit'] as const)('%s: second player survives two polls/preferences; explicit selection pauses without seek', async engine => {
    const { chromium, webkit } = await import('playwright');
    const browser = await ({ chromium, webkit }[engine]).launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    let polls = 0; const mutations: string[] = [];
    try {
      await prepare(page);
      await page.route('**/api/trpc/**', async route => {
        const method = new URL(route.request().url()).pathname.split('/').pop();
        if (route.request().method() !== 'GET') mutations.push(method ?? 'unknown');
        if (method === 'video.get') polls++;
        const result = method === 'clip.list' ? { clips: fixtureClips } : { ...initialVideo, clips_done: polls % 2 ? 3 : 4 };
        await route.fulfill({ json: { result: { data: { data: result } } } });
      });
      await page.goto(`${origin}/player-fixture`);
      await page.locator('[data-select-clip]').nth(1).click();
      const player = page.locator('video').nth(1);
      await player.waitFor();
      await expect.poll(() => player.evaluate((el: HTMLVideoElement) => el.readyState)).toBeGreaterThanOrEqual(1);
      await player.evaluate(async (el: HTMLVideoElement) => {
        el.muted = true; el.currentTime = 1; await el.play();
        Object.assign(window, { selectedPlayer: el, selectedSrc: el.currentSrc });
      });
      let t0 = await player.evaluate((el: HTMLVideoElement) => el.currentTime);
      expect(t0).toBeGreaterThan(0);
      await page.locator('.workspace-settings > summary').click();
      for (const [layout, theme] of [['studio', 'light'], ['workspace', 'dark']] as const) {
        const before = polls;
        await page.getByLabel('Компоновка').selectOption(layout);
        await page.getByRole('button', { name: 'Светлая тема', exact: true }).click();
        expect(await page.locator('html').getAttribute('data-theme')).toBe(theme);
        await expect.poll(() => polls, { timeout: 7000 }).toBeGreaterThan(before);
        await expect.poll(() => page.locator('.workspace-result-lead').textContent()).toContain(`${polls % 2 ? 3 : 4} готово`);
        const state = await player.evaluate((el: HTMLVideoElement) => ({
          same: el === Reflect.get(window, 'selectedPlayer'), connected: el.isConnected,
          sameSrc: el.currentSrc === Reflect.get(window, 'selectedSrc'), time: el.currentTime, paused: el.paused,
        }));
        expect(state.same).toBe(true); expect(state.connected).toBe(true); expect(state.sameSrc).toBe(true); expect(state.paused).toBe(false);
        expect(state.time).toBeGreaterThan(t0); t0 = state.time;
      }
      expect(await page.locator('[data-select-clip][aria-current="true"]').getAttribute('data-select-clip')).toBe(fixtureClips[1]!.clip_id);
      const beforePause = await player.evaluate((el: HTMLVideoElement) => el.currentTime);
      await page.locator('[data-select-clip]').nth(2).click();
      await expect.poll(() => player.evaluate((el: HTMLVideoElement) => el.paused)).toBe(true);
      const pausedAt = await player.evaluate((el: HTMLVideoElement) => el.currentTime);
      expect(pausedAt).toBeGreaterThanOrEqual(beforePause);
      expect(pausedAt).toBeGreaterThan(0);
      await page.evaluate(() => { document.documentElement.dataset.workspaceLayout = 'studio'; });
      expect(await player.evaluate((el: HTMLVideoElement) => el.currentTime)).toBeCloseTo(pausedAt, 1);
      expect(await player.evaluate((el: HTMLVideoElement) => el === Reflect.get(window, 'selectedPlayer'))).toBe(true);
      const fourth = page.locator('video').nth(3);
      await fourth.evaluate(async (el: HTMLVideoElement) => { el.muted = true; await el.play(); });
      await expect.poll(() => page.locator('[data-select-clip][aria-current="true"]').getAttribute('data-select-clip')).toBe(fixtureClips[3]!.clip_id);
      expect(await page.locator('.clip-card').nth(3).isVisible()).toBe(true);
      expect(mutations).toEqual([]);
    } finally { await page.close(); await browser.close(); }
  }, 30000);
  it.each(['chromium', 'webkit'] as const)('%s: unavailable/removal fallback, four cards and mounted guest/CTA disclosures', async engine => {
    const { chromium, webkit } = await import('playwright');
    const browser = await ({ chromium, webkit }[engine]).launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    let offered = fixtureClips.map((item, index) => index === 0 ? { ...item, available: false } : item), polls = 0;
    const mutations: { method: string; body: unknown }[] = [];
    try {
      await prepare(page);
      await page.route('**/api/trpc/**', route => {
        const method = new URL(route.request().url()).pathname.split('/').pop();
        if (route.request().method() !== 'GET') mutations.push({ method: method ?? 'unknown', body: route.request().postDataJSON() });
        if (method === 'video.setCta') return route.fulfill({ json: { result: { data: { data: { cta_kind: 'open_link', cta_url: 'https://example.org/episode' } } } } });
        if (method === 'clip.list') polls++;
        return route.fulfill({ json: { result: { data: { data: method === 'clip.list' ? { clips: offered } : { ...initialVideo, clips_done: offered.filter(item => item.available).length } } } } });
      });
      await page.goto(`${origin}/player-fixture?unavailable=1`);
      await expect.poll(() => page.locator('[data-select-clip][aria-current="true"]').getAttribute('data-select-clip')).toBe(fixtureClips[1]!.clip_id);
      expect(await page.locator('.clip-card').count()).toBe(4);
      expect(await page.locator('[data-select-clip]').count()).toBe(4);
      const cta = page.locator('details.cta-disclosure'), ctaForm = cta.locator('form');
      expect(await cta.count()).toBe(1); expect(await cta.getAttribute('open')).toBeNull();
      expect(await ctaForm.count()).toBe(1); expect(await ctaForm.isVisible()).toBe(false);
      await cta.locator('summary').click();
      await cta.getByLabel('Что сделать зрителю в конце').selectOption('open_link');
      const ctaInput = cta.getByLabel('Ссылка (https://…)'); await ctaInput.fill('https://example.org/episode');
      await ctaForm.evaluate(el => Object.assign(window, { ctaForm: el, ctaInput: el.querySelector('input[type="url"]') }));
      await cta.locator('summary').click();
      const disclosure = page.locator('.guest-disclosure');
      expect(await disclosure.getAttribute('open')).toBeNull();
      expect(await page.getByLabel('Имя гостя').count()).toBe(1);
      await page.locator('.clip-card').nth(1).getByRole('button', { name: 'Отправить клип гостю' }).click();
      await expect.poll(() => disclosure.getAttribute('open')).not.toBeNull();
      await page.getByLabel('Имя гостя').fill('Ирина');
      await page.locator('.guest-disclosure input[type="checkbox"][required]').check();
      await page.getByLabel('Имя гостя').evaluate(el => Object.assign(window, { guestInput: el }));
      await page.locator('.workspace-settings > summary').click();
      await page.getByLabel('Компоновка').selectOption('studio');
      await page.getByRole('button', { name: 'Светлая тема', exact: true }).click();
      expect(await page.getByLabel('Имя гостя').inputValue()).toBe('Ирина');
      expect(await page.locator('.guest-disclosure input[type="checkbox"][required]').isChecked()).toBe(true);
      await page.locator('.guest-disclosure > summary').click();
      await page.evaluate(() => new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame())));
      const beforePoll = polls;
      const focus = await page.evaluate(() => document.activeElement?.outerHTML);
      const scroll = await page.evaluate(() => window.scrollY);
      await expect.poll(() => polls, { timeout: 7000 }).toBeGreaterThan(beforePoll);
      expect(await page.locator('[data-select-clip][aria-current="true"]').getAttribute('data-select-clip')).toBe(fixtureClips[1]!.clip_id);
      expect(await disclosure.getAttribute('open')).toBeNull();
      expect(await page.getByLabel('Имя гостя').inputValue()).toBe('Ирина');
      expect(await page.getByLabel('Имя гостя').evaluate(el => el === Reflect.get(window, 'guestInput'))).toBe(true);
      expect(await page.evaluate(() => document.activeElement?.outerHTML)).toBe(focus);
      expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
      expect(await cta.getAttribute('open')).toBeNull();
      expect(await ctaForm.evaluate(el => el.isConnected && el === Reflect.get(window, 'ctaForm'))).toBe(true);
      expect(await ctaInput.evaluate(el => el.isConnected && el === Reflect.get(window, 'ctaInput'))).toBe(true);
      expect(await ctaInput.inputValue()).toBe('https://example.org/episode');
      expect(await cta.getByLabel('Что сделать зрителю в конце').inputValue()).toBe('open_link'); expect(mutations).toEqual([]);
      await cta.locator('summary').click(); await cta.getByRole('button', { name: 'Сохранить призыв', exact: true }).click();
      await expect.poll(() => cta.getByRole('status').textContent()).toContain('Сохранено. Кнопка уже на страницах клипов.');
      expect(mutations).toEqual([{ method: 'video.setCta', body: { video_id: id, cta_kind: 'open_link', cta_url: 'https://example.org/episode' } }]);
      const beforeUnavailable = polls;
      offered = offered.map((item, index) => index === 1 ? { ...item, available: false } : item);
      await expect.poll(() => polls, { timeout: 7000 }).toBeGreaterThan(beforeUnavailable);
      await expect.poll(() => page.locator('.clip-card[data-selected="true"] video').count()).toBe(0);
      expect(await page.locator('[data-select-clip][aria-current="true"]').getAttribute('data-select-clip')).toBe(fixtureClips[1]!.clip_id);
      const beforeRemoval = polls; offered = fixtureClips.filter((_, index) => index !== 1);
      await expect.poll(() => polls, { timeout: 7000 }).toBeGreaterThan(beforeRemoval);
      await expect.poll(() => page.locator('[data-select-clip][aria-current="true"]').getAttribute('data-select-clip')).toBe(fixtureClips[0]!.clip_id);
      await page.goto(`${origin}/player-fixture?clips=0`);
      await page.getByText('Готовых клипов нет.', { exact: false }).waitFor();
      expect(await page.locator('.clip-card').count()).toBe(0);
      expect(await page.getByRole('link', { name: 'Загрузить запись', exact: true }).isVisible()).toBe(true);
      await page.goto(`${origin}/player-fixture?clips=1`);
      await expect.poll(() => page.locator('.clip-card').count()).toBe(1);
      expect(await page.locator('[data-select-clip][aria-current="true"]').count()).toBe(1);
    } finally { await page.close(); await browser.close(); }
  }, 30000);
});

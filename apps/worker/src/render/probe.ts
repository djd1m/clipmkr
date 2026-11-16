import { execFile } from 'node:child_process';
import { renderErrorMessage } from './diagnostics.js';

// V excludes attached cover art: an MP3 cover is not a timed video track.
// Probe failure is not evidence of audio-only input; fail and retain the normal retry path.
export interface VideoStream { index: number; width: number; height: number; sampleAspectRatio?:number }
export async function videoStreamIndex(path: string, signal?: AbortSignal): Promise<number | null> {
  return (await probeVideoStream(path, signal))?.index ?? null;
}
export function probeVideoStream(path: string, signal?: AbortSignal): Promise<VideoStream | null> {
  return new Promise((resolve, reject) => {
    execFile('ffprobe', ['-v', 'error', '-protocol_whitelist', 'file', '-select_streams', 'V:0',
      '-show_entries', 'stream=index,width,height,sample_aspect_ratio:stream_tags=rotate:stream_side_data_list', '-of', 'json', path],
    { timeout: 30_000, killSignal: 'SIGKILL', maxBuffer: 64 * 1024, signal }, (error, stdout) => {
      if (error) { reject(new Error(`Render probe failed: ${renderErrorMessage(error)}`)); return; }
      try {
        const result = JSON.parse(stdout);
        if (!Array.isArray(result.streams)) throw new Error('Missing streams');
        if (result.streams.length === 0) { resolve(null); return; }
        const stream = result.streams[0];
        const { index } = stream;
        let { width, height } = stream;
        if (!Number.isSafeInteger(index) || index < 0 ||
          ![width, height].every(n => Number.isSafeInteger(n) && n >= 2)) throw new Error('Invalid dimensions/index');
        // ffmpeg autorotates before filtering; crop coordinates must use the same orientation.
        const rotation = Number(stream.side_data_list?.find((d: { rotation?: number }) => d.rotation !== undefined)?.rotation ?? stream.tags?.rotate ?? 0);
        if (!Number.isFinite(rotation) || rotation % 90 !== 0) throw new Error('Invalid rotation');
        const rawSar=stream.sample_aspect_ratio;
        const pair=typeof rawSar==='string'?rawSar.split(':').map(Number):[1,1];
        let sar=pair.length===2 && pair.every(n=>Number.isFinite(n)&&n>0)?pair[0]!/pair[1]!:1;
        if (rawSar && rawSar!=='N/A' && rawSar!=='0:1' && !(pair.length===2 && pair.every(n=>Number.isFinite(n)&&n>0)))throw new Error('Invalid SAR');
        if (Math.abs(rotation % 180) === 90) { [width, height] = [height, width];sar=1/sar; }
        resolve({ index, width, height,...(sar===1?{}:{sampleAspectRatio:sar}) });
      } catch { reject(new Error('Render probe returned invalid video stream geometry')); }
    });
  });
}

export function probeDuration(path: string, signal?: AbortSignal): Promise<number> {
  return new Promise((resolve, reject) => {
    execFile('ffprobe', ['-v', 'error', '-protocol_whitelist', 'file', '-show_entries', 'format=duration', '-of', 'json', path],
      { timeout: 30_000, maxBuffer: 65536, signal }, (error, stdout) => {
        if (error) { reject(error); return; }
        try {
          const duration = Number(JSON.parse(stdout).format?.duration);
          if (!Number.isFinite(duration) || duration <= 0) throw new Error('Invalid rendered duration');
          resolve(duration);
        } catch (error) { reject(error); }
      });
  });
}

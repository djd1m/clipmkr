#!/usr/bin/env python3
"""YuNet observations from one bounded decoded source; camera crop never selects outside faces."""
import json
import subprocess
import sys
import os
from urllib.parse import urlsplit
import cv2
import numpy as np

SCORE = 0.6
NMS = 0.3
TOPK = 20
LONG_SIDE = 640


def top_right_camera(frame, grey, detector):
    height, width = grey.shape
    # Use the whole edge rather than a strong line through part of a face or slide.
    rhs = grey[:, int(width * .92):int(width * .99)]
    edge = np.abs(np.diff(rhs, axis=0))
    lo, hi = int(height * .06), int(height * .26)
    edge = edge[lo:hi]
    scores = (edge > 16).mean(axis=1) * edge.mean(axis=1)
    bottom = int(scores.argmax()) + lo + 1
    if scores.max() <= 18:
        return None

    edge = np.abs(np.diff(grey[max(2, int(bottom * .05)):int(bottom * .92)], axis=1))
    lo, hi = int(width * .70), int(width * .96)
    edge = edge[:, lo:hi]
    scores = (edge > 16).mean(axis=0) * edge.mean(axis=0)
    left = int(scores.argmax()) + lo + 1
    if scores.max() <= 22 or not 1.1 <= (width - left) / bottom <= 2.5:
        return None

    _, faces = detector.detect(cv2.resize(frame[:bottom, left:], (320, 180)))
    if faces is None or len(faces) != 1:
        return None
    x, y, w, h = faces[0][:4]
    if not (0 <= x < x+w <= 320 and 0 <= y < y+h <= 180 and .12 <= h/180 <= .75):
        return None
    return left, bottom


def capture_camera(frame, detector):
    height, width = frame.shape[:2]
    width_fit = min(width, 1218)
    height_fit = round(height * width_fit / width)
    screen = cv2.resize(frame, (width_fit, height_fit), interpolation=cv2.INTER_AREA)
    grey = cv2.cvtColor(screen, cv2.COLOR_BGR2GRAY).astype(np.int16)
    header = grey[:int(height_fit * .18), int(width_fit * .09):int(width_fit * .69)]
    rows = (np.abs(np.diff(header, axis=0)) > 10).mean(axis=1)
    if np.count_nonzero(rows > .35) < 2:
        return None
    right = top_right_camera(screen, grey, detector)
    left = top_right_camera(screen[:, ::-1], grey[:, ::-1], detector)
    if bool(right) == bool(left):
        return None
    edge, bottom = right or left
    return {'x': edge / width_fit if right else 0, 'y': 0,
            'width': (width_fit - edge) / width_fit, 'height': bottom / height_fit}


def main():
    path, start, end, step, model = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
    options = json.loads(sys.argv[6]) if len(sys.argv) > 6 else {}
    remote = options.get('remote')
    policy = ['-protocol_whitelist', 'file']
    if remote:
        url = urlsplit(path)
        origin = url.scheme + '://' + url.netloc
        if origin != remote['origin'] or url.username or url.password or url.fragment:
            raise ValueError('source_access_unavailable')
        if url.scheme not in (['https', 'http'] if remote.get('allowHttp') else ['https']):
            raise ValueError('source_access_unavailable')
        policy = ['-protocol_whitelist', 'https,tls,tcp' if url.scheme == 'https' else 'http,tcp',
                  '-format_whitelist', 'mov,matroska,webm', '-max_redirects', '0',
                  '-rw_timeout', '5000000', '-probesize', '1048576', '-analyzeduration', '2000000']
        if url.scheme == 'https':
            policy += ['-tls_verify', '1']
    env = {'PATH': os.environ.get('PATH', '/usr/bin:/bin')}
    def authorize(stage):
        if options.get('authorizeSources'):
            print(json.dumps({'sourceAccess': stage}, separators=(',', ':')), flush=True)
            if sys.stdin.readline().strip() != 'allow':
                raise ValueError('source_access_unavailable')
    authorize('probe')
    probe = subprocess.run(['ffprobe', '-v', 'error', *policy, '-select_streams', 'V:0',
                            '-show_entries', 'stream=width,height:stream_tags=rotate:stream_side_data_list', '-of', 'json', path],
                           stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=8 if remote else 30, env=env, check=True)
    stream = json.loads(probe.stdout)['streams'][0]
    width, height = int(stream['width']), int(stream['height'])
    rotation = next((s['rotation'] for s in stream.get('side_data_list', []) if 'rotation' in s), stream.get('tags', {}).get('rotate', 0))
    if abs(float(rotation)) % 180 == 90:
        width, height = height, width
    crop = options.get('crop')
    filters = []
    if crop:
        x, y, w, h = [crop[k] for k in ('x', 'y', 'width', 'height')]
        if any(type(n) is not int for n in (x, y, w, h)) or min(x, y) < 0 or min(w, h) < 2 or x+w > width or y+h > height:
            raise ValueError('invalid_crop')
        filters.append(f'crop={w}:{h}:{x}:{y}:exact=1')
        width, height = w, h
    scale = LONG_SIDE / max(width, height)
    small = (max(2, int(width*scale)), max(2, int(height*scale)))
    detector = cv2.FaceDetectorYN.create(model, '', small, SCORE, NMS, TOPK)
    capture = options.get('screenCapture') and not crop and not remote and width >= 480 and width >= height * 1.3
    corner_detector = cv2.FaceDetectorYN.create(model, '', (320, 180), .8, NMS, TOPK) if capture else None
    tail = ':eof_action=pass' if options.get('preserveTail') else ''
    filters.append(f'fps={1.0/step:.6f}{tail}')
    frame_bytes = width * height * 3
    authorize('decode')
    proc = subprocess.Popen(['ffmpeg', '-v', 'error', *policy, '-ss', f'{start:.3f}', '-t', f'{max(0.0, end-start):.3f}',
                             '-i', path, '-vf', ','.join(filters), '-protocol_whitelist', 'pipe',
                             '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'],
                            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, env=env)
    samples = []
    index = 0
    try:
        while True:
            raw = bytearray()
            while len(raw) < frame_bytes:
                part = proc.stdout.read(frame_bytes-len(raw))
                if not part:
                    break
                raw.extend(part)
            if len(raw) != frame_bytes:
                break
            frame = np.frombuffer(raw, np.uint8).reshape(height, width, 3)
            _, faces = detector.detect(cv2.resize(frame, small))
            found = []
            if faces is not None:
                for f in faces:
                    x, y, w, h = (float(v)/scale for v in f[:4])
                    found.append({'cx': round((x+w/2)/width, 4), 'cy': round((y+h/2)/height, 4),
                                  'w': round(w/width, 4), 'h': round(h/height, 4), 'score': round(float(f[-1]), 3)})
            sample = {'t': round(start+index*step, 2), 'faces': found}
            if corner_detector is not None:
                camera = capture_camera(frame, corner_detector)
                if camera:
                    sample['captureCamera'] = camera
            samples.append(sample)
            index += 1
            if index > 152:
                raise ValueError('analysis_bound')
    finally:
        proc.stdout.close()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=5)
    if proc.returncode != 0:
        raise ValueError('source_access_unavailable')
    json.dump({'width': width, 'height': height, 'step': step, 'samples': samples}, sys.stdout)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        # Signed capability/argv/raw child diagnostics never leave this process.
        sys.exit(1)

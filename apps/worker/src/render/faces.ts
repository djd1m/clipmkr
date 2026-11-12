// Запуск детектора лиц отдельным процессом (FR-2).
//
// Питон, а не Node: детектор YuNet живёт в OpenCV, и переписывать его нечем. Процесс отдельный по
// той же причине, что и ffmpeg: тяжёлая работа не должна занимать цикл событий, иначе очередь
// объявит обработчик зависшим.
//
// ОТКАЗ ДЕТЕКТОРА НЕ ВАЛИТ РЕНДЕР. Кадрирование — улучшение картинки, а не условие пригодности
// клипа: если лица найти не удалось, клип выходит с прежним кадрированием, и это записывается.
// Обратное означало бы, что за оплаченные расшифровку и выделение пользователь не получает ничего
// из-за необязательной части.
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import type { FaceReport } from './framing-plan.js';

const ASSETS = join(process.cwd(), 'apps', 'worker', 'assets');
// Пути фиксированы: модель и скрипт лежат в образе. Переопределение через окружение убрано —
// оно никому не было нужно, а страж проброса переменных справедливо требовал объявить его в
// compose каждому воркеру. Настройка без потребителя — это поверхность для ошибки, а не гибкость.
export const FACE_MODEL = join(ASSETS, 'models', 'face_detection_yunet.onnx');
export const FACE_SCRIPT = join(ASSETS, 'scripts', 'detect_faces.py');
/**
 * Шаг между кадрами — 0,5 с, то есть 120 замеров на минуту клипа.
 *
 * Было 2 с, и владелец увидел последствие: «есть моменты во всех клипах, где камера смотрит в
 * стену». Камера в подкасте режет примерно раз в 8 с — при шаге 2 с кадр после КАЖДОЙ склейки до
 * двух секунд смотрел не туда, то есть до четверти клипа сорокасекундной длины.
 *
 * Частоту держал не детектор, а способ доставать кадры: прежний скрипт запускал ffmpeg на каждый
 * кадр отдельно (около секунды на замер). Теперь кадры идут одним проходом через конвейер, и
 * вчетверо более частая выборка стоит дешевле прежней редкой.
 */
export const SAMPLE_SECONDS = 0.5;
/** Потолок времени: детектор необязателен, и ждать его дольше рендера бессмысленно. */
export const FACE_TIMEOUT_MS = 60_000;

export async function detectFaces(path: string, start: number, end: number,
  signal?: AbortSignal,options?:{crop?:{x:number;y:number;width:number;height:number};remote?:{origin:string;allowHttp:boolean};timeoutMs?:number;
    authorizeSource?:()=>Promise<boolean>}): Promise<FaceReport | null> {
  if(signal?.aborted)return null;
  if(options?.remote){
    let url:URL;try{url=new URL(path);}catch{return null;}
    if(url.origin!==options.remote.origin || url.username || url.password || url.hash
      || !(url.protocol==='https:' || (options.remote.allowHttp && url.protocol==='http:')))return null;
  }
  return new Promise(resolve => {
    const timeout=Math.min(FACE_TIMEOUT_MS,options?.timeoutMs??FACE_TIMEOUT_MS);
    const {authorizeSource,...parameters}=options??{};
    const child=spawn('python3',[FACE_SCRIPT,path,String(start),String(end),String(SAMPLE_SECONDS),FACE_MODEL,
      JSON.stringify({...parameters,...(authorizeSource?{authorizeSources:true}:{})})],
      {detached:true,stdio:['pipe','pipe','ignore'],env:{PATH:'/usr/local/bin:/usr/bin:/bin',NODE_ENV:process.env.NODE_ENV??'test'}});
    let size=0,failed=false,accesses=0,buffer='';const chunks:Buffer[]=[];
    const kill=()=>{failed=true;if(child.pid){try{process.kill(-child.pid,'SIGKILL');}catch(error){if((error as NodeJS.ErrnoException).code!=='ESRCH')child.kill('SIGKILL');}}};
    const timer=setTimeout(kill,Math.max(1,timeout));
    signal?.addEventListener('abort',kill,{once:true});if(signal?.aborted)kill();
    child.stdin.on('error',()=>{if(!failed)kill();});
    child.stdout.on('data',(chunk:Buffer)=>{
      size+=chunk.length;if(size>8*1024*1024){kill();return;}
      if(!authorizeSource || accesses===2){chunks.push(chunk);return;}
      buffer+=chunk.toString('utf8');
      const newline=buffer.indexOf('\n');if(newline<0){if(buffer.length>128)kill();return;}
      const token=buffer.slice(0,newline);buffer=buffer.slice(newline+1);
      if(token!==JSON.stringify({sourceAccess:accesses===0?'probe':'decode'}) || buffer.length){kill();return;}
      accesses++;
      // The same outer deadline includes the DB round trip. The child opens no source before ACK.
      void authorizeSource().then(allowed=>{
        if(failed || child.exitCode!==null || child.stdin.destroyed)return;
        if(!allowed){kill();return;}child.stdin.write('allow\n');
      }).catch(kill);
    });
    child.on('error',()=>{failed=true;});
    child.on('close',code=>{
      clearTimeout(timer);signal?.removeEventListener('abort',kill);
      if(code!==0 || failed || (authorizeSource && accesses!==2)){kill();console.warn(JSON.stringify({event:'face_detection_unavailable',reason:'source_access_unavailable'}));resolve(null);return;}
      try {
        const report=JSON.parse(Buffer.concat(chunks).toString('utf8')) as FaceReport;
        if(!Array.isArray(report.samples) || !report.samples.length)return resolve(null);
        resolve(report);
      }catch{resolve(null);}
    });
  });
}

# Подтверждённый дефект готовности предпросмотра: запрос решения владельца

Дата: 12.11.2026. Статус: **кандидат подготовлен и проверен изолированно; применение ожидает решения владельца**. Рабочий сайт сохраняет прежнюю версию. Исправление в код проекта не внесено.

## Что воспроизведено

При отказе canvas браузер успешно загружает исходник, но не может нарисовать предпросмотр. `paint()` сообщает `unsupported`; следующий безусловный `onState('ready')` в `ready()` немедленно перекрывает отказ. В настоящем Chromium интерфейс показывает «Предпросмотр доступен», а «Применить оформление» остаётся активной. Это нарушает согласованное требование о проверяемом предпросмотре перед пересборкой.

Исходный RED сохранён: два отказа `getContext`, видео readyState=4/ширина1280, статус ready, disabled=false. Нового общего прогона ради повторения RED не выполняли.

## Конкретное исправление

Ровно два предлагаемых пути:

- `apps/web/src/app/clips/ClipLayoutPreview.tsx`: `paint()` возвращает успех только после завершённого рисования; `ready()` учитывает этот результат.
- `tests/browser/clip-layout.test.ts`: три регрессии для недоступного контекста, ошибки рисования и здорового видео.

Новые опции или компоновка не добавляются. Ниже полный **неприменённый** патч; его SHA-256: `f8bc4ef2b355acddaa3e6370f8d8fbc95dc7de3ca611f83f6a76fa5a9c27fd27`.

```diff
--- a/apps/web/src/app/clips/ClipLayoutPreview.tsx
+++ b/apps/web/src/app/clips/ClipLayoutPreview.tsx
@@ -15,16 +15,16 @@
     const node=video.current,screen=canvas.current;if(!node || !screen || !active)return;
     let frame:number|undefined,raf:number|undefined,disposed=false;
     onState('loading');
-    function paint(){
-      if(disposed || !node || !screen || node.readyState<2 || !node.videoWidth)return;
+    function paint():boolean{
+      if(disposed || !node || !screen || node.readyState<2 || !node.videoWidth)return false;
       try {
         const g=planScreenLayout(latest.current.layout,{width:node.videoWidth,height:node.videoHeight},true);
         const ctx=screen.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
         ctx.fillStyle='#181818';ctx.fillRect(0,0,1080,1920);ctx.save();ctx.beginPath();ctx.rect(0,400,1080,800);ctx.clip();
         for(const placement of [g.screen,g.camera])if(placement){const {source:s,destination:d}=placement;
           ctx.drawImage(node,s.x,s.y,s.width,s.height,d.x,d.y,d.width,d.height);}
-        ctx.restore();
-      }catch{node.pause();onState('unsupported');}
+        ctx.restore();return true;
+      }catch{node.pause();onState('unsupported');return false;}
     }
     draw.current=paint;
     function tick(){
@@ -40,7 +40,7 @@
       else raf=requestAnimationFrame(tick);
     }
     const loaded=()=>{if(!node)return;node.currentTime=latest.current.segments[0]![0];};
-    const ready=()=>{paint();onState('ready');};
+    const ready=()=>{if(paint())onState('ready');};
     const failed=()=>{node?.pause();onState('unsupported');};
     const play=()=>setPlaying(true),pause=()=>setPlaying(false);
     node.addEventListener('loadedmetadata',loaded);node.addEventListener('loadeddata',ready);
--- a/tests/browser/clip-layout.test.ts
+++ b/tests/browser/clip-layout.test.ts
@@ -430,3 +430,17 @@
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(f.applies).toHaveLength(0);
   const out=process.env.N5_SCREEN_ARTIFACT_DIR;if(out){mkdirSync(out,{recursive:true,mode:0o700});await page.screenshot({path:join(out,`${engine}-${width}-${theme}.png`),fullPage:true});}
 },()=>engine==='chromium'?chromiumBrowser:webkitBrowser));
+
+for(const failure of ['null-context','throw-draw','healthy']as const)it(`preview ${failure}: readiness requires a successfully drawn decoded frame`,()=>run(async page=>{
+  const f=await fixture(page);
+  await page.evaluate(mode=>{Reflect.set(window,'layoutPaintCalls',0);
+    if(mode==='null-context')HTMLCanvasElement.prototype.getContext=(()=>{Reflect.set(window,'layoutPaintCalls',Reflect.get(window,'layoutPaintCalls')+1);return null;})as typeof HTMLCanvasElement.prototype.getContext;
+    else{const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(...args:any[]){
+      Reflect.set(window,'layoutPaintCalls',Reflect.get(window,'layoutPaintCalls')+1);if(mode==='throw-draw')throw Error('Synthetic canvas drawing failure');return draw.apply(this,args as any);};}},failure);
+  await editor(page,false);await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'layoutPaintCalls'))).toBeGreaterThan(0);
+  const apply=page.getByRole('button',{name:'Применить оформление',exact:true});
+  await expect.poll(()=>page.getByRole('status').filter({hasText:failure==='healthy'?'Предпросмотр доступен.':'Видеопредпросмотр недоступен.'}).count()).toBe(1);
+  expect(await apply.isEnabled()).toBe(failure==='healthy');
+  expect(await page.evaluate(()=>[...document.querySelectorAll('video')].some(n=>n.readyState>=2&&n.videoWidth>0))).toBe(true);
+  expect(f.applies).toHaveLength(0);
+}));
```

## Реальная проверка кандидата

Node22 + настоящий Chromium + согласованный компонент через изолированный Vite alias, существующий синтетический MP4, coverage выключен. Команда: `node scripts/test.mjs --config /root/.config/clipmkr/zoom-screen-focus-20261111/canvas-readiness-candidate/candidate.config.ts /root/.config/clipmkr/zoom-screen-focus-20261111/canvas-readiness-candidate/candidate.test.ts`.

| Случай | Фактический результат |
|---|---|
| `getContext()` возвращает null | Предпросмотр недоступен, применение заблокировано |
| `drawImage()` выбрасывает ошибку | Предпросмотр недоступен, применение заблокировано |
| Реальный декодированный кадр | Предпросмотр доступен, применение разрешено |

Terminal exit0, **3/3 PASS**, 6,255с. Полный предлагаемый файл продуктовых тестов ещё не запускался; три эквивалентных сценария выполнены приватным harness. Это авторская проверка кандидата, не независимый QE и не успешная квитанция нового этапа. Все159 файлов принятого Source остались неизменны.

## Почему нужно отдельное решение

[Политика независимого ревью Clipmkr](https://github.com/djd1m/clipmkr/blob/main/docs/review-policy.md) применяется вместе с установленным `.agents/skills/feature-adr/modules/08-qe.md`. Точный текст установленного правила: “unchanged third-cycle completion may finish, while an ordinary fourth opening is refused”.

По фактическому read-only отчёту dz: три цикла из трёх, последний цикл **закрыт**, доступная continuation capacity=0. Штатное `begin-continuation` предназначено для третьего цикла, который никогда не закрывался; данный случай под это условие не подходит. Поэтому нельзя объявить дополнительную проверку обычным четвёртым native-циклом или молча обнулить историю.

Предлагается **отдельная явно согласованная ограниченная коррекция** с сохранением полной исходной истории и одним дополнительным независимым проходом. Режим поддерживаемого учёта этой коррекции должен быть отражён открыто; успешные native-receipts не изготавливаются вручную. Разрешение касается именно указанного патча и проверки, а не пропуска других gates или автоматической публикации на Cloud.ru.

## Привязки решения

| Поле | Значение |
|---|---|
| Принятый код | `395bea9eedf219d0a352a20f3da5ee86202ba518` |
| Native Source revision | `ff3527b6a2b855aa253233eb57e9be8adea002861bdc8c078a4004d03857c7ae` |
| Native sequence / predecessor | `10` / `d1df39a36d0b5236a60640e1f8364f7dc0ea0587d1c96f60328385a0f3775d46` |
| Journal / cycle | `9e43550d-6c7a-4601-8406-0de597cccf05` / `f15a8882-fbc4-4ddd-b506-2b53f0e3ad88` |
| Патч двух путей | `f8bc4ef2b355acddaa3e6370f8d8fbc95dc7de3ca611f83f6a76fa5a9c27fd27` |
| Производный target159 | `390800d0c56699aeefe2f080e99d21fb5dbfe66a6157033ca69b312ace5c007f` |
| Candidate Preview SHA | `d8e41f14f688a1275fe3e92e8e07f03924cd50420f2f3011bfff2041050d5cdd` |
| Candidate test SHA | `ab80b8a14fd6f535828684025bdcb29b6454e540192f077398d9ecdb29172bbd` |

Производный target159 рассчитан заменой двух digest в прежнем manifest; это **не** admission нового native-цикла.

## План после решения

1. Зафиксировать ровно эту коррекцию и её связь с прежней историей в feature-adr/OpenSpec; сохранить прежние требования, ADR и Source evidence. Применить два проверяемых изменения после настоящих gates выбранного поддерживаемого процесса.
2. Автор `gpt-6.1-sol high`; независимый проверяющий `gpt-6-astra xhigh` в новой сессии без контекста реализации. Проверить патч, зависимый `ClipLayoutChoice` и неизменность остальных157 Source-путей. Ровно один дополнительный независимый проход; новый предел не скрывать сменой slug/nonce/host.
3. Выполнить затронутые канонические browser-проверки, typecheck и сборку. Сохранить RED/кандидатные результаты отдельно от результатов применённого кода. Все запуски довести до terminal; повторить только затронутые проверки при конкретной причине.
4. Завершить совместимость music/CTA на настоящем S3, точное operational review и сохранность миграции/резервных копий. Обновлённые Source/image/provenance bindings должны быть реально проверены.
5. Проверить опубликованный UI на разрешённом VPS, выдать владельцу ссылку и инструкцию. Cloud.ru и DNS в этот блок не входят.

Численное покрытие критических участков и корректное сравнение с baseline ещё имеют открытые ограничения. Этот запрос не присваивает всей функции `COMPLETE` и не закрывает их разрешением на дополнительную коррекцию.

# Design

## Context

Исходные01/02 и поздние shared geometry/ADR разошлись. Новая компоновка выходит за прежнюю canvas/FFmpeg полосуy400..1200. `getRenderInput` повторно использует опубликованный layout для music/CTA, поэтому глобальная замена геометрииversion1 меняла бы уже выбранное оформление. Основные факты и pinned original — в `features/zoom-layout-mockup-conformance/01_requirements.md` и исходном аудите.

## Goals / Non-Goals

**Goals:** исходные01/02 для нового явного применения; один planner для preview/native; независимый visual oracle; сохранностьv1/03 и блокирующая проверка перед текущимVPS.

**Non-Goals:** новыйML/action tracker, новыепровайдеры/редактор/биллинг, Cloud/DNS, автоматическая пересборка прежних записей. Никаких пользовательских кадров или ключейS3 вGit.

## Decisions

1. Новый внутренний request version2 только для01/02, тот же наборJSONполей, focus:null. Version1 читается и рендерится прежним путём,03 остаётсяv1. Published envelope version1 сохраняется. Аддитивное расширение существующего constraint отдельной миграцией; применённая032 не переписывается. Authoritative ADR/architecture/implementation plan в `features/zoom-layout-mockup-conformance/` уточняют точные contracts.
2. Дляv2 — full-canvas composition, поскольку original02camera/screen вне прежнего clip-band; canvas иnative используют одну geometry. Эталон теста берётся независимо из неизменного original11.11, не из того же новогоhelper.
3. Открытие/poll/reload не превращает старыйv1 вv2. Предлагаемый отдельный upgrade-action создаёт только localdraft; новаяпубликация — после обычногоподтверждения. Независимая высотаROI предлагается в существующем advancedpanel. ЭтиUIуточнения иfooterlayout представлены как новый, ещё не одобренный макет; доUIкода нужно конкретное согласование владельца.
4. Кандидатныеsubtitle/CTA/footerboundsv2/02 должны пройти отдельный pre-code realfont bboxqualification: не перекрыть screen, camera, обязательнуюметку; сохранитьдействующиеWM/code/CTAсмысловыеинварианты. Неумещение — STOPдоK2 и уточнение макета, а не молчаливое смещение originalscreen. Непроверенный fit не называется фактом.
5. Предвыпускной guard связывает originalpins, source/image revision и результатыvisual/native/browserQЕ. Existing release-candidate рассчитан на оба историческихстенда, поэтому его нельзя запускать здесь в прежнемрежиме; bounded currentVPSwritepath должен проверятьevidenceдо первоймутации. Локальныйguardнепредотвращаетсознательныйrootbypass/подменуинструмента; не обещатьremote branch protection без фактической настройки.

## Risks / Trade-offs

- Старыйbinaryнечитаетновыйv2 → rollbackтолькозаранеепровереннымсовместимымартефактом; запретoldworkerпослеv2доdrain/совместимости. Конкретныйпорядоквfeatureплане.
- Новаяпозиция01намеренноперекрываетуголscreen → этоoriginalPiP, нетобещаниябезусловнойчитаемостивсегоугла.
- Другиеaspectratio → containбезрастяжения, отдельныеfixtures; не хардкодитьROIодногоисточника.
- Общийhelperвpreview/nativeможетовоспроизвестиоднуошибкувобоих → independentoriginaloracle, behaviouralREDиmutationcontrols.
- Переиспользованиестарыхgreenreceipts → фиксироватьточныеревизии,закрытыйстарыйSourceнепереоткрывать.

## Migration Plan

План/макеты→настоящиеfeature-adrgates→совместимыечитателиv1/v2→применимаяDDL→новыеproducer/consumerоднойпровереннойревизии→currentVPSQA→реальные01/02вQAкабинете→ручнаяприёмкавладельца. СтарыеMP4/БДнепереписывать;Cloud/DNSнет. Доразрешенияcode-entryэтотфайлнеозначаетзапускаDDLилипоставки.

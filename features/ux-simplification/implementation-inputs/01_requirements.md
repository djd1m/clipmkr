# Текущие требования для архитектора

05.11.2026. Вход для Astra, НЕ утверждённый implementation-plan.
Exact UI approval **PENDING**; исторические два точечных одобрения сохранены в
`../owner-approval.md`. Координатор отдельно ожидает ответ на конкретный HTML.
База: `a4488b4caf602f093a0cc3393b4903e210cb3989`.

## Привязка источников

- Предложение: `docs/design/2026-11-05-ux-simplification.html`, SHA-256
  `a85b3f073a335871e421ea2079269fa19c71f42a263d7b0bd17ae30469c50e68`.
- Авторитетные FR-1…FR-7: `features/ux-simplification/01_requirements.md`,
  SHA-256 `8161527d35324d60b0956bc2814950b68bf0575b50f71764bca5fbb25400f8d1`.
- OpenSpec delta: `openspec/changes/ux-simplification/specs/progressive-disclosure/spec.md`,
  SHA-256 `483856d17059d3af2f0ec7a7af691c37f2f4c3e320c98a7778c943a45a55622f`.
- OpenSpec proposal: `openspec/changes/ux-simplification/proposal.md`, SHA-256
  `c9fb5e268e6d07b9450e4fe7be6d5a251f7aef70cb2c200826ab524c3a16b4a6`.
- Текущие `AGENTS.md`, `docs/acceptance/core-cjm.md` и
  `docs/plans/2026-11-05-ui-recovery-cloud-delivery.md` имеют приоритет над историческими
  заметками об остановке работ/старом тестовом origin. Проверки и приёмка — clipmkr.ru;
  последующий перенос на c.clipmkr.ru сохраняет оба datasets, в этот UI-scope не входит.

## Stakeholders, цель и reuse

Пользователь создаёт/смотрит/скачивает клипы; блогер дополнительно распространяет
свою готовую ссылку; owner назначает блогеров и видит отчёт. Владелец продукта
согласовывает конкретную компоновку и затем принимает опубликованный UI.
Реализованные auto-link и персональный TEST checkout переиспользуются целиком;
не повторять backend/server guards и не расширять доступ к тестовой покупке.

## Уточнённая проверяемая приёмка исходных FR

| FR | Given / When | Then / существенная граница |
|---|---|---|
| FR-1 | Все21 семейство текущих экранов сопоставлено с proposal | У каждого явный change/preserve/regression статус в code-target-inventory; ни один не исчезает молча |
| FR-2 | Новый файл / пользователь явно запускает обработку | Один основной старт; стоимость/лимит до запуска; picker сам не отправляет; upload/recovery остаются реальными, не таймером макета |
| FR-3 | Изменены музыка/teaser/compact/CTA; advanced закрыт/открыт | Значения и summary сохранены; Play/poll/смена выбранного клипа/панели не сбрасывают CTA или draft; настройки другого клипа независимы |
| FR-4 | Ordinary/blogger/owner открывают рабочий кабинет | Owner-tools только owner; blogger видит готовую свою ссылку/copy/loading/error/blocked без advanced; extra codes/statistics контекстны; обычный клип-CJM доступен всем |
| FR-5 | Ошибка/пауза/неизвестный статус/partial/денежное действие | Причина, допустимое recovery, готовый player/download, цена/подтверждение и consent видны возле действия; пустой статус не success; права определяет сервер |
| FR-6 | 390/1440, dark/light, workspace/studio | Кабинет default без сохранённого выбора; существующий выбор и SSR/document preference lifecycle сохраняются; нейтральная зелёная палитра без смены font/token системы |
| FR-7 | Реальный компонент сопоставлен с согласованным exact proposal | Same theme/layout/width/state screenshots + keyboard/focus/error tests; собственный smoke, независимый QE и app E2E различены; локальный preview не равен приёмке приложения |

Нативный state сохраняет consent только конкретного набора гостя: смена получателя/
состава, создание нового пакета требуют явного нового согласия. Закрытый пакет,
включение14-дневной ссылки, copy и revoke — разные действия с сохраняющимся списком.
Owner-limit: integer2–1440/null→120, rate null/20/30 и обязательная причина сохраняются;
скрытое invalid поле раскрывается/фокусируется, неверный submit не проходит.

## Compatibility, деньги и error paths

Нет новой подписки/цены/квоты/API. Сохранить90/120мин, индивидуальный лимит,
server ownership, общий credit reserve и один charge за запись, expiry и старый
доступ при failed rerender. Реальная доступность checkout для текущего аккаунта
считывается сервером; существующие blocked/catalogOnly/owner/TEST состояния не
подменяются жёстким «оплата отключена» из макета. Нужны cancellation/pending/timeout/
foreign-intent и disabled reason в контексте, даже если все эти ветви не нарисованы.
Recovery backend расширяется отдельным S3/partial блоком; этот UI показывает retry
только при фактически разрешённом сервером действии, не обещает отсутствующий API.

## NFR и открытые решения для Astra

Keyboard и возвращение фокуса; native invalid;320/390/1440 и200% text zoom;
длинные email/URL/названия; request failures/busy/reload; SSR/theme consistency.
Тесты должны сохранить player identity/src/currentTime и не пересоздавать player
при polling или смене настроек. Новые polling/endpoints/analytics не требуются.

PENDING: контекстное размещение account и blogger stats (существующая страница,
section или route); владение edit draft при смене клипа; share-container и focus
return; недоступный пока серверный partial-retry; влияние глобального CSS на
recovery/legal/support. Это входы архитектору, не выбранные автором решения.

## Проверка входов и code/spec anti-drift этой подготовки

Reference studio-extended-qe: применены requirement→risk→scenario и impact/reuse
selection, без AQE runtime и без утверждения нового QCSD/Step8. У рискованных мест
указаны конкретные сценарии: lost draft/consent, hidden invalid, player remount,
server eligibility и partial-retry. Это задания будущей проверки, не их PASS.

Фактический `git diff --exit-code HEAD -- apps packages tests scripts openspec
 docs/design` и frozen root feature inputs вернул пустой diff/exit0. Отдельная
hashlib-проверка старого manifest:14/14 non-native frozen inputs неизменны; из5
native snapshot inputs изменены2 на более новом main (globals.css/PartnerPanel,
поставка auto-link),3 совпадают. Полный старый manifest не выдаётся за текущий19/19.
Exact HTML и оба OpenSpec hashes заново измерены и совпали с указанными выше.
Новые файлы — только четыре implementation-inputs и pending root06; Git mutations
ограничены worktree add под `/root/.config/clipmkr/shared-git.lock`. Старый design
worktree/main не редактировались; commit/push не выполнялись.

NOT RUN: app tests/browser/E2E, новый независимый QE, formal prepare/K1/K2/QCSD,
runtime/SSH/deploy — эта подготовка не меняет продукт и не может закрывать их.
Новый подтверждённый дефект/урок не установлен; повторный teach не создавался.

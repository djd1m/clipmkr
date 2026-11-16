# Logout cleanup: Step6 authority amendment

Root санкционировал wiring существующего ADR-003 logout/account-change cleanup. Семантические core9/4ADR/OpenSpec/approvedUI не менялись; новый дизайн/Source QE cycle не создавался. Предыдущие42 editable сохранены, включая screen.ts.

| Добавление | Authority |
|---|---|
| `apps/web/src/app/support/SignOut.tsx` | editable, existing successful logout boundary |
| `apps/web/src/lib/clip-layout-draft.ts` | editable, новый browser-only prefix/cleanup/event helper |
| `apps/web/src/lib/support-client.ts` | read-only, generic support-clear бывает при focus/unmount |
| `apps/web/src/server/auth-handler.ts` | read-only, existing successful logout HTTP contract |

Итого **44 editable+22 read-only=66**, XL. Полный schema/envelope/read/write остаётся в Choice; shared helper не новый persistence service. Tests только existing `tests/browser/clip-layout.test.ts`.

Successful logout POST → clear только session keys с общим Choice/SignOut prefix `n5-clip-layout:v1:` с любой страницы, даже без mounted Choice. Failed POST → draft сохраняется. Layout cleanup не трогает support/upload/other keys; generic support-clear не logout. Helper возвращает actual read-back boolean и один local clear event с этим результатом; mounted Choice сбрасывает memory/review/decoder до hard redirect. Blocked storage не выдаётся за успешную очистку или failed logout после HTTP success; existing feedback честно сообщает fallback, restore остаётся строго current authorized account/source, без cross-account draft. Новых controls/flags/services нет.

Exact Sol names: module `clip-layout-draft`; exports `CLIP_LAYOUT_DRAFT_PREFIX`, `CLIP_LAYOUT_DRAFT_CLEAR_EVENT`, `clearClipLayoutDrafts`. Actual K1 exit0 all4free, complete508files. Root provisional SESSION_CLEARED не выбран; его предыдущий check сохранён отдельно. Existing SignOut не новый collision.

На root-confirmed complete SOURCE freeze HEAD1a9749e76be35bb3f66e55787104eda1a8d42ca6/base8a807d17dc2802c1b7dccc06a26719478f8c99c1: K2 exit0 PASS0fail/1warnC8/1skipC4, explicit ZF/AC20/20; admission exit0 admitted; context exit0 complete97 428B/98 304B; supported plan checkpoint exit0 ok:true. Twelve AM/test names/11conditions/9TASK сохранены. Source66 не менялся во время пакета. Это readiness, не functional/logout/QE PASS.

06 SHA `9717c9023e5558410fc4f4d101af260b467b1ec1ae34a4f75734c777ca63bb15`.
Literal SHA `bd7caefa33fc1b0b0fb1bfd884a7e4eb45b7962b171b23624e2f5792c3536e0d`.
Private actual commands/results: `/root/.config/clipmkr/zoom-screen-focus-20261111/phase-b-logout-amendment/gate-package.json`; полный `coder-context.literal.prompt.md` в той же директории. Root expanded GO ещё не выдан; same Sol fully reads this literal before continuation. Предыдущий пакет не подменяет новый. Product/Git/runtime/QE/commit здесь NOT RUN; только supported plan checkpoint записан реальной CLI.

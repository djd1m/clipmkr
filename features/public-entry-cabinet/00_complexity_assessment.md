# Complexity routing — public-entry-cabinet

05.11.2026. База: `bb178c42cb570103e40cf10f8bad37d73128a0d9`.
Task kind: feature

Новая публичная композиция по конкретному согласованному макету и исправление наблюдавшихся
CTA/focus/password-help препятствий в существующем UI; auth backend не меняется.

| Измерение | Балл | Обоснование |
|---|---:|---|
| Файлы реализации и тестов | 3 | Ожидается 11 targets, включая обслуживание существующего mutation runner; process-документы считаются отдельно |
| Домены | 1 | Одно публичное представление существующего auth/acquisition; billing/referral вызываются по старым контрактам |
| Новые интеграции | 1 | Ноль новых сервисов, зависимостей и API |
| Breaking changes / поведение | 2 | API/schema не ломаются, но меняются начальный режим, CTA, порядок страницы и контракт старого R9 |
| Новые модели данных | 1 | Ноль таблиц, миграций, сущностей |
| Сквозные concerns | 2 | Один: auth presentation с сохранением credential/privacy/retry/redirect invariants |
| **Итого** | **10** | **M: 9–13** |

Проверка overrides: XL dimensions отсутствуют; auth-sensitive UI требует полной M-проверки,
а не S smoke. Слово «redesign» обычно смещает к L; здесь ограниченный approved one-page redesign,
без нового домена/интеграций, 11 targets и точного HTML достаточно для M по сумме 10 баллов.
Одиннадцатый файл — существующий mutation runner со старым demo-above-fold ожиданием, обязательное
обслуживание проверки при новом согласованном порядке. Размер одного измерения L не делает сумму L;
XL override не применяется. Предварительная цель 8–10 пересмотрена честно, проверки не урезаются.
При новой auth абстракции, изменении backend или дальнейшем росте targets пересчитать scope до кода.

Активные этапы: `0 → 1 → 3 → 3.5 → 5(light) → 6 → K1/K2 → 7 → 8`.
Step 2 formal research, Step 4 DDD и Step 9 fleet не активируются для M; reuse inventory обязателен.
Одна lightweight ADR. Step 3.5 QCSD и независимое cross-model QE обязательны.
План, checkpoints/receipts и фактические gate verdicts оформляет координатор; этот документ
не является успешной квитанцией или дополнительным согласованием владельца.

Ориентир M — 45 минут (requirements 5, architecture/plan 10, code 20, QE 10);
это плановый baseline, не обещание уложить deployment/реальную auth/manual acceptance в 45 минут.
Режим — reference QE с закреплёнными протоколами; AQE runtime не установлен.

Recall: coordinator выполняет проектный pinned dz и прикладывает actual output в execution artifacts.
До получения вывода здесь нет утверждения о retrieved lessons. Источники известного урока:
`docs/design/2026-11-05-public-entry-audit.md` (CTA оставался в login, focus/password-help)
и утверждённый макет; эти наблюдения не подменяют результат recall.

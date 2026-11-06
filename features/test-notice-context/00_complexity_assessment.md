# Контекстные предупреждения тестовой оплаты

Task kind: bugfix
Tier: S. Оценка 7: файлы 2 (пять runtime JSX-файлов и два существующих теста; один readonly semantic input),
домены 1 (текстовая маркировка), интеграции 1 (новых нет), breaking 1 (нет),
модели данных 1 (нет), cross-cutting 1 (политики auth/payments не меняются).
Override отсутствует: нет миграции, редизайна или изменения контрактов.
Active Steps: 0 → 1 → 6 → 7 → 8. ADR/DDD/архитектура и fleet для S не требуются;
сохраняется существующая серверная конфигурация payments.mode/testMode.
Бюджет: требования 2, план 3, реализация 10, QE 10 минут, без времени независимой проверки.

Наблюдаемый baseline: main 44cc7c4c45fb8b89d8be8bfc48e04abb9439b78d.
Изолированный worktree /tmp/clipmkr-test-notice-context-20261106.
Автор: gpt-6.1-sol high. План до кода принимает отдельная gpt-6-astra xhigh сессия;
независимое QE — новая gpt-6-astra xhigh сессия после реализации.
Reference mode: протоколы QE без AQE runtime. Общий brain /home/clipmkr/.dz.
Root сообщил выполненный recall до делегирования: 5 уроков; собственный recall автора
и точные результаты переходов сохраняются отдельно, число чужих результатов не присваивается.
Первоначальный scope: 4 runtime + 2 tests. Rework QE-TEST-001: 5 runtime + 2 tests
и readonly PartnerPanel.tsx; S score7 сохраняется. План ограниченного rework до кода
принимает originating independent Astra qe-primary; исторические первоначальные receipts сохраняются.

# Предложение одного дополнительного цикла QE

06.11.2026. **Ожидает явного решения владельца. Это не полученное согласие.** Новый UI уже работает на clipmkr.ru; запрос касается только отдельного служебного исправления TEST callback, без Cloud.ru и без настоящих списаний.

## Конкретное исправление

После успешного допуска ошибка следующей повторной проверки до входа в revalidate могла оставить старое process-local подтверждение. Кандидат добавляет первым действием operate сброс подтверждений, до открытия файла, блокировки и чтения журнала:

```diff
 def operate(s,a):
+    CONFIRMED.clear()  # One-operation namespace: revoke before every fallible entry check.
```

Иные строки исполнителя и launcher не изменены. Требования/OpenSpec, ADR, архитектура, разрешённые WRITE2/READ-ONLY3 не расширены. Автор — gpt-6.1-sol high; предлагается собственная повторная проверка primary/security/architecture gpt-6-astra xhigh в исходных независимых сессиях, с сохранением всех условий и истории. Не требуется новое слепое ревью вместо originating verification.

Автор проверил8 старых RED контрпримеров,10 исправленных сценариев GREEN,40 operational и2 portable tests,14 отрицательных мутаций. Это локальные файлы/процессы; внешние Docker/Caddy/HTTP adapters SIMULATED. Независимый четвёртый цикл и runtime ещё не запускались. Консервативный сброс охватывает одну process namespace; одновременное использование нескольких операций в одной namespace потребует повторного допуска. Нулевой downtime не обещается.

## Точная привязка предлагаемого согласия

| Поле | Значение |
|---|---|
| projectRoot | /tmp/clipmkr-test-webhook-route-20261105 |
| featurePath | /tmp/clipmkr-test-webhook-route-20261105/features/align-test-webhook-route |
| journalId | 4568510f-841d-40c2-af6a-b84526212aae |
| sequence | 7 |
| eventDigest | d030de03c1d68eeeee2db52723ff3d57722415e9bf387c341e4220c23db685d5 |
| cycleId | 0814e0cc-fc21-43bc-874e-b1da02050eae |
| prior revision | 9a1a55689ca064034778e15b6302f4efea6e1782bb4174cbb87a6cd0cfb60119 |
| proposed targetRevision | 09305c199a2dee9aae2e4316eed951898b9dd9346673a49a443d86fa1cf74487 |
| source SHA-256 | db0dbd2fbdae3caea1de1b9416d5c9a67596dc5f59bfff0363d2613610118087 |
| test SHA-256 | 4292d6eb2e5fd726ddb999f0e40a0b542d76503b1e998f30b7ce092682bcee16 |
| launcher SHA-256 | b9b8ab7b8965d518f1dc4849d3dea0903696dc13200efbaa803e320cdff25892 |

Официальный read-only check-code-targets измерил targetRevision; K2 exit0. Это измерение, а не разрешение четвёртого цикла. После публикации и непосредственно перед admission точная ревизия сверяется повторно. При изменении target или predecessor требуется новое привязанное решение; помощник не дополняет отсутствующее согласие.

## Зачем требуется отдельное решение

Установленный feature-adr1.5.25, `modules/08-qe.md`, Quality Gates: «Native QE keeps its default ceiling at three» и «consent must explicitly bind it. No helper fills missing consent or updates stale bindings». Поддерживаемый begin-continuation допускает ровно один дополнительный цикл с native-qe-owner-approval-1 и точными predecessor/target bindings. Автономное поручение не содержит этих bindings; сброс журнала/новая family для обхода запрещены.

Предлагаемая формулировка решения: **«Разрешаю один дополнительный, четвёртый цикл QE для align-test-webhook-route на targetRevision 09305c199a2dee9aae2e4316eed951898b9dd9346673a49a443d86fa1cf74487 с predecessor, указанным в этом документе».**

Это разрешение проверки, а не принятие качества или runtime GO. При допуске и независимом закрытии условий затем отдельно исполняются настоящие checkpoints, свежая проверка маршрута/обеих БД/TEST isolation, ограниченный apply с откатом и TEST E2E. Другой private QA runner пока имеет открытое замечание ownership при cleanup и также не допущен к runtime. Платёж, duplicate/cancel, начисление и нарезка после оплаты не объявляются успешными заранее.

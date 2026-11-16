# Ограниченная коррекция canvas readiness — 16.11.2026

Это документ отдельной явно разрешённой владельцем коррекции внутри прежней Zoom-фичи. Новый native slug, новый native cycle или сброс истории не создаются. Учёт: старые закрытые 3/3 + один явно разрешённый внешний cross-model проход. Native4 не объявляется.

## Маршрутизация

S: ровно два существующих editable runtime/test пути; один домен browser preview; новых интеграций, breaking-контрактов, моделей данных и сквозных механизмов нет. Шесть измерений по одному баллу, итог 6. Активная ограниченная цепочка: требования/reuse → план/K1/K2 → точный patch → affected tests/typecheck/build → один внешний независимый QE → anti-drift. Исходный XL-процесс и его результаты не пересчитываются.

Бюджет отдельно: подготовка и gates 10–20 мин, точное применение 1–2 мин, canonical проверки 5–15 мин, независимый QE и поставка Root отдельно. Это оценка, не выполненные этапы.

## Неизменные привязки

Принятый commit: 395bea9eedf219d0a352a20f3da5ee86202ba518.
Native Source revision: ff3527b6a2b855aa253233eb57e9be8adea002861bdc8c078a4004d03857c7ae; sequence10; predecessor d1df39a36d0b5236a60640e1f8364f7dc0ea0587d1c96f60328385a0f3775d46.
Journal9e43550d-6c7a-4601-8406-0de597cccf05; closed cycle f15a8882-fbc4-4ddd-b506-2b53f0e3ad88.
Точный bundle SHA256: f8bc4ef2b355acddaa3e6370f8d8fbc95dc7de3ca611f83f6a76fa5a9c27fd27.

Автор: gpt-6.1-sol high; независимый проверяющий назначается Root: gpt-6-astra xhigh, новая сессия без coding-контекста. Все private evidence/logs: отдельная закрытая папка canvas-correction-20261116 внутри прежнего runtime evidence root. Старые native receipts не меняются.

## Acid-сценарии

| Acid | Отказ/инвариант |
|---|---|
| A1 | getContext=null при decoded video запрещает ready/apply |
| A2 | drawImage бросает при decoded video и отказ не перекрывается ready |
| A3 | здоровый кадр остаётся готовым, остальные157 Source paths и закрытая native3 история не меняются |

# Согласование двух макетов и новый запрос на упрощение

05.11.2026 владелец прямо написал: **«оба макета согласованы»**. Сообщение следует
за показом макета автоматической ссылки блогера и частично готовых клипов.

Согласованные артефакты:

1. Автоматическая ссылка блогера, Git revision
   `18e4fa98e72fd8bdc84287d6c7495b4e3410b907`,
   `docs/design/2026-11-05-blogger-auto-link.html` и screenshots/blogger-auto-link-*.
   [Телефон](https://raw.githubusercontent.com/djd1m/clipmkr/18e4fa98e72fd8bdc84287d6c7495b4e3410b907/docs/design/screenshots/blogger-auto-link-dark-390.png).
2. Частично готовые клипы: ранее согласованный неизменённый HTML SHA-256
   `f79ca35360590946456c9fb101fe282724ce0fe5f9642250d2cc2646129bf139`, mobile PNG
   `eadb1a969481b8808231f35a25fb43403a9ce2e05c41c79b379730356688d8da`.
   [Телефон](https://raw.githubusercontent.com/djd1m/clipmkr/f539b3390731796c4ee4b28fe9ab2f0e85a39736/docs/design/screenshots/partial-render-recovery-390.png).

Отдельное принятое решение по статистике: вариант «Да» — учитывать прежние
частичные результаты, а retry не переносит исходный месяц. Подтверждение:
[owner-approval](https://github.com/djd1m/clipmkr/blob/1659d7002bdf344a00260e0eefcb05c07f47d016/features/partial-render-recovery/owner-approval.md).

В том же сообщении владелец потребовал пересмотреть все экраны трёх ролей,
сократить опции по умолчанию и вынести остальные в advanced, ориентируясь на
https://reels-boss.io/. Это разрешение на исследование и проектирование;
переработанные макеты остальных экранов ещё не согласованы. Существующие
feature-adr gates, независимое ревью и ручная приёмка не считаются выполненными
самим одобрением макетов. Перенос данных остаётся остановленным.

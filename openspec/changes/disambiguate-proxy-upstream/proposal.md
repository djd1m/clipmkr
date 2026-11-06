# Однозначный upstream промежуточного proxy source-site

## Причина
Baseline перед созданием сессий и checkout остановлен действующим guard из-за нескольких регистраций DNS-имени `web` в сетях промежуточного proxy. Неверная фактическая доставка не установлена. Требуется конкретная привязка source-site при сохранении переносимого базового Compose.

## Изменение
Явный source-only native Compose override для будущего cold deploy подключает отдельный site artifact; текущий warm переход сохраняет старый mount. Site artifact задаёт единственный upstream `n5-clipmaker-web-1:3000`. Платёжный private runner проверяет точные новые bytes и уникальную регистрацию выбранного имени во всех общих сетях; прежние identity/loaded/config/TEST guards сохраняются. Контролируемый reload использует тот же bind inode, container и PID.

## Границы
Исполнение и решения: `features/disambiguate-proxy-upstream/`. План ещё требует независимого рассмотрения. Это отдельный обнаруженный DNS binding, без изменения уже закрытого callback09305c, приложения, финансовых правил или Cloud/DNS. Дельта требований не разрешает runtime.

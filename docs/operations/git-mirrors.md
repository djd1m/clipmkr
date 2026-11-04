# Зеркала Clipmkr

Поручение владельца 04.11.2026: отправлять одинаковые коммиты в три репозитория:

- [GitHub](https://github.com/djd1m/clipmkr) — основной источник получения кода.
- [GitLab](https://gitlab.com/jechkov.dmitriy/clipmkr).
- [GitVerse](https://gitverse.ru/dzhechkov/clipmkr).

## Настройка рабочего VPS

В `/home/clipmkr` настроены remotes `github`, `gitlab`, `gitverse`.
`origin` получает код с GitHub; у него три стандартных Git `pushurl`.
Команда отправляет одну и ту же ветку во все назначения:

```bash
GIT_TERMINAL_PROMPT=0 git push origin main
```

Нативный Git выполняет отправки отдельно: успех одной площадки не гарантирует успех
остальных. После отправки сверяются `refs/heads/main` во всех трёх репозиториях
с локальным HEAD. При частичном отказе повторяется push только нужного remote,
например `git push gitlab main`. Переписывание и удаление удалённых веток автоматически
не выполняются. Все локальные рабочие ветки командой `--mirror` не публикуются.

## Авторизация

Первичная проверка: HTTPS push остановился на отсутствии учётных данных.
Проверка только стандартного SSH-порта 22 оказалась недостаточной: подтверждены
рабочие SSH-подключения к `altssh.gitlab.com:443` и `gitverse.ru:2222`.
Для новых зеркал настроен SSH, GitHub продолжает использовать HTTPS.

На рабочем VPS создан отдельный ключ Ed25519 для этих двух репозиториев.
Его публичная часть: `/root/.config/clipmkr/git-mirrors/id_ed25519.pub`.
Закрытый ключ и конфигурация хранятся вне Git. Проверенные по официальной
документации ключи серверов закреплены в отдельном `known_hosts`;
`StrictHostKeyChecking` включён. SSH-конфигурация подключена через локальный
`core.sshCommand` этого репозитория, настройки других проектов не изменены.

Владелец добавляет одну и ту же **публичную** строку в оба репозитория:

- GitLab: Settings → Repository → Deploy keys → Add new key;
  название `clipmkr-vps-mirrors`, включить **Grant write permissions to this key**.
  [Инструкция GitLab](https://docs.gitlab.com/user/project/deploy_keys/).
- GitVerse: Настройки → Ключи развертывания → Добавить;
  имя `clipmkr-vps-mirrors`, включить **Разрешить запись**.
  [Инструкция GitVerse](https://gitverse.ru/docs/collaborative/authentification/deploy-keys).

Раздел GitLab **Deploy tokens** для отправки Git-коммитов не подходит:
его `read_repository` разрешает только чтение; права записи реестров не дают
права записи Git-репозитория.
[Области доступа deploy tokens](https://docs.gitlab.com/user/project/deploy_tokens/#scope).

Пока ключ не добавлен владельцем, оба SSH-сервера отвечают `Permission denied (publickey)`.
Статус синхронизации новых зеркал — **ожидает регистрации ключа**.
После регистрации необходим обычный push и сверка SHA на всех трёх площадках;
сама доступность SSH ещё не доказывает право записи.

### Запасной вариант HTTPS

Ранее подготовленные профили на рабочем VPS, права 0600, вне Git:

- `/root/.config/clipmkr/git-mirrors/gitlab.env`: `GITLAB_USERNAME`, `GITLAB_TOKEN`.
- `/root/.config/clipmkr/git-mirrors/gitverse.env`: `GITVERSE_USERNAME`, `GITVERSE_TOKEN`.

Имена пользователей предзаполнены. Для GitLab нужен токен с `write_repository`:
это разрешение на Git pull/push по HTTPS, [документация](https://docs.gitlab.com/security/tokens/access_token_scopes/).
В GitVerse токен создаётся в настройках пользователя, разделе управления токенами,
с доступом к репозиториям на чтение и запись:
[документация](https://gitverse.ru/docs/collaborative/authentification/tokens/).

При использовании SSH заполнять эти профили не требуется. Если понадобится HTTPS,
секреты передаются нативному Git credential helper через stdin и сохраняются в закрытом
credential-store вне Git. В URL remotes, команды, журналы и документы значения токенов
не добавляются. Конфигурация helper действует локально для этого проекта и двух хостов.

## Исходная история

На GitLab найден один независимый коммит `b71f438` с шаблонным README; GitVerse пустой.
Исходный GitLab-коммит сохранён в истории слияния `27d3613`, рабочее дерево осталось
деревом основного проекта; идентичность дерева до и после слияния проверена.
Это позволяет обычный fast-forward push в GitLab без удаления его исходной истории.

Конфигурация `.git/config` локальная: при новом клонировании настройка remotes/pushurl
повторяется, закрытые учётные данные на новую машину автоматически не переносятся.

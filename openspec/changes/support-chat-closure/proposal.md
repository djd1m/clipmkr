# Согласовать закрытие widget с очисткой identity

У существующего Libredesk видимая iframe может оставаться после focus→clear, когда React уже снял close controls. Узкий S bugfix синхронно скрывает native widget до очистки controls, сохраняя existing privacy/logout/epoch и отдельный normal hide-only close. Новые UI, SDK или возможности истории не добавляются.

Authority и execution: `features/support-chat-closure/owner-authority.md`, exact-reviewed01/06. История/verified contact исследуются root отдельно. Поставка и runtime по этому proposal не выполнены.

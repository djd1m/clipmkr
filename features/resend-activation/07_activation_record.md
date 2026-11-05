# Фактическая активация существующего Resend

05.11.2026. Владелец сообщил «готово! можешь проверять», закрытый профиль заполнен. Профиль прошёл штатный loadMailConfig. Resend принял нейтральное проверочное письмо с отправителя на clipmkr.ru, HTTP200; владелец отдельно подтвердил «Да, письмо пришло». Это подтверждает приём и фактическое получение именно проверочного письма; не подменяет recovery E2E.

Независимая fresh-context read-only проверка операций requestedgpt-6-astra xhigh дала GO до apply. Это context-independent ops review, а не cross-model аттестация private script автора: модель родителя не аттестована. Приложение не перекодировалось; ранее проверенный код Sol/independentAstra сохранён.

После fresh backup/catalogue и точного сравнения кандидата изменены только3web environment значения: N5_MAIL_MODE,N5_RESEND_API_KEY,N5_MAIL_FROM. Проект n5-clipmaker на test clipmkr.ru,194.85.249.105. Web-only recreate --no-build --no-deps --pull never, imageclipmkr:public-entry-8859f762c4ce-web и source8859f762c4ce19f6ba51310ac09148b4a7d5ef2f неизменны. Другие env, mounts и ID шести остальных контейнеров сохранены; 644business rows26tables совпали по SHA непосредственно до/после apply, session исключена явно. Cloud.ru/DNS не изменялись. Откат — исходный compose без нового mail override; backup и закрытые config snapshots сохранены.

Исправленная версия operational script SHA256da32e57bd533b33a5c416a8db60c3345dd83e5d9a4efc939c0c44a26822f8712. Первый prepare остановился до apply на ошибке filehandle.chmod; исправлено на os.fchmod, повтор существующих private candidate files разрешён только при точном совпадении bytes. Повторный prepare и actual apply завершились успешно. Неудачная попытка не объявлялась PASS.

Ключ отсутствует в argv/итоговом stdout/публичных артефактах/Git. Полные operational snapshots и stdout inspect/compose содержат секреты и хранятся только в закрытом0700/0600 контуре вне Git. Это не утверждение, что значения нигде не сохраняются.

Actual browser390×844: /forgot200, отправка enabled, отключающий banner отсутствует, один POST/api/auth/forgot202, pageerrors0; пароль существующего аккаунта роботом не менялся. Read-only DB наблюдение: новый reset token, delivery_state accepted. Независимый reviewer дополнительно подтвердил настоящий /forgot и /health, pageerrors0, source8859f76; писем сам не отправлял.

Полный переход по письму → новый пароль → вход проверяет владелец; вопрос отправлен. На момент записи результата этого этапа ещё нет. Token links, получатель, key и пароли в Git не помещаются.

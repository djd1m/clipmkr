# Проверка оформления лицензии

База `2a2b0789e25cbcbde3e3fde34f2433ef36e255bc`. Снимок реализации для независимого чтения `72d4ee112e410f72ba154593ae8635e1183cd0ad` (`git write-tree` на staged diff).

## Проверки автора

| Требование | Проверка и результат |
| --- | --- |
| FR-1 | Сравнение `git show <tree>:LICENSE \| cmp - <upstream>` завершилось с кодом 0. Официальный текст Elastic из ревизии `fb195b873f62449145c0610d567e6786d40b8960`, SHA-256 файла `48255018b41fc0e965b1115af7e6779bc218bb8a6747d561da800d5022622aa2`. Имя правообладателя и применение к перечисленному коду сверены с заявлением владельца. Ограничение размещённого сервиса и разрешение распространения самостоятельных копий сверены с лицензионным текстом. [Официальный файл Elastic](https://github.com/elastic/elasticsearch/blob/fb195b873f62449145c0610d567e6786d40b8960/licenses/ELASTIC-LICENSE-2.0.txt) |
| FR-2 | `git show` и `git log` по JAN, N3, N4, N5, N6; 10 из 10 исторических хешей JAN совпали, сверка N5 и платёжного тракта зафиксирована в [карте происхождения](../../docs/research/licensing/source-provenance.md). Отдельные условия компонентов и материалов указаны в README, новые локальные ссылки разрешаются. |
| FR-3 | MIT сверено `cmp` с закреплённым upstream и независимой копией из зеркала проекта, exit 0. ONNX соответствует LFS SHA-256 и размеру 232 589 байт. Статическая проверка подтверждает `COPY . .`, допуск обоих файлов в `.dockerignore` и `COPY --from=build /app/apps/worker/assets ./apps/worker/assets` в стадии worker. Штатные worker-цели compose используют эту стадию. |
| C-1 | `git diff --exit-code HEAD <tree> -- Dockerfile .dockerignore docker-compose.yml apps/worker/assets/models/face_detection_yunet.onnx` exit 0, staged paths просмотрены. `git diff --cached --check` exit 0, повторён после уточнений README. Сборка образа и приложение не запускались. |

`npm run --silent openspec -- validate license-adoption --strict` exit 0. K1 для программных идентификаторов неприменим, отдельно сверены новые пути. K2 запущен до Step 7 через `node /home/clipmkr/.agents/skills/feature-adr/scripts/check-plan-completeness.mjs features/license-adoption --tier=S --require-requirements`, exit 0, четыре requirement ID, ноль ошибок и предупреждений. C1, C2, C4 пропущены по штатным правилам S и отсутствию acid corpus. Использован закреплённый dz 0.8.58.

## Сверка реализации со спецификацией

README и LICENSE реализуют пользовательскую часть, штатный маршрут копирования реализует доставку MIT рядом с моделью. Условия передачи уже созданных образов проверяются по реальному digest. Юридические доказательства за пределами заявления владельца и выбранная юрисдикция здесь не оценивались.

## Независимое ревью

Отдельная сессия `/root/license_adoption_qe` получила только нормативные входы и снимок. Запрошенная модель — `gpt-6-astra xhigh`. Проверяющий не нашёл замечаний в снимке `72d4ee112e410f72ba154593ae8635e1183cd0ad` и воспроизвёл побайтовые сравнения лицензий, идентичность модели и маршрут копирования. Фактический backend model ID независимо не аттестован. [Отчёт независимого ревью](08_independent_review.md).

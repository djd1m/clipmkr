# Повторная проверка зависимостей перед кодом

11.11.2026. Исполнитель: отдельный планировщик `/root/original_video_final_plan`, запрошенная модель `gpt-6-astra xhigh`. Read-only проверка после интеграции root; app tests, runtime и код здесь не исполнялись.

- Историческая база дизайна: `e66d9addfad16e1b6dcd7bd07bf06c5abb1343f1`.
- Принятый main: `2b61adeea68f9fa7d316969db7738e5754dec8f8`.
- Фактический merged HEAD: `3603be73ba4fc32d43f611885a4ac89faeaaa80d`.
- Native QCSD R2: revision `d7b8009a27a9111aa6478d38483595af4e8f865212973671d46c169936a284e0`, nonce `813cb2be-355a-43a6-8d5c-7199290984c5`; evaluate `closed`, unresolved/reasons `[]`. Raw SHA256 `e158e80a61d0a356c5f88be80c2e8eb8364c972ab3fe0f0ee25057d6f0d24cd1`; raw хранится приватно у root, не копируется в Git.

## Что измерено

`git rev-parse HEAD` вернул merged HEAD выше. `git diff --name-only e66d9addfad16e1b6dcd7bd07bf06c5abb1343f1 2b61adeea68f9fa7d316969db7738e5754dec8f8 -- <16 буквальных путей из завершающего блока плана>` вернул пустой список, exit 0. Все 16 путей сохранены; отсутствующие будущие файлы остаются отсутствующими, это не доказательство их реализации.

`git diff --name-only 2b61adeea68f9fa7d316969db7738e5754dec8f8 3603be73ba4fc32d43f611885a4ac89faeaaa80d -- apps packages vitest.config.ts vitest.browser.config.ts package.json package-lock.json` вернул пустой список, exit 0. Принятые параллельные изменения main включены; Original-код не добавлен. Git-интеграцию выполнял root, этот планировщик её не повторял.

Python `hashlib.sha256(Path(path).read_bytes())` сверил каждый из 21 `readOnlyDependencies` исторического reviewed R2 snapshot с текущим файлом. Все совпали, terminal exit 0:

| Зависимость | SHA256 reviewed R2 и текущих bytes | Исход |
|---|---|---|
| `apps/web/src/server/clip-file.ts` | `8ebe2f60c96bc6b29d41df26370c0a97315fa2a8cb56824755480cf56d34a23d` | совпал |
| `apps/web/src/server/guest-file.ts` | `19bd437dfd3b53dca0611a95cca8eac23639c2fe9a872de8289b61dacae07590` | совпал |
| `apps/web/src/server/screen-runtime.ts` | `af1203f377673acf8da11044834d2efcef870acca8a4a5d423a237cc34a8ffe3` | совпал |
| `apps/web/src/server/media-type.ts` | `898fa78965975961dec0e208966a4dbc5f795f4e7406b07b344c2097cd59d15b` | совпал |
| `apps/web/src/server/video.ts` | `3a533a0339722f8d90e985108877a24621e0b1d070ae0648602457135378862c` | совпал |
| `apps/web/src/server/upload-runtime.ts` | `60f4132a35b2301cdcc87838e4aad1c1d683e27cb35bdedec865a3cb920ccdd6` | совпал |
| `apps/web/src/server/retention.ts` | `804427d35348f9ce07300086e3daade1c814d650cbf74a88c97b6641ef2ee77d` | совпал |
| `apps/web/src/app/videos/[videoId]/VideoDetail.tsx` | `c878b80619a14579f23ef8e9368dca3869ee1e9442d018d2c86d4233ca1a29da` | совпал |
| `apps/web/src/app/clips/ClipCard.tsx` | `7a450be39c1b8e393db424bb20a3e97ac56799b339d5e08212fab393162ce9b4` | совпал |
| `packages/s3/src/client.ts` | `26cacf63dc70d341668ab849ad2b45461c259ce48ccf1045ada5685482bfc754` | совпал |
| `packages/s3/src/operations.ts` | `ecf5a0a284d6f3b833cf31adb48d15ee344dca0db1823a1eb69ba686bdb5e0fe` | совпал |
| `packages/s3/src/presign.ts` | `c3a0adff02383a264556bd4e59998cbb756ed4cccef35482c264f37343b3df3e` | совпал |
| `packages/db/migrations/001_init.sql` | `96e64cf44ca9e1842b524f4047344406e647b150e3eb4f628d83b8bdae79a107` | совпал |
| `tests/fixtures/environment.ts` | `30187822659a1caa60a00f72b7f649a1b4e44bd130fad163cba1c084d8bba77b` | совпал |
| `tests/browser/ux-simplification.test.ts` | `5d787d03d7de502580bde10f7a87623706e9d6c0b7f7b8447420fcde135e8c30` | совпал |
| `scripts/test-retention-mutations.mjs` | `3fe8eda659c526c975481b5797c8d7916f9a01f1f4aac0dde168738462a750c8` | совпал |
| `vitest.config.ts` | `0f477caafa30da594689d6e8e3864697945a0fd9a495ed880f808b6dbb014019` | совпал |
| `vitest.browser.config.ts` | `7094074a8c9e642184fd7f1fa4335ebd46d96b8eb6a1fad1d210329f23128b2c` | совпал |
| `packages/shared/package.json` | `35e7ce2656f89f998cfd2079549f5f20a53782a2786a2f5fa86f9be8e9b3cc64` | совпал |
| `packages/shared/src/index.ts` | `e02a74b6c350ec2989cd9538d24399ed39df84553e99bfdd407e53d00ed4f8d6` | совпал |
| `packages/shared/tsconfig.json` | `f0b29eb4cf66109ddaa38cf326692a9db2a6109e68a2709ec214f9a3fb700a2c` | совпал |

Сохранились ownership/auth seam, signer, bounded-read seam, legacy timeout, `VideoDetail`/`ClipCard`, upload/retention, shared exports и source/test selectors. Existing mutation anchors остаются в исходных files; новые SHA не приписываются прежним receipts. Четыре core 00/01/ADR/05 и OpenSpec дополнительно сверяются по `requirements-pin.json`; их байты не редактируются финализацией Step 6.

## Граница доказательства

Это отсутствие source drift на названной базе, не функциональный regression PASS. Accepted main не расширяет разрешение на дополнительные UI-состояния. Перед Step7 root ещё выполняет K1/K2, supported checkpoints, current target/context admission и задаёт точную разрешённую часть плана. Если source base или контракт меняется до code entry, результат этого recheck не переносится автоматически.

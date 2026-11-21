# Sharing ZYROX ARENA with players

The app itself is an Expo Android app. It does not need a public tournament website.

- **Direct sharing:** build the preview APK with EAS and upload the APK to a public HTTPS file host. Share that direct download link in Facebook groups, Messenger, WhatsApp, etc. Android may show an install-from-unknown-source warning for sideloaded APKs.
- **Google Play:** build an Android App Bundle with the production EAS profile and publish through a Google Play developer account. This is the best option for discoverability, updates and user trust.
- **Chrome / Google Search:** Google does not automatically index a raw APK simply because it exists. To appear when people search `ZYROX ARENA APK`, publish a small public download page containing the app name, description, screenshots, version, and download link, then submit it for indexing—or use the Play Store listing. This download listing is separate from the tournament app and backend; no web-based tournament interface is required.

Never share an APK built against a localhost or private test API URL. The production API must be public HTTPS and configured in `expo-app/app.json` before the build.

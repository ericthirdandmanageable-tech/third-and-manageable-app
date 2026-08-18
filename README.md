# Third & Manageable replacement Expo client

This isolated worktree contains the Liquid Glass replacement client while the
canonical mobile repository and the Next.js redesign remain separate.

## Staging architecture

- Appwrite owns identity and native provider sessions.
- Every product request creates a fresh Appwrite JWT and calls
  `EXPO_PUBLIC_PRODUCT_API_URL`.
- The public staging relay forwards only allowlisted athlete routes to the
  protected Next.js Preview; the Vercel bypass secret never enters the app.
- Firestore and Appwrite Storage are server-owned for new clients. Firebase
  Auth custom tokens remain only for compatibility with older clients.
- Gemini runs behind `/clipboard/chat`; no AI provider key is bundled.

Run `npm run check:staging-env`, `npm run typecheck`, `npm test`, and
`npm run lint` before creating an EAS Preview build. Run
`npm run smoke:staging-auth` after either the protected Preview or relay changes.

## Current iOS Preview

EAS internal Preview build
[`cab31413`](https://expo.dev/accounts/eric.thirdandmanageable/projects/third-and-manageable-app/builds/cab31413-a4d7-484a-bbd9-401111434756)
finished successfully on 2026-08-14 for version `1.0.1` (build `11`). It uses
only the isolated staging environment and is provisioned for the registered
iPhone. Use the build page's **Install** action before 2026-08-28. Because it
uses `com.thirdandmanageable.app`, installing it may replace another installed
Third & Manageable build on that device. It was not submitted to TestFlight or
App Store Connect. Packaged-JavaScript inspection confirmed the staging
Appwrite/Firebase IDs and full relay path, with no production Appwrite ID or
Gemini environment key present.

This is an [Expo](https://expo.dev) project using Expo Router.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
# third-and-manageable-app

import type { Config } from "@react-router/dev/config";

export default {
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  // optionally set the app directory, defaults to "./app"
  appDirectory: "app",
  // optionally set the build directory, defaults to "./build"
  buildDirectory: "build",
} satisfies Config;

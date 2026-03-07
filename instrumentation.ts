export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Dynamic import ensures Turbopack does NOT compile this for Edge Runtime
  const { setupNodeInstrumentation } = await import("./lib/node-instrumentation");
  setupNodeInstrumentation();
}

// Imported first by index.ts so every module sees the .env values.
// Variables already set in the real environment take precedence.
try {
    process.loadEnvFile()
} catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
}

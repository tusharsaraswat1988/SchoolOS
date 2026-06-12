/**
 * Free SchoolOS dev ports before starting pnpm dev.
 * Windows: uses Get-NetTCPConnection via PowerShell.
 */
import { execSync } from "node:child_process";

const ports = [5000, 5173];

for (const port of ports) {
  try {
    const out = execSync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"`,
      { encoding: "utf8" },
    ).trim();

    if (!out) continue;

    for (const pid of out.split(/\s+/).filter(Boolean)) {
      try {
        execSync(`powershell -NoProfile -Command "Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue"`);
        console.log(`Stopped PID ${pid} on port ${port}`);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* no listeners */
  }
}

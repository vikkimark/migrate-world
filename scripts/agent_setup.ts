import { execa } from "execa";
import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import YAML from "yaml";

// --------------------------- Types ---------------------------
interface Config {
  projectName: string;
  packageManager?: "pnpm" | "npm" | "yarn";
  repoInit?: boolean;
  nodeVersion?: string;
  createNextApp?: boolean;
  nextAppPath?: string;
  installTailwind?: boolean;
  addShadcn?: boolean;
  addFramerMotion?: boolean;
  addLucide?: boolean;
  addRecharts?: boolean;
  supabase?: {
    useCLI?: boolean;
    url?: string;
    anonKey?: string;
    serviceRoleKey?: string;
    projectRef?: string;
  };
  observability?: {
    sentryDSN?: string;
    posthogKey?: string;
  };
  ci?: {
    githubActions?: boolean;
  };
  datasets?: {
    universities?: boolean;
    visas?: boolean;
    jobs?: boolean;
    housing?: boolean;
    flights?: boolean;
  };
}

// --------------------------- Helpers ---------------------------
const run = async (
  cmd: string,
  args: string[],
  opts: { cwd?: string; dry?: boolean } = {}
) => {
  const { cwd, dry } = opts;
  const parts = cmd.trim().split(/\s+/);
  const bin = parts[0];
  const baseArgs = parts.slice(1);
  const fullArgs = [...baseArgs, ...args];

  console.log(chalk.gray("$"), chalk.cyan([bin, ...fullArgs].join(" ")));
  if (dry) return { stdout: "(dry run)", stderr: "" };
  return execa(bin, fullArgs, { stdio: "inherit", cwd });
};

const ensureDir = async (dir: string, dry: boolean) => {
  if (await fs.pathExists(dir)) return;
  console.log(chalk.gray("mkdir -p"), dir);
  if (!dry) await fs.mkdirp(dir);
};

const writeFile = async (file: string, contents: string, dry: boolean) => {
  console.log(chalk.gray("write"), file);
  if (!dry) await fs.outputFile(file, contents);
};

const fileExists = (p: string) => fs.pathExists(p);

const parseArgs = () => {
  const argv = process.argv.slice(2);
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, v] = a.replace(/^--/, "").split("=");
      if (typeof v === "undefined") args[k] = true;
      else args[k] = v;
    }
  }
  return args as { config?: string; dry?: boolean };
};

const detectPM = (): "pnpm" | "npm" | "yarn" => {
  if (fs.existsSync(path.join(process.cwd(), "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(process.cwd(), "yarn.lock"))) return "yarn";
  return "npm";
};

const pmCmd = (pm: string) => ({
  add: pm === "pnpm" ? "pnpm add" : pm === "yarn" ? "yarn add" : "npm i",
  addD: pm === "pnpm" ? "pnpm add -D" : pm === "yarn" ? "yarn add -D" : "npm i -D",
  exec: pm === "pnpm" ? "pnpm dlx" : pm === "yarn" ? "yarn dlx" : "npx",
  run: pm === "pnpm" ? "pnpm run" : pm === "yarn" ? "yarn" : "npm run",
});

const banner = (msg: string) => console.log("\n" + chalk.bgBlue.white.bold(` ${msg} `) + "\n");

// --------------------------- Main ---------------------------
(async () => {
  banner("Migrate World – Setup Agent (src/app target)");
  const { config: configPath, dry } = parseArgs();

  let config: Config | null = null;
  if (configPath && (await fileExists(configPath))) {
    const raw = await fs.readFile(configPath, "utf8");
    config = YAML.parse(raw) as Config;
  }

  const pm = config?.packageManager || detectPM();
  const pmc = pmCmd(pm);

  // Step: Next.js app scaffold and UI libraries
  if (config?.createNextApp) {
    banner("Next.js app scaffold");
    const appPath = config.nextAppPath || "src/app";

    if (!(await fileExists(appPath))) {
      console.log(chalk.yellow(`Next.js app not found at ${appPath}, scaffolding...`));
      await ensureDir(path.dirname(appPath), !!dry);
      await run(pmc.exec.split(" ")[0], [
        ...pmc.exec.split(" ").slice(1),
        "create-next-app@latest",
        path.dirname(appPath),
        "--ts",
        "--eslint",
        "--src-dir",
        "--app",
        "--tailwind",
        "--no-import-alias"
      ], { dry: !!dry });
    }

    // Install UI libraries
    banner("Install UI libraries");
    const uiDeps = ["axios"];
    if (config.addFramerMotion) uiDeps.push("framer-motion");
    if (config.addLucide) uiDeps.push("lucide-react");
    if (config.addRecharts) uiDeps.push("recharts");
    if (uiDeps.length > 0) {
      await run(pmc.add, ["-w", path.dirname(appPath), ...uiDeps], { dry: !!dry }).catch(async () => {
        await run("npm", ["i", ...uiDeps], { cwd: path.dirname(appPath), dry: !!dry });
      });
    }
  }

  banner("All set ✅");
})();

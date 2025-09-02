// scripts/bot.mjs
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execa } from "execa";
import { load as loadYaml } from "js-yaml";
import dotenv from "dotenv";
import ora from "ora";

const CWD = process.cwd();
const spinner = ora();

function die(msg, code = 1) {
  spinner.stop();
  console.error(msg);
  process.exit(code);
}

function loadEnv() {
  // Load .env.local if present
  const envFile = path.join(CWD, ".env.local");
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
    console.log(`🧩 Loaded env from .env.local`);
  } else {
    console.log(`ℹ️  No .env.local found; using process env only`);
  }
}

function ensureProjectRoot() {
  const pkg = path.join(CWD, "package.json");
  const app = path.join(CWD, "src", "app");
  if (!fs.existsSync(pkg) || !fs.existsSync(app)) {
    die("❌ Run this from your project root (where package.json and src/app exist).");
  }
}

function readPlan(planPath) {
  const abs = path.isAbsolute(planPath) ? planPath : path.join(CWD, planPath);
  if (!fs.existsSync(abs)) die(`❌ Plan file not found: ${abs}`);
  const txt = fs.readFileSync(abs, "utf8");
  try {
    return loadYaml(txt);
  } catch (e) {
    die(`❌ Failed to parse YAML: ${e.message}`);
  }
}

function bool(v, def = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    if (["y","yes","true","1"].includes(s)) return true;
    if (["n","no","false","0"].includes(s)) return false;
  }
  return def;
}

async function runCmd(cmd, env = {}) {
  spinner.start(`$ ${cmd}`);
  try {
    await execa("bash", ["-lc", cmd], {
      stdio: "inherit",
      env: { ...process.env, ...env },
    });
    spinner.succeed(`$ ${cmd}`);
  } catch (e) {
    spinner.fail(`Command failed: ${cmd}`);
    throw e;
  }
}

async function stepCmd(step) {
  const cmd = step.run;
  if (!cmd || typeof cmd !== "string") die("❌ cmd step requires 'run: <shell command>'");
  await runCmd(cmd, step.env || {});
}

async function stepIngest(step) {
  const title = step.title;
  const url = step.url;
  if (!title || !url) die("❌ ingest step needs both 'title' and 'url'");

  // Guardrails
  const OPENAI = process.env.OPENAI_API_KEY;
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SB_ROLE = process.env.SUPABASE_SERVICE_ROLE;
  if (!OPENAI) die("❌ Missing OPENAI_API_KEY in env");
  if (!SB_URL) die("❌ Missing NEXT_PUBLIC_SUPABASE_URL in env");
  if (!SB_ROLE) die("❌ Missing SUPABASE_SERVICE_ROLE in env");

  // Ensure tsx is available
  spinner.start("Ensuring tsx is available");
  try {
    await execa("npx", ["--yes", "tsx", "--version"], { stdio: "ignore" });
    spinner.succeed("tsx OK");
  } catch {
    spinner.stop();
    await runCmd("npm i -D tsx");
  }

  // Run ingest with larger heap to prevent OOM
  spinner.start(`Ingesting: ${title}`);
  try {
    await execa(
      "npx",
      ["tsx", "scripts/ingest_stream.ts", title, url],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          NODE_OPTIONS: "--max-old-space-size=2048",
        },
      }
    );
    spinner.succeed(`Ingested: ${title}`);
  } catch (e) {
    spinner.fail(`Ingest failed: ${title}`);
    throw e;
  }
}

async function stepDeploy(step) {
  const prod = bool(step.prod, true);

  // Ensure vercel CLI
  spinner.start("Ensuring Vercel CLI is available");
  try {
    await execa("npx", ["--yes", "vercel", "--version"], { stdio: "ignore" });
    spinner.succeed("Vercel CLI OK");
  } catch {
    spinner.stop();
    await runCmd("npm i -D vercel");
  }

  const args = ["--confirm"];
  if (prod) args.unshift("--prod");

  spinner.start(`Deploying with vercel ${prod ? "(prod)" : ""}`);
  try {
    await execa("npx", ["vercel", ...args], { stdio: "inherit" });
    spinner.succeed("Deployed");
  } catch (e) {
    spinner.fail("Deploy failed");
    throw e;
  }
}

async function stepInfo(step) {
  const keys = step.keys || [];
  console.log("ℹ️  ENV preview:");
  for (const k of keys) {
    const v = process.env[k];
    console.log(`  ${k}=${v ? (k.toLowerCase().includes("key") ? v.slice(0,6) + "…(redacted)" : v) : "(unset)"}`);
  }
}

async function stepSleep(step) {
  const ms = Number(step.ms || 1000);
  spinner.start(`Sleeping ${ms}ms`);
  await new Promise(r => setTimeout(r, ms));
  spinner.succeed(`Slept ${ms}ms`);
}

async function runPlan(plan, opts) {
  const steps = Array.isArray(plan?.steps) ? plan.steps : [];
  if (!steps.length) die("❌ Plan has no steps");

  console.log(`\n🧠  Running plan: ${plan.name || "(unnamed)"}\n`);

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const kind = s.type;
    console.log(`\n—— Step ${i + 1}/${steps.length} — ${kind} ${s.title ? `(${s.title})` : ""}`);

    try {
      if (opts.dry) {
        console.log("   (dry-run) would execute:", JSON.stringify(s, null, 2));
        continue;
      }

      if (kind === "cmd") await stepCmd(s);
      else if (kind === "ingest") await stepIngest(s);
      else if (kind === "deploy") await stepDeploy(s);
      else if (kind === "info") await stepInfo(s);
      else if (kind === "sleep") await stepSleep(s);
      else die(`❌ Unknown step type: ${kind}`);

    } catch (e) {
      if (s.continueOnError) {
        console.warn("⚠️  Step failed but continueOnError=true — continuing…");
        continue;
      }
      die("❌ Stopping due to step error.");
    }
  }

  console.log("\n✅ Plan complete\n");
}

async function main() {
  const [,, planPath, ...flags] = process.argv;
  if (!planPath) {
    console.log(`Usage: node scripts/bot.mjs <plan.yml> [--dry]`);
    process.exit(0);
  }

  const opts = {
    dry: flags.includes("--dry"),
  };

  ensureProjectRoot();
  loadEnv();
  const plan = readPlan(planPath);
  await runPlan(plan, opts);
}

main().catch((e) => {
  spinner.stop();
  console.error(e);
  process.exit(1);
});

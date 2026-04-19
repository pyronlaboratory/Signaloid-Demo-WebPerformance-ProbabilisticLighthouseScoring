import { readFileSync } from "fs";
import { config } from "./config.ts";
import { SignaloidClient } from "./client.ts";
import { extractUxStrings, printUxSummary } from "./extract.ts";
import { log } from "./utils.ts";
import type { DataSource, ParamsFile, PipelineResult } from "./types.ts";

function loadDataSources(): DataSource[] {
  try {
    const raw = readFileSync(config.paramsFile, "utf-8");
    const params: ParamsFile = JSON.parse(raw);
    log(
      "Loaded DataSources from params.json:",
      JSON.stringify(params.DataSources),
    );
    return params.DataSources;
  } catch (err) {
    throw new Error(
      `Could not read params.json at ${config.paramsFile}: ${err}`,
    );
  }
}

function printBuildLog(log: string): void {
  if (!log.trim()) return;
  console.log("\n── Build log ──────────────────────────────────────");
  console.log(log);
  console.log("────────────────────────────────────────────────────\n");
}

function printStdout(stdout: string): void {
  console.log("\n── Task stdout ─────────────────────────────────────");
  console.log(stdout);
  console.log("────────────────────────────────────────────────────\n");
}

function printSummary(result: PipelineResult): void {
  console.log("\n── IDs for reference ───────────────────────────────");
  console.log("  Repository ID :", result.repositoryID);
  console.log("  Build ID      :", result.buildID);
  console.log("  Task ID       :", result.taskID);
  console.log("────────────────────────────────────────────────────");
}

export async function run(): Promise<PipelineResult> {
  const dataSources = loadDataSources();
  const client = new SignaloidClient(config.apiKey, config.baseURL);

  // 1. Connect repository
  const repositoryID = await client.connectRepository({
    RemoteURL: config.repoURL,
    Branch: config.repoBranch,
    BuildDirectory: config.buildDirectory,
    Arguments: "",
    Core: config.coreID,
  });

  // 2. Build
  const buildID = await client.createRepositoryBuild(repositoryID, {
    Core: config.coreID,
  });

  const buildStatus = await client.waitForBuild(buildID);
  printBuildLog(await client.getBuildLog(buildID));

  if (buildStatus !== "Completed") {
    throw new Error(`Build ended with non-successful status: ${buildStatus}`);
  }

  // 3. Run task
  const taskID = await client.createTask(buildID, dataSources);
  const taskStatus = await client.waitForTask(taskID);

  if (taskStatus !== "Completed") {
    throw new Error(`Task ended with non-successful status: ${taskStatus}`);
  }

  // 4. Retrieve and display output
  const stdout = await client.getTaskStdout(taskID);
  printStdout(stdout);

  const uxMatches = extractUxStrings(stdout);
  printUxSummary(uxMatches);

  const result: PipelineResult = {
    repositoryID,
    buildID,
    taskID,
    stdout,
    uxMatches,
  };
  printSummary(result);

  return result;
}

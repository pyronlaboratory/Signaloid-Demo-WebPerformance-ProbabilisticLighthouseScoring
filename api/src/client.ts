import axios, { type AxiosInstance } from "axios";
import type {
  DataSource,
  RepositoryConfig,
  RepositoryBuildRequest,
} from "./types.ts";
import { log, sleep, annotate } from "./utils.ts";
import { config } from "./config.ts";

const TERMINAL_STATES = new Set(["Completed", "Cancelled", "Stopped"]);

export class SignaloidClient {
  private readonly http: AxiosInstance;

  constructor(apiKey: string, baseURL: string) {
    this.http = axios.create({
      baseURL,
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Resolves the latest commit SHA for a given GitHub repo and branch.
   * Uses the public GitHub API — no token required for public repositories.
   */
  private async resolveLatestCommit(
    repoURL: string,
    branch: string,
  ): Promise<string> {
    const match = repoURL.match(/github\.com\/(.+?)(?:\.git)?$/);
    if (!match) throw new Error(`Cannot parse GitHub repo URL: ${repoURL}`);

    const apiURL = `https://api.github.com/repos/${match[1]}/commits/${branch}`;
    log("Resolving latest commit for branch:", branch);

    try {
      const res = await axios.get<{ sha: string }>(apiURL, {
        headers: { Accept: "application/vnd.github+json" },
      });
      const sha = res.data.sha;
      log("Resolved commit SHA:", sha);
      return sha;
    } catch (err) {
      throw annotate(err, "resolveLatestCommit");
    }
  }

  /**
   * Connects a GitHub repository. Resolves the latest commit SHA automatically.
   * If already connected the existing ID is returned transparently via 409 handling.
   */
  async connectRepository(repoConfig: RepositoryConfig): Promise<string> {
    log("Connecting repository:", repoConfig.RemoteURL);

    const commit = await this.resolveLatestCommit(
      repoConfig.RemoteURL,
      repoConfig.Branch,
    );

    const body = { Object: "Repository", ...repoConfig, Commit: commit };
    log("POST /repositories body:", JSON.stringify(body));

    try {
      const res = await this.http.post<{ RepositoryID: string }>(
        "/repositories",
        JSON.stringify(body),
        { headers: { "Content-Type": "application/json" } },
      );
      const id = res.data.RepositoryID;
      log("Repository connected. ID:", id);
      return id;
    } catch (err: any) {
      if (err.response?.status === 409) {
        const match: RegExpMatchArray | null =
          err.response.data?.message?.match(/Existing RepositoryID: (rep_\S+)/);
        if (match) {
          log("Repository already connected. Reusing ID:", match[1]);
          return match[1]!;
        }
      }
      throw annotate(err, "connectRepository");
    }
  }

  async createRepositoryBuild(
    repositoryID: string,
    request: RepositoryBuildRequest,
  ): Promise<string> {
    log("Creating build for repository:", repositoryID);
    try {
      const res = await this.http.post<{ BuildID: string }>(
        `/repositories/${repositoryID}/builds`,
        request,
      );
      const id = res.data.BuildID;
      log("Build created. ID:", id);
      return id;
    } catch (err) {
      throw annotate(err, "createRepositoryBuild");
    }
  }

  async waitForBuild(buildID: string): Promise<string> {
    log("Waiting for build", buildID, "…");
    return this.poll(
      () =>
        this.http
          .get<{ Status: string }>(`/builds/${buildID}`)
          .then((r) => r.data.Status),
      "Build",
    );
  }

  async getBuildLog(buildID: string): Promise<string> {
    try {
      const res = await this.http.get<{ Build?: string }>(
        `/builds/${buildID}/outputs`,
      );
      if (!res.data.Build) return "";
      const stream = await axios.get<string>(res.data.Build);
      return stream.data ?? "";
    } catch (err) {
      throw annotate(err, "getBuildLog");
    }
  }

  async createTask(
    buildID: string,
    dataSources: DataSource[],
  ): Promise<string> {
    log("Creating task for build:", buildID);
    try {
      const res = await this.http.post<{ TaskID: string }>(
        `/builds/${buildID}/tasks`,
        { DataSources: dataSources },
      );
      const id = res.data.TaskID;
      log("Task created. ID:", id);
      return id;
    } catch (err) {
      throw annotate(err, "createTask");
    }
  }

  async waitForTask(taskID: string): Promise<string> {
    log("Waiting for task", taskID, "…");
    return this.poll(
      () =>
        this.http
          .get<{ Status: string }>(`/tasks/${taskID}`)
          .then((r) => r.data.Status),
      "Task",
    );
  }

  async getTaskStdout(taskID: string): Promise<string> {
    try {
      const res = await this.http.get<{ Stdout?: string }>(
        `/tasks/${taskID}/outputs`,
      );
      if (!res.data.Stdout) return "";
      const stream = await axios.get<string>(res.data.Stdout);
      return stream.data ?? "";
    } catch (err) {
      throw annotate(err, "getTaskStdout");
    }
  }

  private async poll(
    fetchStatus: () => Promise<string>,
    label: string,
  ): Promise<string> {
    let status = "";
    let attempt = 0;

    while (!TERMINAL_STATES.has(status)) {
      status = await fetchStatus().catch((err) => {
        throw annotate(err, `poll(${label})`);
      });

      log(`${label} status: ${status}`);

      if (!TERMINAL_STATES.has(status)) {
        const delay = Math.min(
          Math.pow(2, attempt) * config.poll.initialDelayMs,
          config.poll.maxDelayMs,
        );
        log(`Retrying in ${delay}ms…`);
        await sleep(delay);
        attempt++;
      }
    }

    return status;
  }
}

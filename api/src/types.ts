export interface DataSource {
  Location: string;
  ResourceID: string;
  ResourceType: "SignaloidCloudStorage" | "Gateway" | "Bucket" | "Drive";
}

export interface TraceVariable {
  File: string;
  LineNumber: number;
  Expression: string;
}

export interface ParamsFile {
  DataSources: DataSource[];
}

export interface RepositoryConfig {
  Object?: "Repository";
  RemoteURL: string;
  Branch: string;
  BuildDirectory: string;
  Arguments: string;
  Commit?: string;
  Core?: string;
  DataSources?: DataSource[];
  TraceVariables?: TraceVariable[];
}

export interface RepositoryBuildRequest {
  Core?: string;
  Arguments?: string;
  DataSources?: DataSource[];
}

export interface UxMatch {
  value: string;
  uxString: string;
}

export interface PipelineResult {
  repositoryID: string;
  buildID: string;
  taskID: string;
  stdout: string;
  uxMatches: UxMatch[];
}

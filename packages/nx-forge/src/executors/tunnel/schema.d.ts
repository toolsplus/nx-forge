export interface TunnelExecutorOptions {
  outputPath: string;
  environment?: string;
  debug: boolean;
  debugFunctionHandlers?: string;
  debugStartingPort?: number;
  verbose: boolean;
  preTunnelTimeout: number;
}

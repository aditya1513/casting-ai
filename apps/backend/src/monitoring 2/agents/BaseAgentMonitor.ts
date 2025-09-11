import { EventEmitter } from 'events';
import { AgentStatus, AgentMetrics, AgentTask } from '../types';

export abstract class BaseAgentMonitor extends EventEmitter {
  protected isStarted: boolean = false;
  protected lastCheck: Date = new Date();
  
  constructor() {
    super();
  }

  abstract checkStatus(): Promise<Partial<AgentStatus>>;
  abstract getMetrics(): Promise<Partial<AgentMetrics>>;
  abstract assignTask(task: AgentTask): Promise<void>;
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;

  // Override emit as public to match EventEmitter interface
  public emit(event: string | symbol, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }

  public getLastCheckTime(): Date {
    return this.lastCheck;
  }

  public isMonitorStarted(): boolean {
    return this.isStarted;
  }
}
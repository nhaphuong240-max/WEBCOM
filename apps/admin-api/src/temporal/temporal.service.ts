import { Injectable, Logger } from '@nestjs/common';
import { createId } from '@ptt/shared-kernel';
import { PUBLISH_STEPS, WORKFLOW_NAMES } from './workflow-contracts';

function featureTemporal() {
  const v = process.env.FEATURE_TEMPORAL;
  if (v === undefined || v === '') return true;
  return v === '1' || v.toLowerCase() === 'true';
}

export type WorkflowRunRecord = {
  workflow_id: string;
  run_id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'blocked' | 'compensated';
  engine: 'temporal_stub' | 'temporal';
  steps: Array<{ step: string; status: string; at: string; detail?: string }>;
  started_at: string;
  finished_at?: string;
  attempts: number;
};

/**
 * Temporal orchestration facade.
 * Default: durable in-process stub (retry + compensate + run history).
 * Live: when TEMPORAL_ADDRESS is set, records engine=temporal and would start
 * remote workflows via SDK (optional @temporalio/client — not required for A4 stub).
 */
@Injectable()
export class TemporalService {
  private readonly log = new Logger(TemporalService.name);
  private readonly runs = new Map<string, WorkflowRunRecord>();

  enabled() {
    return featureTemporal();
  }

  engineName(): 'temporal_stub' | 'temporal' | 'in_process' {
    if (!this.enabled()) return 'in_process';
    return process.env.TEMPORAL_ADDRESS?.trim() ? 'temporal' : 'temporal_stub';
  }

  status() {
    return {
      enabled: this.enabled(),
      engine: this.engineName(),
      address: process.env.TEMPORAL_ADDRESS ? '[set]' : null,
      namespace: process.env.TEMPORAL_NAMESPACE || 'webcom',
      task_queue: process.env.TEMPORAL_TASK_QUEUE || 'webcom-publish',
      workflows: Object.values(WORKFLOW_NAMES),
      publish_steps: [...PUBLISH_STEPS],
      recent_runs: [...this.runs.values()].slice(-10).reverse(),
    };
  }

  getRun(workflowId: string) {
    return this.runs.get(workflowId) || null;
  }

  beginRun(name: string, workflowId?: string): WorkflowRunRecord {
    const id = workflowId || `${name}-${createId('wf')}`;
    const run: WorkflowRunRecord = {
      workflow_id: id,
      run_id: createId('wfr'),
      name,
      status: 'running',
      engine: this.engineName() === 'temporal' ? 'temporal' : 'temporal_stub',
      steps: [],
      started_at: new Date().toISOString(),
      attempts: 1,
    };
    this.runs.set(id, run);
    if (this.runs.size > 200) {
      const first = this.runs.keys().next().value;
      if (first) this.runs.delete(first);
    }
    return run;
  }

  step(run: WorkflowRunRecord, step: string, status: string, detail?: string) {
    run.steps.push({ step, status, at: new Date().toISOString(), detail });
  }

  finish(run: WorkflowRunRecord, status: WorkflowRunRecord['status']) {
    run.status = status;
    run.finished_at = new Date().toISOString();
  }

  /**
   * Retry helper with exponential backoff (stub durable semantics).
   */
  async withRetry<T>(
    label: string,
    fn: (attempt: number) => Promise<T>,
    opts?: { maxAttempts?: number; baseMs?: number },
  ): Promise<T> {
    const max = opts?.maxAttempts ?? Number(process.env.TEMPORAL_MAX_ATTEMPTS || 3);
    const base = opts?.baseMs ?? 40;
    let last: unknown;
    for (let attempt = 1; attempt <= max; attempt++) {
      try {
        return await fn(attempt);
      } catch (e) {
        last = e;
        this.log.warn(`${label} attempt ${attempt}/${max} failed: ${e}`);
        if (attempt < max) {
          await new Promise((r) => setTimeout(r, base * 2 ** (attempt - 1)));
        }
      }
    }
    throw last;
  }
}

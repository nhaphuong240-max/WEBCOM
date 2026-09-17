import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformService } from '../website/platform.service';
import { TemporalService } from './temporal.service';
import { WORKFLOW_NAMES } from './workflow-contracts';

@Injectable()
export class TemporalWorkflowsService {
  constructor(
    private readonly temporal: TemporalService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PlatformService))
    private readonly platform: PlatformService,
  ) {}

  /** GoLiveValidationWorkflow — checklist gate before publish. */
  async runGoLiveValidation(tenantId: string, storefrontId: string, _actorId?: string) {
    const run = this.temporal.beginRun(
      WORKFLOW_NAMES.goLiveValidation,
      `golive-${storefrontId}-${Date.now()}`,
    );
    this.temporal.step(run, 'ensure_rows', 'ok');
    const checklist = await this.temporal.withRetry('golive.evaluate', async () =>
      this.platform.evaluateChecklist(tenantId, storefrontId),
    );
    this.temporal.step(
      run,
      'evaluate',
      checklist.can_publish ? 'ok' : 'blocked',
      checklist.blocking_fails?.join(',') || undefined,
    );
    this.temporal.finish(run, checklist.can_publish ? 'completed' : 'blocked');
    return {
      ...checklist,
      workflow_id: run.workflow_id,
      workflow_run_id: run.run_id,
      engine: run.engine,
      workflow: WORKFLOW_NAMES.goLiveValidation,
    };
  }

  /**
   * PublishThemeWorkflow
   * validate → backup → publish atomic → revalidate → health window → audit
   * On failure after mutation: compensate via rollback.
   */
  async runPublishTheme(tenantId: string, storefrontId: string, actorId: string) {
    const run = this.temporal.beginRun(
      WORKFLOW_NAMES.publishTheme,
      `publish-${storefrontId}-${Date.now()}`,
    );

    const gate = this.platform.isGoliveGateEnabled();
    this.temporal.step(run, 'validate_checklist', 'running');
    const checklist = await this.platform.evaluateChecklist(tenantId, storefrontId);

    const job = await this.prisma.db.publishJob.create({
      data: {
        id: createId('pub'),
        tenantId,
        storefrontId,
        status: 'running',
        checklistSnapshot: checklist as unknown as Prisma.InputJsonValue,
        workflowId: run.workflow_id,
        workflowRunId: run.run_id,
        engine: run.engine,
        attemptCount: 1,
      },
    });

    if (gate && !checklist.can_publish) {
      this.temporal.step(run, 'validate_checklist', 'blocked', checklist.blocking_fails.join(','));
      await this.prisma.db.publishJob.update({
        where: { id: job.id },
        data: {
          status: 'blocked',
          error: { blocking_fails: checklist.blocking_fails },
          finishedAt: new Date(),
          attemptCount: run.attempts,
        },
      });
      this.temporal.finish(run, 'blocked');
      throw AppError.conflict('Go-live checklist blocked publish', {
        blocking_fails: checklist.blocking_fails,
        job_id: job.id,
        workflow_id: run.workflow_id,
        engine: run.engine,
      });
    }
    this.temporal.step(run, 'validate_checklist', 'ok');

    let published = false;
    try {
      this.temporal.step(run, 'backup_current', 'ok');
      const result = await this.temporal.withRetry(
        'publish.atomic',
        async (attempt) => {
          run.attempts = attempt;
          await this.prisma.db.publishJob.update({
            where: { id: job.id },
            data: { attemptCount: attempt },
          });
          return this.platform.executePublishMutation(tenantId, storefrontId, actorId, job.id);
        },
        { maxAttempts: Number(process.env.TEMPORAL_PUBLISH_ATTEMPTS || 3) },
      );
      published = true;
      this.temporal.step(run, 'publish_atomic', 'ok', result.theme_version_id);
      this.temporal.step(run, 'revalidate', 'ok', 'isr_tags_queued');
      this.temporal.step(run, 'health_window', 'skipped', 'async_canary');
      this.temporal.step(run, 'audit_notify', 'ok');
      this.temporal.finish(run, 'completed');

      // Attach workflow meta on response
      return {
        ...result,
        workflow_id: run.workflow_id,
        workflow_run_id: run.run_id,
        engine: run.engine,
        workflow: WORKFLOW_NAMES.publishTheme,
        attempts: run.attempts,
        steps: run.steps,
      };
    } catch (e) {
      this.temporal.step(run, 'publish_atomic', 'failed', e instanceof Error ? e.message : String(e));
      if (published) {
        try {
          await this.platform.rollbackPublish(tenantId, storefrontId, actorId);
          this.temporal.step(run, 'compensate_rollback', 'ok');
          this.temporal.finish(run, 'compensated');
        } catch (ce) {
          this.temporal.step(
            run,
            'compensate_rollback',
            'failed',
            ce instanceof Error ? ce.message : String(ce),
          );
          this.temporal.finish(run, 'failed');
        }
      } else {
        await this.prisma.db.publishJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            error: { message: e instanceof Error ? e.message : String(e) },
            finishedAt: new Date(),
            attemptCount: run.attempts,
          },
        });
        this.temporal.finish(run, 'failed');
      }
      throw e;
    }
  }

  async getPublishJob(tenantId: string, jobId: string) {
    const job = await this.prisma.db.publishJob.findFirst({ where: { id: jobId, tenantId } });
    if (!job) throw AppError.notFound('Publish job not found');
    const run = job.workflowId ? this.temporal.getRun(job.workflowId) : null;
    return {
      job_id: job.id,
      status: job.status,
      engine: job.engine,
      workflow_id: job.workflowId,
      workflow_run_id: job.workflowRunId,
      attempt_count: job.attemptCount,
      theme_version_id: job.themeVersionId,
      previous_theme_version_id: job.previousThemeVersionId,
      error: job.error,
      created_at: job.createdAt.toISOString(),
      finished_at: job.finishedAt?.toISOString() ?? null,
      run,
    };
  }
}

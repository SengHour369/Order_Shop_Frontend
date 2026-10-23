import { CanDeactivateFn } from '@angular/router';
import type { WorkflowsPage } from './workflows.page';
export const workflowUnsavedGuard:CanDeactivateFn<WorkflowsPage>=(page)=>page.discard();

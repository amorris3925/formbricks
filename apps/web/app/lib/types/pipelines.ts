import { PipelineTriggers } from "@prisma/client";
import { TResponse } from "@formbricks/types/responses";

export interface TPipelineInput {
  event: PipelineTriggers;
  response: TResponse;
  environmentId: string;
  surveyId: string;
}

export interface TPipelineJob extends TPipelineInput {
  jobId: string;
  attempt: number;
  enqueuedAt: number;
  notBefore: number | null;
}

import { beforeEach, describe, expect, test, vi } from "vitest";
import { TResponseWithQuotaFull } from "@formbricks/types/quota";
import { createResponseWithQuotaEvaluation } from "@/app/api/v2/client/[environmentId]/responses/lib/response";
import { checkSurveyValidity } from "@/app/api/v2/client/[environmentId]/responses/lib/utils";
import { sendToPipeline } from "@/app/lib/pipelines";
import { getSurvey } from "@/lib/survey/service";
import { validateResponseData } from "@/modules/api/lib/validation";
import { validateOtherOptionLengthForMultipleChoice } from "@/modules/api/v2/lib/element";
import { POST } from "./route";

const { mockHeaders } = vi.hoisted(() => ({
  mockHeaders: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

vi.mock("@/app/lib/pipelines", () => ({
  sendToPipeline: vi.fn(),
}));

vi.mock("@/app/api/v2/client/[environmentId]/responses/lib/utils", () => ({
  checkSurveyValidity: vi.fn(),
}));

vi.mock("@/app/api/v2/client/[environmentId]/responses/lib/response", () => ({
  createResponseWithQuotaEvaluation: vi.fn(),
}));

vi.mock("@/lib/survey/service", () => ({
  getSurvey: vi.fn(),
}));

vi.mock("@/modules/api/lib/validation", () => ({
  formatValidationErrorsForV1Api: vi.fn(),
  validateResponseData: vi.fn(),
}));

vi.mock("@/modules/api/v2/lib/element", () => ({
  validateOtherOptionLengthForMultipleChoice: vi.fn(),
}));

vi.mock("@formbricks/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("POST /api/v2/client/[environmentId]/responses", () => {
  const environmentId = "cm8cmp9hp000008jf7l570ml2";
  const surveyId = "cm8ckvchx000008lb710n0gdn";

  beforeEach(() => {
    vi.clearAllMocks();

    mockHeaders.mockResolvedValue(new Headers());
    vi.mocked(checkSurveyValidity).mockResolvedValue(null);
    vi.mocked(validateOtherOptionLengthForMultipleChoice).mockReturnValue(null);
    vi.mocked(validateResponseData).mockReturnValue(null);
    vi.mocked(sendToPipeline).mockResolvedValue(undefined);
    vi.mocked(getSurvey).mockResolvedValue({
      id: surveyId,
      environmentId,
      blocks: [],
      questions: [],
      isCaptureIpEnabled: false,
    } as any);
    vi.mocked(createResponseWithQuotaEvaluation).mockResolvedValue({
      id: "cm8cmpnjj000108jfdr9dfqe6",
      surveyId,
      finished: true,
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
      updatedAt: new Date("2026-04-01T00:00:00.000Z"),
      data: {},
      meta: {},
      ttc: {},
      variables: {},
      contactAttributes: {},
      singleUseId: null,
      language: "en",
      displayId: null,
      endingId: null,
      contact: null,
      tags: [],
    } as TResponseWithQuotaFull);
  });

  test("returns success and enqueues pipeline jobs for created and finished responses", async () => {
    let releaseFirstPipelineSend: (() => void) | undefined;
    vi.mocked(sendToPipeline)
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            releaseFirstPipelineSend = resolve;
          })
      )
      .mockResolvedValueOnce(undefined);

    const request = new Request(`http://localhost/api/v2/client/${environmentId}/responses`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0",
      },
      body: JSON.stringify({
        surveyId,
        contactId: null,
        displayId: null,
        finished: true,
        data: {},
        singleUseId: null,
        language: "en",
        variables: {},
      }),
    });

    const responsePromise = POST(request, {
      params: Promise.resolve({
        environmentId,
      }),
    });

    let responseSettled = false;
    void responsePromise.then(() => {
      responseSettled = true;
    });

    await vi.waitFor(() => {
      expect(sendToPipeline).toHaveBeenCalledTimes(1);
    });

    expect(responseSettled).toBe(false);

    releaseFirstPipelineSend?.();

    const response = await responsePromise;

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        id: "cm8cmpnjj000108jfdr9dfqe6",
        quotaFull: false,
      },
    });

    expect(sendToPipeline).toHaveBeenNthCalledWith(1, {
      event: "responseCreated",
      environmentId,
      surveyId,
      response: expect.objectContaining({
        id: "cm8cmpnjj000108jfdr9dfqe6",
        surveyId,
      }),
    });
    expect(sendToPipeline).toHaveBeenNthCalledWith(2, {
      event: "responseFinished",
      environmentId,
      surveyId,
      response: expect.objectContaining({
        id: "cm8cmpnjj000108jfdr9dfqe6",
        surveyId,
      }),
    });
  });
});

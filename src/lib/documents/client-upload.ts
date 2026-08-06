export type DocumentUploadPayload = {
  ok?: boolean;
  outcome?: "processed" | "quarantined" | "duplicate" | "rejected";
  documentId?: string;
  originalFilename?: string;
  status?: string;
  analysisReady?: boolean;
  invoiceRecord?: Record<string, unknown> | null;
  warning?: string;
  error?: string;
};

export type DocumentUploadResult =
  | {
      kind: "processed";
      documentId: string | null;
      payload: DocumentUploadPayload;
    }
  | {
      kind: "duplicate";
      documentId: string;
      message: string;
      payload: DocumentUploadPayload;
    }
  | {
      kind: "quarantined";
      documentId: string | null;
      warning: string;
      payload: DocumentUploadPayload;
    }
  | {
      kind: "rejected";
      message: string;
      payload: DocumentUploadPayload;
    };

export type DocumentUploadCompletion =
  | (Extract<DocumentUploadResult, { kind: "processed" }> & {
      breakdownReady: boolean;
    })
  | Extract<DocumentUploadResult, { kind: "duplicate" }>
  | Extract<DocumentUploadResult, { kind: "quarantined" }>
  | Extract<DocumentUploadResult, { kind: "rejected" }>;

export class DocumentUploadRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DocumentUploadRequestError";
    this.status = status;
  }
}

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type Sleep = (milliseconds: number) => Promise<void>;

const defaultSleep: Sleep = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

async function readPayload(response: Response): Promise<DocumentUploadPayload> {
  if (!response.headers.get("content-type")?.includes("json")) return {};
  return (await response.json().catch(() => ({}))) as DocumentUploadPayload;
}

export async function submitDocumentUpload(
  form: FormData,
  fetcher: Fetcher = fetch,
): Promise<DocumentUploadResult> {
  const response = await fetcher("/api/portal/documents", {
    method: "POST",
    body: form,
  });
  const payload = await readPayload(response);

  if (response.status === 409 && payload.documentId) {
    return {
      kind: "duplicate",
      documentId: payload.documentId,
      message:
        payload.error ||
        "This source document already exists in the workspace.",
      payload,
    };
  }

  if (response.status === 422) {
    return {
      kind: "rejected",
      message:
        payload.error ||
        "The file was blocked by the security check and was not analyzed.",
      payload,
    };
  }

  if (!response.ok) {
    throw new DocumentUploadRequestError(
      payload.error || "The bill could not be uploaded.",
      response.status,
    );
  }

  if (payload.outcome === "quarantined") {
    return {
      kind: "quarantined",
      documentId: payload.documentId ?? null,
      warning:
        payload.warning ||
        "The security scan could not finish. The file remains private and has not been analyzed.",
      payload,
    };
  }

  return {
    kind: "processed",
    documentId: payload.documentId ?? null,
    payload,
  };
}

export async function waitForDocumentBreakdown(
  documentId: string,
  options: {
    fetcher?: Fetcher;
    delays?: number[];
    sleep?: Sleep;
  } = {},
) {
  const fetcher = options.fetcher ?? fetch;
  const delays = options.delays ?? [250, 500, 800, 1_200, 1_800, 2_500];
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    const response = await fetcher(
      `/api/portal/documents/${documentId}/breakdown`,
      { cache: "no-store" },
    ).catch(() => null);

    if (response?.ok) {
      const payload = await readPayload(response);
      if (payload.analysisReady === true) return true;
      if (response.status !== 202) return false;
    }
    if (response && ![202, 404, 425, 500, 503].includes(response.status)) {
      return false;
    }
    await sleep(delays[attempt]);
  }

  return false;
}

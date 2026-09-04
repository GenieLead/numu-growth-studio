const DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/api/v1";

export type VaceFunction =
  | "image_reference"
  | "video_repainting"
  | "video_edit"
  | "video_extension"
  | "video_outpainting";

export interface VaceTaskParams {
  function: VaceFunction;
  prompt: string;
  videoUrl?: string;
  refImagesUrl?: string[];
  maskImageUrl?: string;
  firstClipUrl?: string;
  controlCondition?: "depth" | "canny" | "pose";
  topScale?: number;
  bottomScale?: number;
  leftScale?: number;
  rightScale?: number;
  size?: string;
  promptExtend?: boolean;
  objOrBg?: string[];
}

export interface VaceTaskResult {
  taskId: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
}

export async function submitVaceTask(
  apiKey: string,
  params: VaceTaskParams
): Promise<{ taskId: string }> {
  const input: Record<string, unknown> = {
    function: params.function,
    prompt: params.prompt,
  };

  if (params.videoUrl) input.video_url = params.videoUrl;
  if (params.refImagesUrl) input.ref_images_url = params.refImagesUrl;
  if (params.maskImageUrl) input.mask_image_url = params.maskImageUrl;
  if (params.firstClipUrl) input.first_clip_url = params.firstClipUrl;

  const parameters: Record<string, unknown> = {};
  if (params.size) parameters.size = params.size;
  if (params.promptExtend !== undefined) parameters.prompt_extend = params.promptExtend;
  if (params.controlCondition) parameters.control_condition = params.controlCondition;
  if (params.topScale) parameters.top_scale = params.topScale;
  if (params.bottomScale) parameters.bottom_scale = params.bottomScale;
  if (params.leftScale) parameters.left_scale = params.leftScale;
  if (params.rightScale) parameters.right_scale = params.rightScale;
  if (params.objOrBg) parameters.obj_or_bg = params.objOrBg;

  const res = await fetch(
    `${DASHSCOPE_BASE}/services/aigc/video-generation/video-synthesis`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model: "wan2.1-vace-plus",
        input,
        parameters,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DashScope error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const taskId = data.output?.task_id;
  if (!taskId) throw new Error("No task_id returned from DashScope");

  return { taskId };
}

export async function pollVaceTask(
  apiKey: string,
  taskId: string
): Promise<VaceTaskResult> {
  const res = await fetch(`${DASHSCOPE_BASE}/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DashScope poll error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const output = data.output;

  let status: VaceTaskResult["status"];
  switch (output?.status) {
    case "SUCCEEDED":
      status = "completed";
      break;
    case "FAILED":
    case "CANCELED":
      status = "failed";
      break;
    case "RUNNING":
      status = "in_progress";
      break;
    default:
      status = "queued";
  }

  return {
    taskId,
    status,
    videoUrl: output?.video_url || output?.results?.[0]?.url,
    error: output?.message,
  };
}

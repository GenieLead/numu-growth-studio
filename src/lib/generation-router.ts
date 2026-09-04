import { getOpenRouterKey, submitVideoGeneration, pollVideoGeneration } from "./openrouter";
import { submitVaceTask, pollVaceTask, type VaceFunction } from "./dashscope";

export type TaskType =
  | "reference_to_video"
  | "video_restyle"
  | "object_swap"
  | "video_extend"
  | "text_to_video"
  | "image_to_video";

export interface GenerationRequest {
  taskType: TaskType;
  prompt: string;
  referenceVideoUrl?: string;
  referenceImageUrls?: string[];
  characterImageUrl?: string;
  productImageUrl?: string;
  locationImageUrl?: string;
  duration?: number;
  resolution?: string;
  aspectRatio?: string;
  maskImageUrl?: string;
}

export interface RoutedGeneration {
  provider: "dashscope" | "openrouter";
  taskId: string;
  model: string;
  estimatedCost?: number;
}

function getVaceFunction(taskType: TaskType): VaceFunction {
  switch (taskType) {
    case "video_extend":
      return "video_extension";
    case "video_restyle":
      return "video_repainting";
    case "object_swap":
      return "video_edit";
    case "reference_to_video":
      return "image_reference";
    default:
      return "image_reference";
  }
}

function getSizeForAspect(aspectRatio?: string): string {
  switch (aspectRatio) {
    case "9:16":
      return "720*1280";
    case "1:1":
      return "720*720";
    case "4:3":
      return "960*720";
    case "3:4":
      return "720*960";
    default:
      return "1280*720";
  }
}

export async function routeGeneration(
  userId: string,
  request: GenerationRequest
): Promise<RoutedGeneration> {
  const orKey = await getOpenRouterKey(userId);
  const dsKey = process.env.DASHSCOPE_API_KEY;

  console.log("[Router] taskType:", request.taskType, "orKey:", !!orKey, "dsKey:", !!dsKey);

  // VACE-capable tasks: object_swap, video_restyle, video_extend
  const vaceTasks: TaskType[] = ["object_swap", "video_restyle", "video_extend"];

  if (vaceTasks.includes(request.taskType)) {
    if (dsKey) {
      // Use VACE if DashScope is available
      const vaceResult = await submitVaceTask(dsKey, {
        function: getVaceFunction(request.taskType),
        prompt: request.prompt,
        videoUrl: request.referenceVideoUrl,
        refImagesUrl: [
          ...(request.referenceImageUrls || []),
          ...(request.characterImageUrl ? [request.characterImageUrl] : []),
          ...(request.productImageUrl ? [request.productImageUrl] : []),
          ...(request.locationImageUrl ? [request.locationImageUrl] : []),
        ].filter(Boolean),
        maskImageUrl: request.maskImageUrl,
        size: getSizeForAspect(request.aspectRatio),
      });

      return {
        provider: "dashscope",
        taskId: vaceResult.taskId,
        model: "wan2.1-vace-plus",
      };
    }

    // Fallback to Seedance R2V when DashScope is not available
    // object_swap / video_restyle → Seedance R2V with reference images
    // video_extend → Seedance R2V (regenerate with extended duration)
    if (!orKey) throw new Error("No API key available. Connect OpenRouter in Settings.");

    const allRefs = [
      ...(request.referenceImageUrls || []),
      ...(request.characterImageUrl ? [request.characterImageUrl] : []),
      ...(request.productImageUrl ? [request.productImageUrl] : []),
      ...(request.locationImageUrl ? [request.locationImageUrl] : []),
    ].filter(Boolean);

    const result = await submitVideoGeneration(orKey, {
      model: "bytedance/seedance-2.5",
      prompt: request.prompt,
      duration: request.duration || 10,
      resolution: request.resolution || "720p",
      aspectRatio: request.aspectRatio || "16:9",
      inputReferences: allRefs.length > 0
        ? allRefs.map((url) => ({ type: "image_url", image_url: { url } }))
        : undefined,
    });

    return {
      provider: "openrouter",
      taskId: result.jobId,
      model: "bytedance/seedance-2.5",
    };
  }

  // OpenRouter tasks: reference_to_video, text_to_video, image_to_video
  if (!orKey) throw new Error("OpenRouter key not connected. Add it in Settings.");

  if (request.taskType === "reference_to_video") {
    // Filter to only image URLs — Seedance R2V doesn't accept video references
    const imageRefs = (request.referenceImageUrls || []).filter(
      (url) => !url.endsWith(".mp4") && !url.endsWith(".mov") && !url.endsWith(".webm") && !url.endsWith(".avi")
    );

    // Also include character/product/location images as references
    const assetImages = [
      request.characterImageUrl,
      request.productImageUrl,
      request.locationImageUrl,
    ].filter(Boolean) as string[];

    const allRefs = [...new Set([...imageRefs, ...assetImages])];

    const result = await submitVideoGeneration(orKey, {
      model: "bytedance/seedance-2.5",
      prompt: request.prompt,
      duration: request.duration || 10,
      resolution: request.resolution || "720p",
      aspectRatio: request.aspectRatio || "16:9",
      inputReferences: allRefs.length > 0
        ? allRefs.map((url) => ({ type: "image_url", image_url: { url } }))
        : undefined,
    });
    return {
      provider: "openrouter",
      taskId: result.jobId,
      model: "bytedance/seedance-2.5",
    };
  }

  if (request.taskType === "image_to_video") {
    const firstFrame =
      request.characterImageUrl || request.referenceImageUrls?.[0];
    if (!firstFrame) throw new Error("Need at least one image for image-to-video");

    const result = await submitVideoGeneration(orKey, {
      model: "bytedance/seedance-2.0",
      prompt: request.prompt,
      duration: request.duration || 10,
      resolution: request.resolution || "720p",
      aspectRatio: request.aspectRatio || "16:9",
      frameImages: [
        {
          type: "image_url",
          image_url: { url: firstFrame },
          frame_type: "first_frame",
        },
      ],
    });
    return {
      provider: "openrouter",
      taskId: result.jobId,
      model: "bytedance/seedance-2.0",
    };
  }

  // text_to_video
  const result = await submitVideoGeneration(orKey, {
    model: "bytedance/seedance-2.0",
    prompt: request.prompt,
    duration: request.duration || 10,
    resolution: request.resolution || "720p",
    aspectRatio: request.aspectRatio || "16:9",
  });
  return {
    provider: "openrouter",
    taskId: result.jobId,
    model: "bytedance/seedance-2.0",
  };
}

export async function pollGeneration(
  provider: "dashscope" | "openrouter",
  apiKey: string,
  taskId: string
) {
  if (provider === "dashscope") {
    return pollVaceTask(apiKey, taskId);
  }
  return pollVideoGeneration(apiKey, taskId);
}

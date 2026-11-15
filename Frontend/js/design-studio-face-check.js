import {
    FaceDetector,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

const WASM_URL =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

const MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite";

window.SELFII_FACE_CHECK_READY = (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);

    return FaceDetector.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: MODEL_URL
        },
        runningMode: "IMAGE",
        minDetectionConfidence: 0.6
    });
})();

window.SELFII_detectFace = async (file) => {
    const detector = await window.SELFII_FACE_CHECK_READY;
    const bitmap = await createImageBitmap(file);

    try {
        const result = detector.detect(bitmap);
        return (result.detections || []).length > 0;
    } finally {
        bitmap.close();
    }
};

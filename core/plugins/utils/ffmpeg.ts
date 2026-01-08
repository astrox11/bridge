import { spawn } from "child_process";

export const execFfmpeg = (args: string[]) => {
  return new Promise((resolve, reject) => {
    const process = spawn("ffmpeg", args);

    let stderrData = "";

    process.stderr.on("data", (data: Buffer) => {
      stderrData += data.toString();
    });

    process.on("close", (code: number | null) => {
      if (code === 0) {
        resolve("Success");
      } else {
        reject(new Error(`FFmpeg exit code ${code}: ${stderrData}`));
      }
    });

    process.on("error", (err: Error) => {
      reject(err);
    });
  });
};

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Difficulty } from "@prisma/client";
import { env } from "../config/env.js";
import { AppError } from "../exceptions/app-error.js";
import { sha256 } from "../utils/crypto.js";

const execFileAsync = promisify(execFile);

type LabRuntime = {
  slug: string;
  name: string;
  os: string;
  difficulty: Difficulty;
  dockerImage?: string | null;
  servicePort?: number | null;
};

type ProvisionedTarget = {
  provider: string;
  providerInstanceId?: string;
  ipAddress: string;
  accessUrl: string;
  username: string;
  password: string;
  flag: string;
  metadata: Record<string, unknown>;
};

export class LabOrchestrator {
  async start(lab: LabRuntime, attemptId: string): Promise<ProvisionedTarget> {
    if (env.LAB_ORCHESTRATOR === "docker") return this.startDocker(lab, attemptId);
    return this.startSimulation(lab);
  }

  async stop(provider?: string | null, providerInstanceId?: string | null) {
    if (provider !== "docker" || !providerInstanceId) return;
    await execFileAsync("docker", ["rm", "-f", providerInstanceId], { windowsHide: true }).catch(() => undefined);
  }

  flagFor(slug: string) {
    return `TH{${slug.replace(/-/g, "_")}_owned}`;
  }

  private async startDocker(lab: LabRuntime, attemptId: string): Promise<ProvisionedTarget> {
    const image = lab.dockerImage ?? env.LAB_DOCKER_IMAGE;
    const servicePort = String(lab.servicePort ?? 80);
    const flag = this.flagFor(lab.slug);
    const name = `trainhack-${lab.slug}-${attemptId.slice(0, 8)}`;
    const args = [
      "run",
      "-d",
      "--rm",
      "--name",
      name,
      "--label",
      "trainhack.managed=true",
      "--label",
      `trainhack.lab=${lab.slug}`,
      "--label",
      `trainhack.attempt=${attemptId}`,
      "-e",
      `LAB_NAME=${lab.name}`,
      "-e",
      `LAB_SLUG=${lab.slug}`,
      "-e",
      `LAB_FLAG=${flag}`,
      "-p",
      `127.0.0.1::${servicePort}`,
    ];

    if (env.LAB_DOCKER_NETWORK) args.push("--network", env.LAB_DOCKER_NETWORK);
    args.push(image);

    let containerId: string;
    try {
      const { stdout } = await execFileAsync("docker", args, { windowsHide: true });
      containerId = stdout.trim();
    } catch (error) {
      throw new AppError(
        "Unable to start Docker lab machine. Build the lab image and make sure Docker is running.",
        503,
        "LAB_ORCHESTRATION_FAILED",
        [error],
      );
    }

    const hostPort = await this.inspectHostPort(containerId, servicePort);
    const address = `${env.LAB_PUBLIC_HOST}:${hostPort}`;

    return {
      provider: "docker",
      providerInstanceId: containerId,
      ipAddress: address,
      accessUrl: `http://${address}`,
      username: "learner",
      password: `trainhack-${lab.slug}`,
      flag,
      metadata: { image, containerName: name, servicePort: Number(servicePort), hostPort, username: "learner", password: `trainhack-${lab.slug}` },
    };
  }

  private async inspectHostPort(containerId: string, servicePort: string) {
    const format = `{{(index (index .NetworkSettings.Ports "${servicePort}/tcp") 0).HostPort}}`;
    const { stdout } = await execFileAsync("docker", ["inspect", "-f", format, containerId], { windowsHide: true });
    return stdout.trim();
  }

  private startSimulation(lab: LabRuntime): ProvisionedTarget {
    const digest = sha256(lab.slug);
    const third = 10 + (parseInt(digest.slice(0, 2), 16) % 120);
    const fourth = 10 + (parseInt(digest.slice(2, 4), 16) % 200);
    const address = `10.10.${third}.${fourth}`;

    return {
      provider: "simulation",
      ipAddress: address,
      accessUrl: `http://${address}`,
      username: "learner",
      password: `trainhack-${lab.slug}`,
      flag: this.flagFor(lab.slug),
      metadata: { simulated: true, username: "learner", password: `trainhack-${lab.slug}` },
    };
  }
}

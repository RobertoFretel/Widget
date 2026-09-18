import { defineWidget, scheme } from "../builder";

const querySchema = scheme.Object({});

type SystemData = {
  cpuUsage: number;
  memory: {
    usedPercent: number;
    usedGB: number;
    totalGB: number;
  };
  load: {
    average: number;
    cores: number;
    percent: number;
  };
  uptime: string;
};

async function runCommand(cmd: string[]): Promise<string> {
  const proc = Bun.spawn({ cmd, stdout: "pipe", stderr: "pipe" });
  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`Comando fallito: ${cmd.join(" ")}`);
  }

  return output.trim();
}

async function sampleCpuStat() {
  const text = await Bun.file("/proc/stat").text();
  const parts = text.split("\n")[0]!.split(/\s+/).slice(1).map(Number);
  const idle = parts[3]! + parts[4]!;
  const total = parts.reduce((a, b) => a + b, 0);
  return { idle, total };
}

async function getCpuUsage(): Promise<number> {
  const first = await sampleCpuStat();
  await new Promise((resolve) => setTimeout(resolve, 300));
  const second = await sampleCpuStat();

  const totalDiff = second.total - first.total;
  const idleDiff = second.idle - first.idle;

  if (totalDiff <= 0) return 0;
  return ((totalDiff - idleDiff) / totalDiff) * 100;
}

async function getMemoryUsage(): Promise<SystemData["memory"]> {
  const text = await Bun.file("/proc/meminfo").text();

  const value = (label: string) => {
    const match = text.match(new RegExp(`^${label}:\\s+(\\d+)`, "m"));
    return match ? parseInt(match[1]!, 10) : 0;
  };

  const total = value("MemTotal");
  const available = value("MemAvailable");
  const used = total - available;

  return {
    usedPercent: total ? (used / total) * 100 : 0,
    usedGB: used / 1024 / 1024,
    totalGB: total / 1024 / 1024,
  };
}

async function getLoadAverage(): Promise<SystemData["load"]> {
  const text = await Bun.file("/proc/loadavg").text();
  const average = parseFloat(text.split(" ")[0]!);
  const cores = parseInt(await runCommand(["nproc"]), 10);

  return {
    average,
    cores,
    percent: cores ? (average / cores) * 100 : 0,
  };
}

async function getUptime(): Promise<string> {
  const text = await Bun.file("/proc/uptime").text();
  const seconds = parseFloat(text.split(" ")[0]!);

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}g ${hours}h ${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export const Sistema = defineWidget({
  name: "sistema",
  size: "right",
  query: querySchema,
  defaultQuery: {},
  update: true,
  async backend() {
    const [cpuUsage, memory, load, uptime] = await Promise.all([
      getCpuUsage(),
      getMemoryUsage(),
      getLoadAverage(),
      getUptime(),
    ]);

    return { cpuUsage, memory, load, uptime };
  },
  template: ({ data }) => {
    const MetricBar = ({ label, value }: { label: string; value: number }) => (
      <li>
        <div className="flex justify-between color-base">
          <span>{label}</span>
          <span>{Math.round(value)}%</span>
        </div>
        <div className="progress-bar margin-top-5">
          <div className="progress-value" style={{ width: `${Math.min(value, 100)}%` }} />
        </div>
      </li>
    );

    return (
      <article className="widget">
        <div className="widget-content">
          <h2 className="size-h2 color-highlight margin-bottom-10">Sistema</h2>

          <ul className="list list-gap-10">
            <MetricBar label="CPU" value={data.cpuUsage} />
            <MetricBar label="Memoria" value={data.memory.usedPercent} />
            <MetricBar label="Load" value={data.load.percent} />

            <li className="flex justify-between color-base">
              <span>Ram</span>
              <span className="color-subdue">
                {data.memory.usedGB.toFixed(1)} / {data.memory.totalGB.toFixed(1)} GB
              </span>
            </li>

            <li className="flex justify-between color-base">
              <span>Load avg</span>
              <span className="color-subdue">{data.load.average.toFixed(2)}</span>
            </li>

            <li className="flex justify-between color-base">
              <span>Uptime</span>
              <span className="color-subdue">{data.uptime}</span>
            </li>
          </ul>
        </div>
      </article>
    );
  },
});

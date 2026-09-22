import { CpuIcon, HardDriveIcon, MemoryStickIcon } from "@galacius/design-system";
import type { ComponentProps, ComponentType } from "react";

type IconProps = ComponentProps<typeof CpuIcon>;

const METRIC_ICON_COMPONENTS: Record<string, ComponentType<IconProps>> = {
  cpu: CpuIcon,
  memory: MemoryStickIcon,
  diskio: HardDriveIcon,
};

export function getMetricIcon(metricClass: string, props?: IconProps) {
  const Icon = METRIC_ICON_COMPONENTS[metricClass];
  return Icon ? <Icon {...props} /> : null;
}

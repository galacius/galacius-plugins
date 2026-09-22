import {
  Button,
  cn,
  EyeIcon,
  EyeOffIcon,
  GripVerticalIcon,
  InfoIcon,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@galacius/design-system";
import { FC, useCallback, useState } from "react";
import type { Capabilities } from "../../../api/resources";
import { METRIC_CLASS_LABELS } from "../../../utils";

// The browser renders its default/native drag image translucently no matter
// what background color the dragged element has — that's what causes rows to
// look "see-through" while dragging, and it can't be overridden with CSS.
// Pointing setDragImage at this transparent 1x1 pixel suppresses that native
// ghost entirely so we can render our own fully-opaque floating preview below.
const EMPTY_DRAG_IMAGE = new Image();
EMPTY_DRAG_IMAGE.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

interface MetricOrderListProps {
  metricOrder: string[];
  enabledMetrics: Record<string, boolean>;
  capabilities: Capabilities;
  onToggle: (metricClass: string, enabled: boolean) => void;
  onReorder: (newOrder: string[]) => void;
}

export const MetricOrderList: FC<MetricOrderListProps> = ({
  metricOrder,
  enabledMetrics,
  capabilities,
  onToggle,
  onReorder,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragGeometry, setDragGeometry] = useState({ offsetX: 0, offsetY: 0, width: 0 });

  const handleDragStart = useCallback(
    (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = "move";
      setDragGeometry({
        offsetX: e.nativeEvent.offsetX,
        offsetY: e.nativeEvent.offsetY,
        width: e.currentTarget.getBoundingClientRect().width,
      });
      setDragPosition({ x: e.clientX, y: e.clientY });
      e.dataTransfer.setDragImage(EMPTY_DRAG_IMAGE, 0, 0);
    },
    []
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    // Browsers fire a final "drag" event with clientX/clientY pinned to 0 right
    // before dragend — ignore it so the ghost doesn't jump to the corner.
    if (e.clientX === 0 && e.clientY === 0) return;
    setDragPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handleDragOver = useCallback(
    (index: number) => (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverIndex(index);
    },
    []
  );

  const handleDrop = useCallback(
    (index: number) => (e: React.DragEvent) => {
      e.preventDefault();
      setDragOverIndex(null);
      if (draggedIndex === null || draggedIndex === index) return;
      const newOrder = [...metricOrder];
      const [moved] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(index, 0, moved);
      onReorder(newOrder);
      setDraggedIndex(null);
    },
    [draggedIndex, metricOrder, onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragPosition(null);
  }, []);

  return (
    <div className="space-y-2">
      {metricOrder.map((metricClass, index) => {
        const isSupported = (capabilities as Capabilities)[metricClass as keyof Capabilities];
        const isEnabled = enabledMetrics[metricClass];
        const label = METRIC_CLASS_LABELS[metricClass as keyof typeof METRIC_CLASS_LABELS];

        let rowClassName =
          "border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900";
        if (draggedIndex === index) {
          rowClassName = "border-neutral-300 bg-black dark:border-neutral-700 dark:bg-black";
        } else if (dragOverIndex === index) {
          rowClassName = "border-blue-500 bg-neutral-50 dark:border-blue-400 dark:bg-neutral-900";
        }

        return (
          <div
            key={metricClass}
            draggable
            onDragStart={handleDragStart(index)}
            onDrag={handleDrag}
            onDragOver={handleDragOver(index)}
            onDrop={handleDrop(index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "flex items-center gap-2 rounded border-2 p-2 transition-colors",
              rowClassName
            )}
          >
            <span
              className="cursor-grab text-neutral-400 active:cursor-grabbing"
              title="Drag to reorder"
            >
              <GripVerticalIcon className="h-4 w-4" />
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onToggle(metricClass, !isEnabled)}
              disabled={!isSupported}
              aria-label={isEnabled ? `Disable ${label}` : `Enable ${label}`}
              aria-pressed={isEnabled}
              className="shrink-0"
              title={!isSupported ? `${label} is not available on this platform` : undefined}
            >
              {isEnabled ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
            </Button>
            <span className="flex-1 text-sm">{label}</span>
            {!isSupported && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span className="cursor-help text-neutral-500">
                        <InfoIcon className="h-4 w-4" />
                      </span>
                    }
                  />
                  <TooltipContent side="top">
                    {`${label} is not available on this platform`}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      })}
      {draggedIndex !== null && dragPosition && (
        <div
          className="pointer-events-none fixed z-50 flex items-center gap-2 rounded border-2 border-neutral-300 bg-black p-2 text-white shadow-lg dark:border-neutral-700"
          style={{
            left: dragPosition.x - dragGeometry.offsetX,
            top: dragPosition.y - dragGeometry.offsetY,
            width: dragGeometry.width,
          }}
        >
          <GripVerticalIcon className="h-4 w-4 text-neutral-400" />
          <span className="flex-1 text-sm">
            {METRIC_CLASS_LABELS[metricOrder[draggedIndex] as keyof typeof METRIC_CLASS_LABELS]}
          </span>
        </div>
      )}
    </div>
  );
};

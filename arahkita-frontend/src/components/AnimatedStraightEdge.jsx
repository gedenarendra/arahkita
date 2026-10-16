import { BaseEdge, getStraightPath } from "@xyflow/react";

function AnimatedStraightEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
}) {
  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const delay = style?.animationDelay || "0ms";

  return (
    <g
      className="animate-node-pop"
      style={{
        animationDelay: delay,
        transformBox: "fill-box",
        transformOrigin: "center",
      }}
    >
      <BaseEdge
        id={id}
        path={edgePath}
        style={style}
        markerEnd={markerEnd}
      />
    </g>
  );
}

export default AnimatedStraightEdge;


import { ReactFlow, Background } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import PlatformNode from "./PlatformNode";
import AnimatedStraightEdge from "./AnimatedStraightEdge";

const defaultNodeTypes = {
  default: PlatformNode,
  platform: PlatformNode,
};

const defaultEdgeTypes = {
  default: AnimatedStraightEdge,
  straight: AnimatedStraightEdge,
  animatedStraight: AnimatedStraightEdge,
};

function GraphNodeComponent({
  nodes = [],
  edges = [],
  nodeTypes,
  edgeTypes,
  onNodesChange,
  onEdgesChange,
  onConnect,
  showBackground = true,
  backgroundProps = {},
  className = "",
  style = {},
  children,
  fitView = true,
  ...props
}) {
  const mergedNodeTypes = {
    ...defaultNodeTypes,
    ...nodeTypes,
  };

  const mergedEdgeTypes = {
    ...defaultEdgeTypes,
    ...edgeTypes,
  };

  return (
    <div
      className={`w-full h-full min-h-0 min-w-0 relative flex-1 ${className}`}
      style={{ width: "100%", height: "100%", ...style }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={mergedNodeTypes}
        edgeTypes={mergedEdgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView={fitView}
        proOptions={{ hideAttribution: true }}
        style={{ width: "100%", height: "100%" }}
        {...props}
      >
        {showBackground && (
          <Background
            color="#D9D9D9"
            gap={16}
            size={1}
            variant="cross"
            {...backgroundProps}
          />
        )}
        {children}
      </ReactFlow>
    </div>
  );
}

export default GraphNodeComponent;

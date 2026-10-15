import { ReactFlow, Background } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import PlatformNode from "./PlatformNode";

const defaultNodeTypes = {
  default: PlatformNode,
  platform: PlatformNode,
};

function GraphNodeComponent({
  nodes = [],
  edges = [],
  nodeTypes,
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

  return (
    <div
      className={`w-full h-full min-h-0 min-w-0 relative flex-1 ${className}`}
      style={{ width: "100%", height: "100%", ...style }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={mergedNodeTypes}
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

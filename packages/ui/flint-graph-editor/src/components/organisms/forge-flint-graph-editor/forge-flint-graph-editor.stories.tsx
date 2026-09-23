import { ForgeBadge, ForgeButton, ForgeButtonGroup } from '@mission-platform/components';
import {
  compileNodeGraph,
  createNodeFromDefinition,
  createPrimitiveType,
  getNodeDefinition,
} from '@mission-platform/flint';

import { FlintEditorStore, ForgeDebugScrubber, ForgeFlintGraphEditor } from '@mission-platform/flint-graph-editor';

import type { FlintGraphEdge, FlintGraphNode, FlintMetaNodeSubgraph, FlintNodeGraph } from '@mission-platform/flint';
import type { FlintTraceReport } from '@mission-platform/flint-runtime';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Organisms/Editors/FlintGraphEditor',
  component: ForgeFlintGraphEditor,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'High-performance WebGPU visual node graph editor for the Flint compiler. Supports instanced rendering of 10,000+ nodes and edges, interactive Static Single Assignment (SSA) dataflow authoring, live WebAssembly in-browser execution, and execution trace debugging with causal edge pulses.',
      },
    },
  },
} satisfies Meta<typeof ForgeFlintGraphEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

const storyWrapperStyle = {
  width: '100vw',
  height: '100vh',
  maxWidth: '100vw',
  maxHeight: '100vh',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column' as const,
};

/**
 * Retrieves a node definition by operation name, throwing an error if missing.
 */
function getStoryNodeDefinition(operation: string) {
  const definition = getNodeDefinition(operation);
  if (!definition) {
    throw new Error(`Missing node definition for story: ${operation}`);
  }
  return definition;
}

/**
 * Creates an editor store initialized with a sample arithmetic math pipeline.
 */
function createMathPipelineStore(): FlintEditorStore {
  const inputDefinition = getStoryNodeDefinition('input');
  const addDefinition = getStoryNodeDefinition('add');
  const multiplyDefinition = getStoryNodeDefinition('multiply');
  const constantDefinition = getStoryNodeDefinition('constant');
  const outputDefinition = getStoryNodeDefinition('output');

  const inA = createNodeFromDefinition(inputDefinition, 'in_a', { x: 80, y: 120 }, { name: 'a' });
  const inB = createNodeFromDefinition(inputDefinition, 'in_b', { x: 80, y: 260 }, { name: 'b' });
  const addNode = createNodeFromDefinition(addDefinition, 'add_1', {
    x: 320,
    y: 180,
  });
  const constNode = createNodeFromDefinition(constantDefinition, 'const_factor', { x: 320, y: 340 }, { value: 2 });
  const multNode = createNodeFromDefinition(multiplyDefinition, 'mult_1', {
    x: 560,
    y: 240,
  });
  const outNode = createNodeFromDefinition(outputDefinition, 'out_1', { x: 800, y: 240 }, { name: 'result' });

  const edges: readonly FlintGraphEdge[] = [
    {
      id: 'e1',
      fromNodeId: 'in_a',
      fromPortId: 'value',
      toNodeId: 'add_1',
      toPortId: 'a',
    },
    {
      id: 'e2',
      fromNodeId: 'in_b',
      fromPortId: 'value',
      toNodeId: 'add_1',
      toPortId: 'b',
    },
    {
      id: 'e3',
      fromNodeId: 'add_1',
      fromPortId: 'result',
      toNodeId: 'mult_1',
      toPortId: 'a',
    },
    {
      id: 'e4',
      fromNodeId: 'const_factor',
      fromPortId: 'value',
      toNodeId: 'mult_1',
      toPortId: 'b',
    },
    {
      id: 'e5',
      fromNodeId: 'mult_1',
      fromPortId: 'result',
      toNodeId: 'out_1',
      toPortId: 'value',
    },
  ];

  const graph: FlintNodeGraph = {
    id: 'math_pipeline',
    name: 'ArithmeticPipeline',
    nodes: [inA, inB, addNode, constNode, multNode, outNode],
    edges,
  };

  return new FlintEditorStore(graph);
}

/**
 * Creates an editor store initialized with vector and option collection nodes.
 */
function createStdlibCollectionsStore(): FlintEditorStore {
  const vecNewDefinition = getStoryNodeDefinition('vector_new');
  const vecPushDefinition = getStoryNodeDefinition('vector_push');
  const vecGetDefinition = getStoryNodeDefinition('vector_get');
  const optUnwrapDefinition = getStoryNodeDefinition('option_unwrap_or');
  const constantDefinition = getStoryNodeDefinition('constant');
  const outputDefinition = getStoryNodeDefinition('output');

  const vecNew = createNodeFromDefinition(vecNewDefinition, 'vec_init', {
    x: 60,
    y: 120,
  });
  const itemValue = createNodeFromDefinition(constantDefinition, 'item_val', { x: 60, y: 260 }, { value: 42 });
  const vecPush = createNodeFromDefinition(vecPushDefinition, 'vec_append', {
    x: 280,
    y: 160,
  });
  const indexValue = createNodeFromDefinition(constantDefinition, 'idx_val', { x: 280, y: 320 }, { value: 0 });
  const vecGet = createNodeFromDefinition(vecGetDefinition, 'vec_access', {
    x: 500,
    y: 200,
  });
  const fallback = createNodeFromDefinition(constantDefinition, 'fallback_val', { x: 500, y: 360 }, { value: -1 });
  const optUnwrap = createNodeFromDefinition(optUnwrapDefinition, 'opt_resolve', { x: 720, y: 260 });
  const outNode = createNodeFromDefinition(outputDefinition, 'final_out', {
    x: 940,
    y: 260,
  });

  const edges: readonly FlintGraphEdge[] = [
    {
      id: 'e1',
      fromNodeId: 'vec_init',
      fromPortId: 'vector',
      toNodeId: 'vec_append',
      toPortId: 'vector',
    },
    {
      id: 'e2',
      fromNodeId: 'item_val',
      fromPortId: 'value',
      toNodeId: 'vec_append',
      toPortId: 'item',
    },
    {
      id: 'e3',
      fromNodeId: 'vec_append',
      fromPortId: 'vector',
      toNodeId: 'vec_access',
      toPortId: 'vector',
    },
    {
      id: 'e4',
      fromNodeId: 'idx_val',
      fromPortId: 'value',
      toNodeId: 'vec_access',
      toPortId: 'index',
    },
    {
      id: 'e5',
      fromNodeId: 'vec_access',
      fromPortId: 'result',
      toNodeId: 'opt_resolve',
      toPortId: 'option',
    },
    {
      id: 'e6',
      fromNodeId: 'fallback_val',
      fromPortId: 'value',
      toNodeId: 'opt_resolve',
      toPortId: 'fallback',
    },
    {
      id: 'e7',
      fromNodeId: 'opt_resolve',
      fromPortId: 'result',
      toNodeId: 'final_out',
      toPortId: 'value',
    },
  ];

  const graph: FlintNodeGraph = {
    id: 'stdlib_collections',
    name: 'VectorCollectionsPipeline',
    nodes: [vecNew, itemValue, vecPush, indexValue, vecGet, fallback, optUnwrap, outNode],
    edges,
  };

  return new FlintEditorStore(graph);
}

/**
 * Creates an editor store initialized with grouped arithmetic stages and color themes.
 */
function createGroupingPipelineStore(): FlintEditorStore {
  const inputDefinition = getStoryNodeDefinition('input');
  const addDefinition = getStoryNodeDefinition('add');
  const multiplyDefinition = getStoryNodeDefinition('multiply');
  const outputDefinition = getStoryNodeDefinition('output');

  const inA = createNodeFromDefinition(inputDefinition, 'in_a', { x: -350, y: -100 }, { name: 'a' });
  const inB = createNodeFromDefinition(inputDefinition, 'in_b', { x: -350, y: 100 }, { name: 'b' });
  const addNode = createNodeFromDefinition(addDefinition, 'add_1', {
    x: -40,
    y: -50,
  });

  const factorNode = createNodeFromDefinition(inputDefinition, 'factor', { x: 260, y: 100 }, { name: 'scale' });
  const multNode = createNodeFromDefinition(multiplyDefinition, 'mult_1', {
    x: 260,
    y: -50,
  });
  const outNode = createNodeFromDefinition(outputDefinition, 'out_res', { x: 560, y: -50 }, { name: 'result' });

  const graph: FlintNodeGraph = {
    id: 'grouping_pipeline',
    name: 'GroupingPipeline',
    nodes: [
      { ...inA, groupId: 'group_inputs' },
      { ...inB, groupId: 'group_inputs' },
      { ...addNode, groupId: 'group_inputs' },
      { ...factorNode, groupId: 'group_calc' },
      { ...multNode, groupId: 'group_calc' },
      { ...outNode, groupId: 'group_calc' },
    ],
    edges: [
      {
        id: 'edge_1',
        fromNodeId: 'in_a',
        fromPortId: 'value',
        toNodeId: 'add_1',
        toPortId: 'a',
        points: [{ x: -180, y: -120 }],
      },
      {
        id: 'edge_2',
        fromNodeId: 'in_b',
        fromPortId: 'value',
        toNodeId: 'add_1',
        toPortId: 'b',
      },
      {
        id: 'edge_3',
        fromNodeId: 'add_1',
        fromPortId: 'result',
        toNodeId: 'mult_1',
        toPortId: 'a',
      },
      {
        id: 'edge_4',
        fromNodeId: 'factor',
        fromPortId: 'value',
        toNodeId: 'mult_1',
        toPortId: 'b',
      },
      {
        id: 'edge_5',
        fromNodeId: 'mult_1',
        fromPortId: 'result',
        toNodeId: 'out_res',
        toPortId: 'value',
      },
    ],
    groups: [
      {
        id: 'group_inputs',
        title: 'Input & Addition Stage',
        nodeIds: ['in_a', 'in_b', 'add_1'],
        color: '#58a6ff',
      },
      {
        id: 'group_calc',
        title: 'Scaling & Output Stage',
        nodeIds: ['factor', 'mult_1', 'out_res'],
        color: '#3fb950',
      },
    ],
  };

  return new FlintEditorStore(graph);
}

/**
 * Creates an editor store initialized with reusable composite meta-node subgraphs.
 */
function createMetaNodesStore(): FlintEditorStore {
  const inputDefinition = getStoryNodeDefinition('input');
  const outputDefinition = getStoryNodeDefinition('output');
  const addDefinition = getStoryNodeDefinition('add');
  const multiplyDefinition = getStoryNodeDefinition('multiply');

  // Internal subgraph nodes for a "LinearTransform" meta node: (x + offset) * scale
  const subInX = createNodeFromDefinition(inputDefinition, 'sub_x', { x: -200, y: -50 }, { name: 'x' });
  const subInOffset = createNodeFromDefinition(inputDefinition, 'sub_offset', { x: -200, y: 80 }, { name: 'offset' });
  const subAdd = createNodeFromDefinition(addDefinition, 'sub_add', {
    x: 50,
    y: 0,
  });
  const subInScale = createNodeFromDefinition(inputDefinition, 'sub_scale', { x: 50, y: 120 }, { name: 'scale' });
  const subMul = createNodeFromDefinition(multiplyDefinition, 'sub_mul', {
    x: 300,
    y: 40,
  });
  const subOut = createNodeFromDefinition(outputDefinition, 'sub_out', { x: 540, y: 40 }, { name: 'out' });

  const metaSubgraph: FlintMetaNodeSubgraph = {
    nodes: [subInX, subInOffset, subAdd, subInScale, subMul, subOut],
    edges: [
      {
        id: 'sub_e1',
        fromNodeId: 'sub_x',
        fromPortId: 'value',
        toNodeId: 'sub_add',
        toPortId: 'a',
      },
      {
        id: 'sub_e2',
        fromNodeId: 'sub_offset',
        fromPortId: 'value',
        toNodeId: 'sub_add',
        toPortId: 'b',
      },
      {
        id: 'sub_e3',
        fromNodeId: 'sub_add',
        fromPortId: 'result',
        toNodeId: 'sub_mul',
        toPortId: 'a',
      },
      {
        id: 'sub_e4',
        fromNodeId: 'sub_scale',
        fromPortId: 'value',
        toNodeId: 'sub_mul',
        toPortId: 'b',
      },
      {
        id: 'sub_e5',
        fromNodeId: 'sub_mul',
        fromPortId: 'result',
        toNodeId: 'sub_out',
        toPortId: 'value',
      },
    ],
    exposedInputPortMap: {
      input_x: { internalNodeId: 'sub_x', internalPortId: 'value' },
      input_offset: { internalNodeId: 'sub_offset', internalPortId: 'value' },
      input_scale: { internalNodeId: 'sub_scale', internalPortId: 'value' },
    },
    exposedOutputPortMap: {
      output_val: { internalNodeId: 'sub_out', internalPortId: 'value' },
    },
  };

  const metaNode: FlintGraphNode = {
    id: 'meta_transform_1',
    title: 'Linear Transform',
    category: 'custom',
    kind: 'meta',
    operation: 'meta',
    inputs: [
      {
        id: 'input_x',
        name: 'x',
        direction: 'input',
        type: createPrimitiveType('i32'),
      },
      {
        id: 'input_offset',
        name: 'offset',
        direction: 'input',
        type: createPrimitiveType('i32'),
      },
      {
        id: 'input_scale',
        name: 'scale',
        direction: 'input',
        type: createPrimitiveType('i32'),
      },
    ],
    outputs: [
      {
        id: 'output_val',
        name: 'result',
        direction: 'output',
        type: createPrimitiveType('i32'),
      },
    ],
    position: { x: 0, y: -20 },
    metaSubgraph,
  };

  const extensionIn = createNodeFromDefinition(inputDefinition, 'ext_input', { x: -320, y: -50 }, { name: 'raw_val' });
  const extensionOffset = createNodeFromDefinition(inputDefinition, 'ext_offset', { x: -320, y: 50 }, { name: 'bias' });
  const extensionScale = createNodeFromDefinition(inputDefinition, 'ext_scale', { x: -320, y: 150 }, { name: 'gain' });
  const extensionOut = createNodeFromDefinition(
    outputDefinition,
    'ext_output',
    { x: 340, y: 0 },
    { name: 'transformed' },
  );

  const graph: FlintNodeGraph = {
    id: 'meta_nodes_pipeline',
    name: 'MetaNodesPipeline',
    nodes: [extensionIn, extensionOffset, extensionScale, metaNode, extensionOut],
    edges: [
      {
        id: 'e1',
        fromNodeId: 'ext_input',
        fromPortId: 'value',
        toNodeId: 'meta_transform_1',
        toPortId: 'input_x',
      },
      {
        id: 'e2',
        fromNodeId: 'ext_offset',
        fromPortId: 'value',
        toNodeId: 'meta_transform_1',
        toPortId: 'input_offset',
      },
      {
        id: 'e3',
        fromNodeId: 'ext_scale',
        fromPortId: 'value',
        toNodeId: 'meta_transform_1',
        toPortId: 'input_scale',
      },
      {
        id: 'e4',
        fromNodeId: 'meta_transform_1',
        fromPortId: 'output_val',
        toNodeId: 'ext_output',
        toPortId: 'value',
      },
    ],
  };

  return new FlintEditorStore(graph);
}

/**
 * Creates an editor store initialized with a 10,000 node stress test benchmark graph.
 */
function create10kStressTestStore(): FlintEditorStore {
  const addDefinition = getStoryNodeDefinition('add');
  const nodeCount = 10_000;
  const nodes = [];
  const edges: FlintGraphEdge[] = [];

  const columns = 100;
  for (let index = 0; index < nodeCount; index++) {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = col * 240;
    const y = row * 180;
    const nodeId = `bench_node_${index}`;
    nodes.push(createNodeFromDefinition(addDefinition, nodeId, { x, y }));

    if (col > 0) {
      const previousId = `bench_node_${index - 1}`;
      edges.push({
        id: `bench_edge_${index}`,
        fromNodeId: previousId,
        fromPortId: 'result',
        toNodeId: nodeId,
        toPortId: 'a',
      });
    }
  }

  const graph: FlintNodeGraph = {
    id: 'benchmark_10k',
    name: 'Benchmark10kNodes',
    nodes,
    edges,
  };

  return new FlintEditorStore(graph);
}

/**
 * Creates an editor store initialized with Unicode math symbols and Greek characters.
 */
function createUtf8TypographyStore(): FlintEditorStore {
  const inputDefinition = getStoryNodeDefinition('input');
  const addDefinition = getStoryNodeDefinition('add');
  const multiplyDefinition = getStoryNodeDefinition('multiply');
  const constantDefinition = getStoryNodeDefinition('constant');
  const outputDefinition = getStoryNodeDefinition('output');

  const inAlpha = createNodeFromDefinition(inputDefinition, 'in_alpha', { x: 80, y: 120 }, { name: 'α_input' });
  inAlpha.title = 'Param α (Alpha)';
  inAlpha.operation = 'in_α';

  const inBeta = createNodeFromDefinition(inputDefinition, 'in_beta', { x: 80, y: 280 }, { name: 'β_input' });
  inBeta.title = 'Param β (Beta)';
  inBeta.operation = 'in_β';

  const mathSum = createNodeFromDefinition(addDefinition, 'math_sum', { x: 360, y: 160 });
  mathSum.title = 'f(x) = √x ± ∑y';
  mathSum.operation = 'sqrt_sum_±';

  const mathOmega = createNodeFromDefinition(multiplyDefinition, 'math_omega', { x: 620, y: 220 });
  mathOmega.title = 'Transform (α → β · Ω)';
  mathOmega.operation = 'scale_Ω';

  const constPi = createNodeFromDefinition(constantDefinition, 'const_pi', { x: 360, y: 340 }, { value: 3.141_59 });
  constPi.title = 'Constant π ≈ 3.14';
  constPi.operation = 'const_π';

  const outResult = createNodeFromDefinition(outputDefinition, 'out_result', { x: 900, y: 220 }, { name: 'out_✓' });
  outResult.title = '⚡ Result (100% ✓)';
  outResult.operation = 'out_⚡';

  const edges: readonly FlintGraphEdge[] = [
    { id: 'e1', fromNodeId: 'in_alpha', fromPortId: 'value', toNodeId: 'math_sum', toPortId: 'a' },
    { id: 'e2', fromNodeId: 'in_beta', fromPortId: 'value', toNodeId: 'math_sum', toPortId: 'b' },
    { id: 'e3', fromNodeId: 'math_sum', fromPortId: 'result', toNodeId: 'math_omega', toPortId: 'a' },
    { id: 'e4', fromNodeId: 'const_pi', fromPortId: 'value', toNodeId: 'math_omega', toPortId: 'b' },
    { id: 'e5', fromNodeId: 'math_omega', fromPortId: 'result', toNodeId: 'out_result', toPortId: 'value' },
  ];

  const graph: FlintNodeGraph = {
    id: 'utf8_typography_graph',
    name: 'UTF-8 Typography Graph',
    nodes: [inAlpha, inBeta, mathSum, constPi, mathOmega, outResult],
    edges,
  };

  return new FlintEditorStore(graph);
}

export const Default: Story = {
  render: () => {
    const store = createMathPipelineStore();
    return (
      <div style={storyWrapperStyle}>
        <ForgeFlintGraphEditor store={store} />
      </div>
    );
  },
};

export const WebGpuRenderer: Story = {
  render: () => {
    const store = createMathPipelineStore();
    return (
      <div style={storyWrapperStyle}>
        <div
          style={{
            padding: '8px 16px',
            background: 'var(--mp-editor-surface, #161b22)',
            borderBottom: '1px solid var(--mp-editor-border, #30363d)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ForgeBadge
              variant="primary"
              size="xs"
            >
              Renderer
            </ForgeBadge>
            <ForgeBadge
              variant="neutral"
              size="xs"
            >
              WebGPU Instanced Buffer Pipeline
            </ForgeBadge>
          </div>
          <ForgeButtonGroup
            size="xs"
            ariaLabel="Renderer controls"
          >
            <ForgeButton
              variant="primary"
              size="xs"
            >
              WebGPU
            </ForgeButton>
          </ForgeButtonGroup>
        </div>
        <ForgeFlintGraphEditor
          store={store}
          renderer="webgpu"
        />
      </div>
    );
  },
};

export const WebGlRenderer: Story = {
  render: () => {
    const store = createMathPipelineStore();
    return (
      <div style={storyWrapperStyle}>
        <div
          style={{
            padding: '8px 16px',
            background: 'var(--mp-editor-surface, #161b22)',
            borderBottom: '1px solid var(--mp-editor-border, #30363d)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ForgeBadge
              variant="secondary"
              size="xs"
            >
              Renderer
            </ForgeBadge>
            <ForgeBadge
              variant="neutral"
              size="xs"
            >
              WebGL 2.0 / 1.0 Pipeline
            </ForgeBadge>
          </div>
          <ForgeButtonGroup
            size="xs"
            ariaLabel="Renderer controls"
          >
            <ForgeButton
              variant="primary"
              size="xs"
            >
              WebGL
            </ForgeButton>
          </ForgeButtonGroup>
        </div>
        <ForgeFlintGraphEditor
          store={store}
          renderer="webgl"
        />
      </div>
    );
  },
};

export const Canvas2DRenderer: Story = {
  render: () => {
    const store = createMathPipelineStore();
    return (
      <div style={storyWrapperStyle}>
        <div
          style={{
            padding: '8px 16px',
            background: 'var(--mp-editor-surface, #161b22)',
            borderBottom: '1px solid var(--mp-editor-border, #30363d)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ForgeBadge
              variant="warning"
              size="xs"
            >
              Renderer
            </ForgeBadge>
            <ForgeBadge
              variant="neutral"
              size="xs"
            >
              2D Canvas Context Fallback
            </ForgeBadge>
          </div>
          <ForgeButtonGroup
            size="xs"
            ariaLabel="Renderer controls"
          >
            <ForgeButton
              variant="primary"
              size="xs"
            >
              Canvas2D
            </ForgeButton>
          </ForgeButtonGroup>
        </div>
        <ForgeFlintGraphEditor
          store={store}
          renderer="canvas2d"
        />
      </div>
    );
  },
};

export const Utf8SdfTypography: Story = {
  render: () => {
    const store = createUtf8TypographyStore();
    return (
      <div style={storyWrapperStyle}>
        <div
          style={{
            padding: '8px 16px',
            background: 'var(--mp-editor-surface, #161b22)',
            borderBottom: '1px solid var(--mp-editor-border, #30363d)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ForgeBadge
              variant="primary"
              size="xs"
            >
              SDF Typography
            </ForgeBadge>
            <ForgeBadge
              variant="success"
              size="xs"
            >
              UTF-8 / Math / Greek
            </ForgeBadge>
            <span style={{ fontSize: '12px', color: 'var(--mp-editor-text-secondary, #c9d1d9)' }}>
              157 distance-field glyphs: √, ±, ∑, ∏, ∫, ≠, ≤, ≥, →, ←, ⚡, ★, α, β, Ω, Δ, é, ö, ñ, ß
            </span>
          </div>
          <ForgeButtonGroup
            size="xs"
            ariaLabel="Actions"
          >
            <ForgeButton
              variant="secondary"
              size="xs"
              onClick={() => store.resetView()}
            >
              Reset Camera
            </ForgeButton>
          </ForgeButtonGroup>
        </div>
        <ForgeFlintGraphEditor store={store} />
      </div>
    );
  },
};

export const LightMode: Story = {
  render: () => {
    const store = createMathPipelineStore();
    return (
      <div
        style={storyWrapperStyle}
        data-theme="light"
      >
        <ForgeFlintGraphEditor
          store={store}
          theme="light"
        />
      </div>
    );
  },
};

export const DarkMode: Story = {
  render: () => {
    const store = createMathPipelineStore();
    return (
      <div
        style={storyWrapperStyle}
        data-theme="dark"
      >
        <ForgeFlintGraphEditor
          store={store}
          theme="dark"
        />
      </div>
    );
  },
};

export const StdlibCollections: Story = {
  render: () => {
    const store = createStdlibCollectionsStore();
    return (
      <div style={storyWrapperStyle}>
        <ForgeFlintGraphEditor store={store} />
      </div>
    );
  },
};

export const Grouping: Story = {
  render: () => {
    const store = createGroupingPipelineStore();
    return (
      <div style={storyWrapperStyle}>
        <ForgeFlintGraphEditor store={store} />
      </div>
    );
  },
};

export const MetaNodes: Story = {
  render: () => {
    const store = createMetaNodesStore();
    return (
      <div style={storyWrapperStyle}>
        <ForgeFlintGraphEditor store={store} />
      </div>
    );
  },
};

export const LiveTraceDebugger: Story = {
  render: () => {
    const store = createMathPipelineStore();
    const artifacts = compileNodeGraph(store.getState().graph);
    const sourceMap = artifacts.compilation?.sourceMap ?? artifacts.nodeSourceMap;

    const mockTrace: FlintTraceReport = {
      sessionId: 'trace_storybook_session',
      summary: {
        totalInstructions: 120,
        totalMemoryAllocations: 4,
        totalCapabilitiesInvoked: 0,
        trapped: false,
      },
      events: [
        {
          index: 0,
          timestampMs: 10,
          kind: 'call',
          name: 'evaluate',
          detail: 'args: a=3, b=4',
          sourceSpan: sourceMap?.nodeToSpan?.get('in_a'),
        },
        {
          index: 1,
          timestampMs: 25,
          kind: 'instruction',
          name: 'i32.add',
          detail: '7',
          sourceSpan: sourceMap?.nodeToSpan?.get('add_1'),
        },
        {
          index: 2,
          timestampMs: 40,
          kind: 'instruction',
          name: 'i32.mul',
          detail: '14',
          sourceSpan: sourceMap?.nodeToSpan?.get('mult_1'),
        },
        {
          index: 3,
          timestampMs: 55,
          kind: 'instruction',
          name: 'return',
          detail: 'result=14',
          sourceSpan: sourceMap?.nodeToSpan?.get('out_1'),
        },
      ],
      traps: [],
    };

    if (sourceMap) {
      store.getTraceController().loadTrace(mockTrace, sourceMap);
    }

    return (
      <div style={storyWrapperStyle}>
        <div style={{ flex: 1, position: 'relative' }}>
          <ForgeFlintGraphEditor store={store} />
        </div>
        <ForgeDebugScrubber controller={store.getTraceController()} />
      </div>
    );
  },
};

export const PerformanceStressTest10k: Story = {
  render: () => {
    const store = create10kStressTestStore();
    return (
      <div style={storyWrapperStyle}>
        <ForgeFlintGraphEditor store={store} />
      </div>
    );
  },
};

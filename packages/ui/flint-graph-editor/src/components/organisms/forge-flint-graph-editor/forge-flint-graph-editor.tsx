import { getAllNodeDefinitions, getNodeDefinition } from '@mission-platform/flint';
import { classNames, useEffect, useRef, useState, type MpElement } from '@mission-platform/forge-jsx';

import { FlintEditorStore, type FlintEditorStoreState } from '../../../editor/editor-store';
import { FlintRenderEngine } from '../../../renderer/render-worker';
import { ForgeDebugScrubber } from '../../molecules/forge-debug-scrubber';

import styles from './forge-flint-graph-editor.module.scss';

import type { FlintGraphNode, FlintNodeCategory } from '@mission-platform/flint';

export interface FlintGraphEditorProperties {
  readonly store?: FlintEditorStore;
  readonly className?: string;
}

const CATEGORIES: readonly FlintNodeCategory[] = ['math', 'logic', 'text', 'collection', 'control', 'capability'];

interface ContextMenuState {
  readonly open: boolean;
  readonly x: number;
  readonly y: number;
  readonly worldX: number;
  readonly worldY: number;
  readonly query: string;
}

/**
 * Framework-neutral Forge component for the Flint visual node graph editor.
 * Authors interactive dataflow programs, renders instanced WebGPU primitives,
 * and compiles natively to WebAssembly.
 */
export function ForgeFlintGraphEditor(properties: Readonly<FlintGraphEditorProperties>): MpElement {
  const storeReference = useRef<FlintEditorStore>(properties.store ?? new FlintEditorStore());
  const store = storeReference.current;

  const canvasReference = useRef<HTMLCanvasElement | undefined>(undefined);
  const engineReference = useRef<FlintRenderEngine | undefined>(undefined);

  const [editorState, setEditorState] = useState<FlintEditorStoreState>(store.getState());
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportedSource, setExportedSource] = useState('');
  const [fps, setFps] = useState(60);
  const [isFallback, setIsFallback] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    worldX: 0,
    worldY: 0,
    query: '',
  });

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setEditorState(newState);
      if (engineReference.current) {
        engineReference.current.setGraph(newState.graph.nodes, newState.graph.edges, newState.graph.groups ?? []);
        engineReference.current.setSelection(newState.selectedNodeIds);
      }
    });

    let resizeObserver: ResizeObserver | undefined;
    let cleanupListeners: (() => void) | undefined;

    if (canvasReference.current) {
      const canvasElement = canvasReference.current;
      const rect = canvasElement.getBoundingClientRect();
      const width = Math.max(rect.width, 800);
      const height = Math.max(rect.height, 600);

      const engine = new FlintRenderEngine(width, height, (message) => {
        switch (message.type) {
          case 'frame': {
            if (message.fps !== undefined) {
              setFps(message.fps);
            }
            break;
          }
          case 'ready': {
            if (message.supported === false) {
              setIsFallback(true);
            }
            break;
          }
          case 'hit_result': {
            if (message.hit?.type === 'node') {
              store.selectNode(message.hit.nodeId);
            } else if (!message.hit) {
              store.deselectAll();
            }
            break;
          }
        }
      });

      engineReference.current = engine;
      void engine.initialize(canvasElement).then(() => {
        engine.setGraph(
          store.getState().graph.nodes,
          store.getState().graph.edges,
          store.getState().graph.groups ?? [],
        );
      });

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const contentRect = entry.contentRect;
            if (contentRect.width > 0 && contentRect.height > 0) {
              engine.resize(contentRect.width, contentRect.height);
            }
          }
        });
        resizeObserver.observe(canvasElement);
      }

      let isPointerDown = false;
      let dragMode: 'pan' | 'node' | 'connect' | 'none' = 'none';
      let draggedNodeId: string | undefined;
      let connectingSourceNodeId = '';
      let connectingSourcePortId = '';
      let nodeStartPosition = { x: 0, y: 0 };
      let dragStartScreen = { x: 0, y: 0 };

      const onWheel = (event: WheelEvent): void => {
        event.preventDefault();
        const factor = event.deltaY < 0 ? 1.1 : 0.9;
        engine.zoom(event.offsetX, event.offsetY, factor);
      };

      const onPointerDown = (event: PointerEvent): void => {
        if (event.button !== 0) return;
        setContextMenu((previous) => (previous.open ? { ...previous, open: false } : previous));
        isPointerDown = true;
        dragStartScreen = { x: event.clientX, y: event.clientY };
        try {
          canvasElement.setPointerCapture(event.pointerId);
        } catch {
          // pointer capture optional
        }

        const hit = engine.hitTestSync(event.offsetX, event.offsetY);
        if (hit?.type === 'port') {
          dragMode = 'connect';
          connectingSourceNodeId = hit.nodeId;
          connectingSourcePortId = hit.portId!;
          store.startConnecting(hit.nodeId, hit.portId!, hit.worldX, hit.worldY);
          engine.setConnectingEdge({
            fromNodeId: hit.nodeId,
            fromPortId: hit.portId!,
            cursorX: hit.worldX,
            cursorY: hit.worldY,
          });
        } else if (hit?.type === 'node') {
          dragMode = 'node';
          draggedNodeId = hit.nodeId;
          store.selectNode(hit.nodeId);
          const foundNode = store.getState().graph.nodes.find((nodeItem) => nodeItem.id === hit.nodeId);
          nodeStartPosition = foundNode ? { ...foundNode.position } : { x: 0, y: 0 };
        } else {
          dragMode = 'pan';
          draggedNodeId = undefined;
          store.deselectAll();
        }
      };

      const onPointerMove = (event: PointerEvent): void => {
        if (!isPointerDown) return;
        const camera = engine.getCamera();
        const deltaX = event.clientX - dragStartScreen.x;
        const deltaY = event.clientY - dragStartScreen.y;

        if (dragMode === 'connect') {
          const { x: worldX, y: worldY } = engine.screenToWorld(event.offsetX, event.offsetY);
          store.updateConnectingCursor(worldX, worldY);
          engine.setConnectingEdge({
            fromNodeId: connectingSourceNodeId,
            fromPortId: connectingSourcePortId,
            cursorX: worldX,
            cursorY: worldY,
          });
          const hoverHit = engine.hitTestSync(event.offsetX, event.offsetY, 16);
          if (hoverHit?.type === 'port' && hoverHit.nodeId !== connectingSourceNodeId && hoverHit.portId) {
            engine.setHoveredPort({
              nodeId: hoverHit.nodeId,
              portId: hoverHit.portId,
            });
          } else {
            engine.setHoveredPort(undefined);
          }
          engine.renderFrame();
        } else if (dragMode === 'node' && draggedNodeId) {
          const worldDeltaX = deltaX / camera.zoom;
          const worldDeltaY = deltaY / camera.zoom;
          store.moveNode(draggedNodeId, {
            x: Math.round(nodeStartPosition.x + worldDeltaX),
            y: Math.round(nodeStartPosition.y + worldDeltaY),
          });
          engine.renderFrame();
        } else if (dragMode === 'pan') {
          dragStartScreen = { x: event.clientX, y: event.clientY };
          engine.pan(deltaX, deltaY);
          engine.renderFrame();
        }
      };

      const onPointerUp = (event: PointerEvent): void => {
        if (!isPointerDown) return;
        isPointerDown = false;
        try {
          canvasElement.releasePointerCapture(event.pointerId);
        } catch {
          // ignore release error
        }

        if (dragMode === 'connect') {
          const targetHit = engine.hitTestSync(event.offsetX, event.offsetY, 18);
          if (targetHit?.type === 'port' && targetHit.nodeId !== connectingSourceNodeId && targetHit.portId) {
            store.connectPorts(connectingSourceNodeId, connectingSourcePortId, targetHit.nodeId, targetHit.portId);
          }
          store.cancelConnecting();
          engine.setConnectingEdge(undefined);
          engine.setHoveredPort(undefined);
          engine.renderFrame();
        } else if (dragMode === 'node') {
          store.commitNodeMove();
          engine.renderFrame();
        }
        dragMode = 'none';
        draggedNodeId = undefined;
      };

      const onContextMenu = (event: MouseEvent): void => {
        event.preventDefault();
        const canvasRect = canvasElement.getBoundingClientRect();
        const screenX = event.clientX - canvasRect.left;
        const screenY = event.clientY - canvasRect.top;
        const world = engine.screenToWorld(screenX, screenY);
        const windowWidth = globalThis.window ? window.innerWidth : 1200;
        const windowHeight = globalThis.window ? window.innerHeight : 800;
        setContextMenu({
          open: true,
          x: Math.min(event.clientX, windowWidth - 260),
          y: Math.min(event.clientY, windowHeight - 380),
          worldX: world.x,
          worldY: world.y,
          query: '',
        });
      };

      canvasElement.addEventListener('wheel', onWheel, { passive: false });
      canvasElement.addEventListener('pointerdown', onPointerDown);
      canvasElement.addEventListener('pointermove', onPointerMove);
      canvasElement.addEventListener('pointerup', onPointerUp);
      canvasElement.addEventListener('pointercancel', onPointerUp);
      canvasElement.addEventListener('contextmenu', onContextMenu);

      cleanupListeners = () => {
        canvasElement.removeEventListener('wheel', onWheel);
        canvasElement.removeEventListener('pointerdown', onPointerDown);
        canvasElement.removeEventListener('pointermove', onPointerMove);
        canvasElement.removeEventListener('pointerup', onPointerUp);
        canvasElement.removeEventListener('pointercancel', onPointerUp);
        canvasElement.removeEventListener('contextmenu', onContextMenu);
      };
    }

    return () => {
      unsubscribe();
      resizeObserver?.disconnect();
      cleanupListeners?.();
      if (engineReference.current) {
        engineReference.current.destroy();
        engineReference.current = undefined;
      }
    };
  }, []);

  const query = searchQuery.toLowerCase().trim();
  const allDefinitions = getAllNodeDefinitions();
  const filteredDefinitions = query
    ? allDefinitions.filter(
        (definition) =>
          definition.title.toLowerCase().includes(query) ||
          definition.operation.toLowerCase().includes(query) ||
          definition.description.toLowerCase().includes(query),
      )
    : allDefinitions;

  const selectedNodeId = editorState.selectedNodeIds[0];
  const selectedNode: FlintGraphNode | undefined = selectedNodeId
    ? editorState.graph.nodes.find((node) => node.id === selectedNodeId)
    : undefined;

  const selectedDefinition = selectedNode ? getNodeDefinition(selectedNode.operation) : undefined;

  const handleAddNode = (operation: string): void => {
    const center = engineReference.current?.getCamera();
    const position = center ? { x: Math.round(center.x), y: Math.round(center.y) } : { x: 0, y: 0 };
    store.addNode(operation, position);
  };

  const handleExport = (): void => {
    const artifacts = store.exportArtifacts();
    if (artifacts.type === 'export_result') {
      setExportedSource(artifacts.source);
      setShowExportModal(true);
    }
  };

  const handleRun = (): void => {
    void store.runGraph();
  };

  const populatedCategories = CATEGORIES.map((category) => ({
    category,
    definitions: filteredDefinitions.filter((item) => item.category === category),
  })).filter((group) => group.definitions.length > 0);

  const outputEntries = Object.entries(editorState.lastOutputs);

  return (
    <div className={classNames(styles.editorContainer, properties.className)}>
      {/* Top Application Toolbar */}
      <header className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <span
            style={{
              fontWeight: 700,
              fontSize: '14px',
              letterSpacing: '0.02em',
            }}
          >
            Flint Node Graph
          </span>
          <button
            type="button"
            className={classNames(styles.btn, styles.btnPrimary)}
            onClick={handleRun}
            disabled={editorState.isExecuting}
          >
            {editorState.isExecuting ? 'Running...' : 'Run Wasm'}
          </button>
          <button
            type="button"
            className={styles.btn}
            onClick={handleExport}
          >
            Export Flint
          </button>
          <button
            type="button"
            className={styles.btn}
            disabled={!editorState.canUndo}
            onClick={() => store.undo()}
          >
            Undo
          </button>
          <button
            type="button"
            className={styles.btn}
            disabled={!editorState.canRedo}
            onClick={() => store.redo()}
          >
            Redo
          </button>
          <button
            type="button"
            className={styles.btn}
            disabled={editorState.selectedNodeIds.length === 0}
            onClick={() => store.groupSelectedNodes()}
          >
            Group
          </button>
          <button
            type="button"
            className={styles.btn}
            disabled={editorState.selectedNodeIds.length === 0}
            onClick={() => store.createMetaNodeFromSelected()}
          >
            Create Meta
          </button>
          <button
            type="button"
            className={styles.btn}
            disabled={
              !editorState.selectedNodeIds.some((id) => editorState.graph.nodes.find((node) => node.id === id)?.groupId)
            }
            onClick={() => store.ungroupSelected()}
          >
            Ungroup
          </button>
          <button
            type="button"
            className={styles.btn}
            disabled={editorState.selectedNodeIds.length === 0 && !editorState.activeEdgeId}
            onClick={() => store.deleteSelected()}
          >
            Delete
          </button>
        </div>

        <div className={styles.toolbarGroup}>
          <span
            style={{
              color: editorState.validation.valid ? '#3fb950' : '#f85149',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {editorState.validation.valid ? '● Valid DAG' : `● ${editorState.validation.issues.length} Issues`}
          </span>
          <span
            style={{
              fontSize: '11px',
              color: isFallback ? '#d29922' : '#58a6ff',
              marginLeft: '8px',
              fontWeight: 600,
            }}
          >
            {isFallback ? '2D Canvas' : 'WebGPU'}
          </span>
          <span style={{ fontSize: '11px', color: '#8b949e', marginLeft: '12px' }}>
            {fps} FPS | {editorState.graph.nodes.length} Nodes
          </span>
        </div>
      </header>

      {/* Main Workspace */}
      <div className={styles.mainArea}>
        {/* Left Node Palette Drawer */}
        <aside className={styles.paletteDrawer}>
          <div className={styles.paletteHeader}>
            <input
              type="text"
              aria-label="Search node palette"
              placeholder="Search operations..."
              className={styles.paletteSearch}
              value={searchQuery}
              onInput={(event: unknown) => {
                if (
                  typeof HTMLInputElement !== 'undefined' &&
                  event &&
                  typeof event === 'object' &&
                  'target' in event &&
                  event.target instanceof HTMLInputElement
                ) {
                  setSearchQuery(event.target.value);
                }
              }}
            />
          </div>

          <div className={styles.paletteList}>
            {populatedCategories.map((group) => (
              <div key={group.category}>
                <div className={styles.paletteCategory}>{group.category}</div>
                {group.definitions.map((item) => (
                  <button
                    key={item.operation}
                    type="button"
                    draggable={true}
                    className={styles.paletteItem}
                    onClick={() => handleAddNode(item.operation)}
                    onDragStart={(event: unknown) => {
                      if (typeof DragEvent !== 'undefined' && event instanceof DragEvent && event.dataTransfer) {
                        event.dataTransfer.setData('text/plain', item.operation);
                        event.dataTransfer.effectAllowed = 'copy';
                      }
                    }}
                  >
                    <span className={styles.paletteItemTitle}>{item.title}</span>
                    <span className={styles.paletteItemDesc}>{item.description}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* Center WebGPU Canvas */}
        <main
          className={styles.canvasContainer}
          onDragOver={(event: unknown) => {
            if (typeof DragEvent !== 'undefined' && event instanceof DragEvent) {
              event.preventDefault();
              if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'copy';
              }
            }
          }}
          onDrop={(event: unknown) => {
            if (typeof DragEvent !== 'undefined' && event instanceof DragEvent && event.dataTransfer) {
              event.preventDefault();
              const op = event.dataTransfer.getData('text/plain');
              if (op && engineReference.current && canvasReference.current) {
                const rect = canvasReference.current.getBoundingClientRect();
                const world = engineReference.current.screenToWorld(
                  event.clientX - rect.left,
                  event.clientY - rect.top,
                );
                store.addNode(op, world);
              }
            }
          }}
        >
          {isFallback && (
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(210, 153, 34, 0.15)',
                border: '1px solid #d29922',
                color: '#f0f6fc',
                fontSize: '11px',
                padding: '4px 12px',
                borderRadius: '16px',
                zIndex: 20,
                pointerEvents: 'none',
              }}
            >
              ⚠ WebGPU not available in this environment. Operating in 2D Canvas fallback mode.
            </div>
          )}
          <canvas
            ref={canvasReference}
            className={styles.canvas}
          />
        </main>

        {/* Right Property & Output Inspector */}
        <aside className={styles.inspectorDrawer}>
          <div className={styles.inspectorSection}>
            <div className={styles.inspectorTitle}>Inspector</div>
            {selectedNode ? (
              <div>
                <div className={styles.inspectorRow}>
                  <label
                    htmlFor="inspector-node-title"
                    className={styles.inspectorLabel}
                  >
                    Title
                  </label>
                  <input
                    id="inspector-node-title"
                    value={selectedNode.title}
                    type="text"
                    aria-label="Node Title"
                    className={styles.inspectorInput}
                    onInput={(event: unknown) => {
                      if (
                        typeof HTMLInputElement !== 'undefined' &&
                        event &&
                        typeof event === 'object' &&
                        'target' in event &&
                        event.target instanceof HTMLInputElement
                      ) {
                        store.renameNode(selectedNode.id, event.target.value);
                      }
                    }}
                  />
                </div>
                <div className={styles.inspectorRow}>
                  <label
                    htmlFor="inspector-node-op"
                    className={styles.inspectorLabel}
                  >
                    Operation
                  </label>
                  <input
                    id="inspector-node-op"
                    value={selectedNode.operation}
                    type="text"
                    aria-label="Node Operation"
                    className={styles.inspectorInput}
                    readOnly
                  />
                </div>
                <div className={styles.inspectorRow}>
                  <label
                    htmlFor="inspector-node-cat"
                    className={styles.inspectorLabel}
                  >
                    Category
                  </label>
                  <input
                    id="inspector-node-cat"
                    value={selectedNode.category}
                    type="text"
                    aria-label="Node Category"
                    className={styles.inspectorInput}
                    readOnly
                  />
                </div>

                {/* Node Documentation */}
                {selectedDefinition && <div className={styles.docBlock}>{selectedDefinition.description}</div>}

                {/* Meta Node Subgraph Info */}
                {selectedNode.metaSubgraph && (
                  <div
                    className={styles.docBlock}
                    style={{ borderLeftColor: '#79c0ff' }}
                  >
                    <strong>Composite Meta Node:</strong> Contains {selectedNode.metaSubgraph.nodes.length} internal
                    nodes and {selectedNode.metaSubgraph.edges.length} connections.
                    <button
                      type="button"
                      className={styles.btn}
                      style={{ marginTop: '8px', width: '100%' }}
                      onClick={() => store.expandMetaNode(selectedNode.id)}
                    >
                      Expand / Unpack Meta Node
                    </button>
                  </div>
                )}

                {/* Input Pins Table */}
                {selectedNode.inputs.length > 0 && (
                  <div>
                    <span
                      className={styles.inspectorLabel}
                      style={{ fontWeight: 600 }}
                    >
                      Input Pins
                    </span>
                    <div className={styles.portTable}>
                      {selectedNode.inputs.map((port) => (
                        <div
                          key={port.id}
                          className={styles.portTableRow}
                        >
                          <span>{port.name}</span>
                          <span className={styles.portBadge}>{port.type.reference ?? port.type.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Output Pins Table */}
                {selectedNode.outputs.length > 0 && (
                  <div>
                    <span
                      className={styles.inspectorLabel}
                      style={{ fontWeight: 600 }}
                    >
                      Output Pins
                    </span>
                    <div className={styles.portTable}>
                      {selectedNode.outputs.map((port) => (
                        <div
                          key={port.id}
                          className={styles.portTableRow}
                        >
                          <span>{port.name}</span>
                          <span className={styles.portBadgeOut}>{port.type.reference ?? port.type.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Property Values Editor */}
                {selectedNode.properties?.value !== undefined && (
                  <div className={styles.inspectorRow}>
                    <label
                      htmlFor="inspector-prop-val"
                      className={styles.inspectorLabel}
                    >
                      Value
                    </label>
                    <input
                      id="inspector-prop-val"
                      type="number"
                      aria-label="Literal Value"
                      className={styles.inspectorInput}
                      value={String(selectedNode.properties.value)}
                      onInput={(event: unknown) => {
                        if (
                          typeof HTMLInputElement !== 'undefined' &&
                          event &&
                          typeof event === 'object' &&
                          'target' in event &&
                          event.target instanceof HTMLInputElement
                        ) {
                          const numberValue = Number(event.target.value);
                          store.updateNodeProperty(
                            selectedNode.id,
                            'value',
                            Number.isNaN(numberValue) ? 0 : numberValue,
                          );
                        }
                      }}
                    />
                  </div>
                )}

                {selectedNode.properties?.name !== undefined && (
                  <div className={styles.inspectorRow}>
                    <label
                      htmlFor="inspector-prop-name"
                      className={styles.inspectorLabel}
                    >
                      Parameter Name
                    </label>
                    <input
                      id="inspector-prop-name"
                      type="text"
                      aria-label="Parameter Name"
                      className={styles.inspectorInput}
                      value={String(selectedNode.properties.name)}
                      onInput={(event: unknown) => {
                        if (
                          typeof HTMLInputElement !== 'undefined' &&
                          event &&
                          typeof event === 'object' &&
                          'target' in event &&
                          event.target instanceof HTMLInputElement
                        ) {
                          store.updateNodeProperty(selectedNode.id, 'name', event.target.value);
                        }
                      }}
                    />
                  </div>
                )}

                <div className={styles.inspectorRow}>
                  <span className={styles.inspectorLabel}>Position</span>
                  <span style={{ fontSize: '12px' }}>
                    X: {Math.round(selectedNode.position.x)}, Y: {Math.round(selectedNode.position.y)}
                  </span>
                </div>

                <button
                  type="button"
                  className={styles.paletteItem}
                  style={{
                    marginTop: '12px',
                    borderColor: '#f85149',
                    color: '#f85149',
                  }}
                  onClick={() => store.removeNode(selectedNode.id)}
                >
                  Delete Node
                </button>
              </div>
            ) : (
              <div style={{ color: '#8b949e', fontSize: '12px' }}>
                Select a node on canvas to view and configure properties.
              </div>
            )}
          </div>

          {/* Execution Results Panel */}
          <div
            className={styles.inspectorSection}
            style={{ borderTop: '1px solid #30363d', paddingTop: '12px' }}
          >
            <div className={styles.inspectorTitle}>Execution Output</div>
            {editorState.lastError ? (
              <div style={{ color: '#f85149', fontSize: '12px' }}>{editorState.lastError}</div>
            ) : outputEntries.length > 0 ? (
              <div>
                {outputEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className={styles.inspectorRow}
                  >
                    <span className={styles.inspectorLabel}>{key}</span>
                    <span
                      style={{
                        fontSize: '13px',
                        color: '#3fb950',
                        fontFamily: 'monospace',
                      }}
                    >
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#8b949e', fontSize: '12px' }}>
                Click &quot;Run Wasm&quot; to compile and execute graph.
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Floating Right-Click Context Menu */}
      {contextMenu.open && (
        <div
          role="dialog"
          aria-label="Add Node Context Menu"
          className={styles.contextMenu}
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
        >
          <div className={styles.contextMenuHeader}>
            <input
              type="text"
              placeholder="Search node..."
              className={styles.contextMenuSearch}
              value={contextMenu.query}
              onInput={(event: unknown) => {
                if (
                  typeof HTMLInputElement !== 'undefined' &&
                  event &&
                  typeof event === 'object' &&
                  'target' in event &&
                  event.target instanceof HTMLInputElement
                ) {
                  setContextMenu({ ...contextMenu, query: event.target.value });
                }
              }}
            />
          </div>
          {editorState.selectedNodeIds.length > 0 && (
            <div className={styles.contextMenuActions}>
              <button
                type="button"
                className={styles.contextMenuItem}
                onClick={() => {
                  store.groupSelectedNodes();
                  setContextMenu({ ...contextMenu, open: false });
                }}
              >
                Group Selected ({editorState.selectedNodeIds.length})
              </button>
              <button
                type="button"
                className={styles.contextMenuItem}
                onClick={() => {
                  store.createMetaNodeFromSelected();
                  setContextMenu({ ...contextMenu, open: false });
                }}
              >
                Create Meta Node
              </button>
              {selectedNode?.metaSubgraph && (
                <button
                  type="button"
                  className={styles.contextMenuItem}
                  onClick={() => {
                    store.expandMetaNode(selectedNode.id);
                    setContextMenu({ ...contextMenu, open: false });
                  }}
                >
                  Expand Meta Node
                </button>
              )}
              <button
                type="button"
                className={styles.contextMenuItem}
                style={{ color: '#f85149' }}
                onClick={() => {
                  store.deleteSelected();
                  setContextMenu({ ...contextMenu, open: false });
                }}
              >
                Delete Selected
              </button>
            </div>
          )}
          <div className={styles.contextMenuList}>
            {allDefinitions
              .filter(
                (definition) =>
                  !contextMenu.query ||
                  definition.title.toLowerCase().includes(contextMenu.query.toLowerCase()) ||
                  definition.operation.toLowerCase().includes(contextMenu.query.toLowerCase()),
              )
              .map((item) => (
                <button
                  key={item.operation}
                  type="button"
                  className={styles.contextMenuItem}
                  onClick={() => {
                    store.addNode(item.operation, {
                      x: contextMenu.worldX,
                      y: contextMenu.worldY,
                    });
                    setContextMenu({ ...contextMenu, open: false });
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{item.title}</span>
                  <span style={{ fontSize: '10px', color: '#8b949e' }}>{item.description}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Bottom Trace Debugger Bar */}
      <ForgeDebugScrubber controller={store.getTraceController()} />

      {/* Code Export Dialog Modal */}
      {showExportModal && (
        <div
          role="dialog"
          aria-modal="true"
          className={styles.modalOverlay}
          onClick={() => setShowExportModal(false)}
        >
          <div
            className={styles.modalCard}
            onClick={(event: unknown) => {
              if (typeof MouseEvent !== 'undefined' && event instanceof MouseEvent) {
                event.stopPropagation();
              }
            }}
          >
            <div className={styles.modalHeader}>
              <span
                className={styles.inspectorTitle}
                style={{ margin: 0 }}
              >
                Generated Flint Source
              </span>
              <button
                type="button"
                className={styles.paletteItem}
                style={{ padding: '4px 8px' }}
                onClick={() => setShowExportModal(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <pre className={styles.codeBlock}>
                <code>{exportedSource}</code>
              </pre>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={classNames(styles.btn, styles.btnPrimary)}
                onClick={() => setShowExportModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

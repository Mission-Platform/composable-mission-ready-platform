<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';

  import { copyForgeFile, downloadForgeFile, fileForPath, fileText, sendBundleToBridge } from './delivery';
  import {
    type ForgeBridgeConfig,
    type ForgePluginMainMessage,
    type ForgePluginUiMessage,
    unwrapForgePluginMessage,
  } from './messages';

  import type { ForgeDiagnostic, ForgeExportBundle, ForgeExportFile } from '@mission-platform/forge-figma';
  import type { ForgeBridgeFileResult } from '@mission-platform/forge-figma-bridge/protocol';

  const selectionCount = ref(0);
  const selectionError = ref('');
  const bundle = ref<ForgeExportBundle>();
  const selectedPath = ref('');
  const statusMessage = ref('Select one frame or component to begin.');
  const statusKind = ref<'info' | 'success' | 'error'>('info');
  const isConverting = ref(false);
  const isExporting = ref(false);
  const overwrite = ref(false);
  const diagnostics = ref<readonly ForgeDiagnostic[]>([]);
  const bridgeResults = ref<readonly ForgeBridgeFileResult[]>([]);
  const bridgeConfig = reactive<ForgeBridgeConfig>({
    bridgeUrl: 'http://127.0.0.1:8787/export',
    repositoryRootId: '',
    targetDirectory: '',
  });

  const files = computed(() => bundle.value?.files ?? []);
  const selectedFile = computed(() => (bundle.value ? fileForPath(bundle.value, selectedPath.value) : undefined));
  const selectedSource = computed(() => {
    const file = selectedFile.value;
    if (!file) return '';
    const content = fileText(file);
    return (
      content ?? `[Binary asset: ${file.path}, ${typeof file.content === 'string' ? 0 : file.content.byteLength} bytes]`
    );
  });
  const canConvert = computed(() => selectionCount.value === 1 && !isConverting.value);
  const canExport = computed(
    () =>
      Boolean(bundle.value) &&
      Boolean(bridgeConfig.bridgeUrl && bridgeConfig.repositoryRootId && bridgeConfig.targetDirectory) &&
      !isExporting.value,
  );

  function send(message: ForgePluginUiMessage): void {
    window.parent.postMessage({ pluginMessage: message }, '*');
  }

  function setStatus(message: string, kind: 'info' | 'success' | 'error' = 'info'): void {
    statusMessage.value = message;
    statusKind.value = kind;
  }

  function handleMainMessage(event: MessageEvent<unknown>): void {
    const message = unwrapForgePluginMessage(event.data);
    if (!isMainMessage(message)) return;
    if (message.type === 'selection-status') {
      selectionCount.value = message.selectionCount;
      if (message.selectionCount !== 1) {
        setStatus(message.selectionCount === 0 ? 'Select one frame or component to begin.' : 'Select only one layer.');
      }
      return;
    }
    if (message.type === 'conversion-result') {
      isConverting.value = false;
      if (message.error || !message.bundle) {
        bundle.value = undefined;
        diagnostics.value = [];
        selectionError.value = message.error ?? 'Conversion did not produce a bundle.';
        setStatus(selectionError.value, 'error');
        return;
      }
      bundle.value = message.bundle;
      diagnostics.value = message.bundle.diagnostics;
      bridgeResults.value = [];
      selectedPath.value =
        message.bundle.files.find((file) => file.kind === 'tsx')?.path ?? message.bundle.files[0]?.path ?? '';
      selectionError.value = '';
      setStatus(
        `Generated ${message.bundle.files.length} artifact${message.bundle.files.length === 1 ? '' : 's'}.`,
        'success',
      );
      return;
    }
    if (message.type === 'bridge-config' || message.type === 'bridge-config-saved') {
      Object.assign(bridgeConfig, message.config);
      if (message.type === 'bridge-config-saved') setStatus('Bridge configuration saved.', 'success');
    }
  }

  function isMainMessage(message: unknown): message is ForgePluginMainMessage {
    if (typeof message !== 'object' || message === null || !('type' in message)) return false;
    const type = message.type;
    return (
      type === 'selection-status' ||
      type === 'conversion-result' ||
      type === 'bridge-config' ||
      type === 'bridge-config-saved'
    );
  }

  function convert(): void {
    if (!canConvert.value) return;
    isConverting.value = true;
    selectionError.value = '';
    setStatus('Converting selection…');
    send({ type: 'convert' });
  }

  async function copySelected(): Promise<void> {
    const file = selectedFile.value;
    if (!file || !navigator.clipboard) {
      setStatus('Clipboard access is unavailable for this artifact.', 'error');
      return;
    }
    try {
      await copyForgeFile(file, navigator.clipboard);
      setStatus(`Copied ${file.path}.`, 'success');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Copy failed.', 'error');
    }
  }

  function download(file: ForgeExportFile): void {
    try {
      downloadForgeFile(file);
      setStatus(`Downloaded ${file.path}.`, 'success');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Download failed.', 'error');
    }
  }

  async function exportBundle(): Promise<void> {
    if (!bundle.value || !canExport.value) return;
    if (!window.confirm(`Send the reviewed ${bundle.value.componentName} bundle to the configured repository bridge?`))
      return;
    isExporting.value = true;
    bridgeResults.value = [];
    setStatus('Sending reviewed bundle to the repository bridge…');
    try {
      const result = await sendBundleToBridge(bridgeConfig, bundle.value, overwrite.value);
      bridgeResults.value = result.results;
      if (result.ok) setStatus('Repository export accepted.', 'success');
      else setStatus(result.error ?? 'Repository export completed with rejected files.', 'error');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Repository export failed.', 'error');
    } finally {
      isExporting.value = false;
    }
  }

  function saveBridgeConfig(): void {
    send({ type: 'set-bridge-config', config: { ...bridgeConfig } });
  }

  onMounted(() => {
    window.addEventListener('message', handleMainMessage);
    send({ type: 'get-bridge-config' });
    send({ type: 'request-selection-status' });
  });

  onBeforeUnmount(() => window.removeEventListener('message', handleMainMessage));
</script>

<template>
  <main class="plugin-shell">
    <header class="plugin-header">
      <div>
        <p class="eyebrow">Mission Platform</p>
        <h1>Forge JSX generator</h1>
      </div>
      <span class="selection-count">{{ selectionCount }} selected</span>
    </header>

    <section
      class="conversion-panel"
      aria-labelledby="conversion-heading"
    >
      <h2 id="conversion-heading">Convert selection</h2>
      <p
        class="status"
        :class="`status-${statusKind}`"
        role="status"
      >
        {{ statusMessage }}
      </p>
      <p
        v-if="selectionError"
        class="error"
        role="alert"
      >
        {{ selectionError }}
      </p>
      <button
        type="button"
        :disabled="!canConvert"
        @click="convert"
      >
        {{ isConverting ? 'Converting…' : 'Convert selected layer' }}
      </button>
    </section>

    <section
      v-if="bundle"
      class="bundle-panel"
      aria-labelledby="bundle-heading"
    >
      <div class="section-heading">
        <div>
          <p class="eyebrow">Reviewed artifact bundle</p>
          <h2 id="bundle-heading">{{ bundle.componentName }}</h2>
        </div>
        <button
          type="button"
          class="secondary"
          :disabled="!selectedFile"
          @click="copySelected"
        >
          Copy
        </button>
      </div>
      <nav
        class="file-tabs"
        aria-label="Generated files"
      >
        <button
          v-for="file in files"
          :key="file.path"
          type="button"
          :class="{ active: selectedPath === file.path }"
          @click="selectedPath = file.path"
        >
          {{ file.path }}
        </button>
      </nav>
      <pre
        class="source-preview"
        aria-label="Generated source"
      ><code>{{ selectedSource }}</code></pre>
      <div class="file-actions">
        <button
          v-for="file in files"
          :key="`download-${file.path}`"
          type="button"
          class="secondary"
          @click="download(file)"
        >
          Download {{ file.path }}
        </button>
      </div>
    </section>

    <section
      class="diagnostics-panel"
      aria-labelledby="diagnostics-heading"
    >
      <div class="section-heading">
        <h2 id="diagnostics-heading">Diagnostics</h2>
        <span>{{ diagnostics.length }}</span>
      </div>
      <p
        v-if="diagnostics.length === 0"
        class="muted"
      >
        No conversion warnings.
      </p>
      <ul
        v-else
        class="diagnostics-list"
      >
        <li
          v-for="diagnostic in diagnostics"
          :key="`${diagnostic.code}-${diagnostic.nodeId ?? diagnostic.message}`"
          :class="`diagnostic-${diagnostic.severity}`"
        >
          <strong>{{ diagnostic.severity }}</strong>
          <span>{{ diagnostic.message }}</span>
          <small v-if="diagnostic.nodeName">Layer: {{ diagnostic.nodeName }}</small>
        </li>
      </ul>
    </section>

    <details class="bridge-panel">
      <summary>Repository bridge</summary>
      <label>
        Bridge URL
        <input
          v-model.trim="bridgeConfig.bridgeUrl"
          type="url"
          autocomplete="off"
        />
      </label>
      <label>
        Repository root ID
        <input
          v-model.trim="bridgeConfig.repositoryRootId"
          type="text"
          autocomplete="off"
        />
      </label>
      <label>
        Target directory
        <input
          v-model.trim="bridgeConfig.targetDirectory"
          type="text"
          autocomplete="off"
        />
      </label>
      <label class="checkbox-label">
        <input
          v-model="overwrite"
          type="checkbox"
        />
        Allow overwriting existing files
      </label>
      <div class="bridge-actions">
        <button
          type="button"
          class="secondary"
          @click="saveBridgeConfig"
        >
          Save configuration
        </button>
        <button
          type="button"
          :disabled="!canExport"
          @click="exportBundle"
        >
          {{ isExporting ? 'Exporting…' : 'Export reviewed bundle' }}
        </button>
      </div>
      <div
        v-if="bridgeResults.length > 0"
        class="bridge-results"
      >
        <p class="muted">Last export results</p>
        <ul class="diagnostics-list">
          <li
            v-for="result in bridgeResults"
            :key="result.path"
            :class="result.status === 'written' ? 'diagnostic-info' : 'diagnostic-error'"
          >
            <strong>{{ result.status }}</strong>
            <span>{{ result.path }}</span>
            <small v-if="result.error">{{ result.error }}</small>
          </li>
        </ul>
      </div>
    </details>
  </main>
</template>

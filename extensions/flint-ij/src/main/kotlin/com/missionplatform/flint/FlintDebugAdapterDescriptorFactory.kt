package com.missionplatform.flint

import com.intellij.execution.runners.ExecutionEnvironment
import com.intellij.execution.configurations.RunConfigurationOptions
import com.redhat.devtools.lsp4ij.dap.configurations.DAPRunConfigurationOptions
import com.redhat.devtools.lsp4ij.dap.descriptors.DebugAdapterDescriptor
import com.redhat.devtools.lsp4ij.dap.descriptors.DebugAdapterDescriptorFactory

class FlintDebugAdapterDescriptorFactory : DebugAdapterDescriptorFactory() {
    override fun createDebugAdapterDescriptor(
        options: RunConfigurationOptions,
        environment: ExecutionEnvironment,
    ): DebugAdapterDescriptor = FlintDebugAdapterDescriptor(
        options as? DAPRunConfigurationOptions
            ?: error("Flint DAP requires the generic DAP run configuration."),
        environment,
        serverDefinition,
    )
}
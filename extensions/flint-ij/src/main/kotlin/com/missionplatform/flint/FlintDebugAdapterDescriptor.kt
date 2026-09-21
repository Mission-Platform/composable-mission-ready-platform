package com.missionplatform.flint

import com.intellij.execution.ExecutionException
import com.intellij.execution.process.ProcessHandler
import com.intellij.execution.runners.ExecutionEnvironment
import com.intellij.ide.impl.isTrusted
import com.intellij.openapi.fileTypes.FileType
import com.intellij.openapi.project.Project
import com.redhat.devtools.lsp4ij.dap.client.LaunchUtils
import com.redhat.devtools.lsp4ij.dap.configurations.DAPRunConfigurationOptions
import com.redhat.devtools.lsp4ij.dap.configurations.options.FileOptionConfigurable
import com.redhat.devtools.lsp4ij.dap.configurations.options.WorkingDirectoryConfigurable
import com.redhat.devtools.lsp4ij.dap.definitions.DebugAdapterServerDefinition
import com.redhat.devtools.lsp4ij.dap.descriptors.DebugAdapterDescriptor
import java.net.URI
import java.nio.file.Files
import java.nio.file.Path

class FlintDebugAdapterDescriptor(
    private val dapOptions: DAPRunConfigurationOptions,
    environment: ExecutionEnvironment,
    serverDefinition: DebugAdapterServerDefinition?,
) : DebugAdapterDescriptor(dapOptions, environment, serverDefinition) {
    private val project: Project = environment.project

    override fun startServer(): ProcessHandler {
        val projectRoot = project.basePath
            ?: throw ExecutionException("Flint debugging requires a project workspace root.")
        val adapterPath = packagedAdapterPath()
        val command = FlintCommandLine.buildDapAdapter(
            FlintCommandLine.from(FlintSettingsState.getInstance()),
            projectRoot,
            adapterPath,
            project.isTrusted(),
        )
        return startServer(command)
    }

    override fun getDapParameters(): Map<String, Any> {
        val settings = FlintCommandLine.from(FlintSettingsState.getInstance())
        val file = (dapOptions as FileOptionConfigurable).file.orEmpty()
        val workspace = (dapOptions as WorkingDirectoryConfigurable).workingDirectory.orEmpty()
            .ifBlank { project.basePath.orEmpty() }
        require(file.isNotBlank()) {
            "Flint debugging requires a .flint program file."
        }
        require(settings.runtimePath.isNotBlank()) {
            "Flint debugging requires a Flint runtime executable. Configure it in Settings | Tools | Flint."
        }

        val parameters = LaunchUtils.getDapParameters(dapOptions).toMutableMap()
        parameters["program"] = file
        parameters["cwd"] = workspace
        parameters["runtimePath"] = settings.runtimePath
        parameters["runtimeArgs"] = FlintCommandLine.parseArguments(settings.runtimeArguments)
        parameters.putIfAbsent("args", emptyList<String>())
        parameters.putIfAbsent("env", emptyMap<String, String>())
        return parameters
    }

    override fun getFileType(): FileType = FlintFileType()

    private companion object {
        const val DAP_RESOURCE = "dap/main.js"

        fun packagedAdapterPath(): Path {
            val resource = FlintDebugAdapterDescriptor::class.java.classLoader.getResource(DAP_RESOURCE)
                ?: error("Flint plugin is missing its packaged DAP adapter: $DAP_RESOURCE")
            if (resource.protocol == "file") return Path.of(URI(resource.toString()))

            val extractedDirectory = Files.createTempDirectory("flint-dap-")
            DAP_FILES.forEach { fileName ->
                val module = FlintDebugAdapterDescriptor::class.java.classLoader.getResource("dap/$fileName")
                    ?: error("Flint plugin is missing DAP module: $fileName")
                val extracted = extractedDirectory.resolve(fileName)
                module.openStream().use { input ->
                    Files.copy(input, extracted, java.nio.file.StandardCopyOption.REPLACE_EXISTING)
                }
                extracted.toFile().deleteOnExit()
            }
            extractedDirectory.toFile().deleteOnExit()
            return extractedDirectory.resolve("main.js")
        }

        val DAP_FILES = listOf("main.js", "server.js", "protocol.js", "index.js")
    }
}
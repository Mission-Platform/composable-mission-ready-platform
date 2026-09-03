package com.missionplatform.fws

import com.intellij.execution.ExecutionException
import com.intellij.execution.process.ProcessHandler
import com.intellij.execution.runners.ExecutionEnvironment
import com.intellij.openapi.fileTypes.FileType
import com.intellij.openapi.project.Project
import com.intellij.openapi.project.isTrusted
import com.redhat.devtools.lsp4ij.dap.client.LaunchUtils
import com.redhat.devtools.lsp4ij.dap.configurations.DAPRunConfigurationOptions
import com.redhat.devtools.lsp4ij.dap.configurations.options.FileOptionConfigurable
import com.redhat.devtools.lsp4ij.dap.configurations.options.WorkingDirectoryConfigurable
import com.redhat.devtools.lsp4ij.dap.definitions.DebugAdapterServerDefinition
import com.redhat.devtools.lsp4ij.dap.descriptors.DebugAdapterDescriptor
import java.net.URI
import java.nio.file.Files
import java.nio.file.Path

class FwsDebugAdapterDescriptor(
    private val dapOptions: DAPRunConfigurationOptions,
    environment: ExecutionEnvironment,
    serverDefinition: DebugAdapterServerDefinition?,
) : DebugAdapterDescriptor(dapOptions, environment, serverDefinition) {
    private val project: Project = environment.project

    override fun startServer(): ProcessHandler {
        val projectRoot = project.basePath
            ?: throw ExecutionException("Forge Web Script debugging requires a project workspace root.")
        val adapterPath = packagedAdapterPath()
        val command = FwsCommandLine.buildDapAdapter(
            FwsCommandLine.from(FwsSettingsState.getInstance()),
            projectRoot,
            adapterPath,
            project.isTrusted(),
        )
        return startServer(command)
    }

    override fun getDapParameters(): Map<String, Any> {
        val settings = FwsCommandLine.from(FwsSettingsState.getInstance())
        val file = (dapOptions as FileOptionConfigurable).file.orEmpty()
        val workspace = (dapOptions as WorkingDirectoryConfigurable).workingDirectory.orEmpty()
            .ifBlank { project.basePath.orEmpty() }
        require(file.isNotBlank()) {
            "Forge Web Script debugging requires an .fws program file."
        }
        require(settings.runtimePath.isNotBlank()) {
            "Forge Web Script debugging requires a Forge runtime executable. Configure it in Settings | Tools | Forge Web Script."
        }

        val parameters = LaunchUtils.getDapParameters(dapOptions).toMutableMap()
        parameters["program"] = file
        parameters["cwd"] = workspace
        parameters["runtimePath"] = settings.runtimePath
        parameters["runtimeArgs"] = FwsCommandLine.parseArguments(settings.runtimeArguments)
        parameters.putIfAbsent("args", emptyList<String>())
        parameters.putIfAbsent("env", emptyMap<String, String>())
        return parameters
    }

    override fun getFileType(): FileType = FwsFileType()

    private companion object {
        const val DAP_RESOURCE = "dap/main.js"

        fun packagedAdapterPath(): Path {
            val resource = FwsDebugAdapterDescriptor::class.java.classLoader.getResource(DAP_RESOURCE)
                ?: error("Forge Web Script plugin is missing its packaged DAP adapter: $DAP_RESOURCE")
            if (resource.protocol == "file") return Path.of(URI(resource.toString()))

            val extractedDirectory = Files.createTempDirectory("forge-web-script-dap-")
            DAP_FILES.forEach { fileName ->
                val module = FwsDebugAdapterDescriptor::class.java.classLoader.getResource("dap/$fileName")
                    ?: error("Forge Web Script plugin is missing DAP module: $fileName")
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
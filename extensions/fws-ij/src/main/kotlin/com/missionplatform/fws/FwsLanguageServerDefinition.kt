package com.missionplatform.fws

import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.redhat.devtools.lsp4ij.LanguageServerFactory
import com.redhat.devtools.lsp4ij.server.OSProcessStreamConnectionProvider
import com.redhat.devtools.lsp4ij.server.StreamConnectionProvider

class FwsLanguageServerDefinition : LanguageServerFactory {
    override fun createConnectionProvider(project: Project): StreamConnectionProvider {
        val settings = FwsCommandLine.from(FwsSettingsState.getInstance())
        check(settings.startOnActivation) {
            "Forge Web Script language-server startup is disabled. Enable " +
                "'Start the language server when an FWS file is opened' in Settings | Tools | Forge Web Script."
        }
        val projectRoot = project.basePath
            ?: error("Forge Web Script cannot start because the project has no workspace root.")
        val command = FwsCommandLine.build(settings, projectRoot)
        return FwsStreamConnectionProvider(command, settings.trace)
    }
}

private class FwsStreamConnectionProvider(
    command: com.intellij.execution.configurations.GeneralCommandLine,
    private val configuredTrace: String,
) : OSProcessStreamConnectionProvider(command) {
    override fun getTrace(file: VirtualFile): String = when (configuredTrace.lowercase()) {
        "messages", "verbose" -> configuredTrace.lowercase()
        else -> "off"
    }
}
package com.missionplatform.flint

import com.intellij.ide.impl.isTrusted
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.redhat.devtools.lsp4ij.LanguageServerFactory
import com.redhat.devtools.lsp4ij.server.OSProcessStreamConnectionProvider
import com.redhat.devtools.lsp4ij.server.StreamConnectionProvider

class FlintLanguageServerDefinition : LanguageServerFactory {
    override fun createConnectionProvider(project: Project): StreamConnectionProvider {
        val settings = FlintCommandLine.from(FlintSettingsState.getInstance())
        check(settings.startOnActivation) {
            "Flint language-server startup is disabled. Enable " +
                "'Start the language server when a Flint file is opened' in Settings | Tools | Flint."
        }
        val projectRoot = project.basePath
            ?: error("Flint cannot start because the project has no workspace root.")
        val command = FlintCommandLine.build(settings, projectRoot, project.isTrusted())
        return FlintStreamConnectionProvider(command, settings.trace)
    }
}

private class FlintStreamConnectionProvider(
    command: com.intellij.execution.configurations.GeneralCommandLine,
    private val configuredTrace: String,
) : OSProcessStreamConnectionProvider(command) {
    override fun getTrace(file: VirtualFile): String = when (configuredTrace.lowercase()) {
        "messages", "verbose" -> configuredTrace.lowercase()
        else -> "off"
    }
}
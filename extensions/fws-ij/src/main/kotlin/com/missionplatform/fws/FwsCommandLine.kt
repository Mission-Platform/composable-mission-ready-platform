package com.missionplatform.fws

import com.intellij.execution.configurations.GeneralCommandLine
import java.io.File
import java.io.IOException
import java.nio.file.Files
import java.nio.file.Path

data class FwsLaunchSettings(
    val nodeExecutable: String = "node",
    val serverCommand: String = "forge-web-script-lsp",
    val serverArguments: String = "",
    val runtimePath: String = "",
    val runtimeArguments: String = "",
    val trace: String = "off",
    val startOnActivation: Boolean = true,
)

/**
 * Resolves the configured Node executable and `forge-web-script-lsp` command/path into a launchable
 * [GeneralCommandLine]. The default `serverCommand` ("forge-web-script-lsp") is a bare command, and
 * Node does not resolve script arguments through `PATH`; passing it straight to `node` therefore never
 * finds a project-installed CLI. Instead, bare commands are located the same way a shell would find
 * them (a project's own `node_modules/.bin`, walking up ancestor directories for workspaces, then
 * `PATH`), and the resulting package-manager shim is resolved to the real JavaScript entry point it
 * launches so it can be started with the configured Node executable.
 */
object FwsCommandLine {
    private val CMD_SHIM_TARGET = Regex("""(?m)^#\s*cmd-shim-target=(.+)$""")
    private val JS_EXTENSIONS = setOf("js", "mjs", "cjs")

    fun from(settings: FwsSettingsState): FwsLaunchSettings = FwsLaunchSettings(
        nodeExecutable = settings.nodeExecutable,
        serverCommand = settings.serverCommand,
        serverArguments = settings.serverArguments,
        runtimePath = settings.runtimePath,
        runtimeArguments = settings.runtimeArguments,
        trace = settings.trace,
        startOnActivation = settings.startOnActivation,
    )

    fun buildDapAdapter(settings: FwsLaunchSettings, projectRoot: String, adapterPath: Path): GeneralCommandLine {
        val node = settings.nodeExecutable.trim()
        require(node.isNotEmpty()) {
            "Forge Web Script debugging requires a Node.js executable. Configure it in Settings | Tools | Forge Web Script."
        }
        val root = Path.of(projectRoot).toAbsolutePath().normalize()
        require(Files.isDirectory(root)) {
            "Forge Web Script debugging cannot start because the project root does not exist: $root"
        }
        require(Files.isRegularFile(adapterPath)) {
            "Forge Web Script debugging cannot find the packaged DAP adapter: $adapterPath"
        }
        validateExecutablePath(node, "Node.js executable", root)
        return GeneralCommandLine(node, adapterPath.toString()).withWorkDirectory(root.toFile())
    }

    fun build(settings: FwsLaunchSettings, projectRoot: String): GeneralCommandLine {
        val node = settings.nodeExecutable.trim()
        val server = settings.serverCommand.trim()
        require(node.isNotEmpty()) {
            "Forge Web Script requires a Node.js executable. Configure it in Settings | Tools | Forge Web Script."
        }
        require(server.isNotEmpty()) {
            "Forge Web Script requires a forge-web-script-lsp command or path. Configure it in Settings | Tools | Forge Web Script."
        }
        val root = Path.of(projectRoot).toAbsolutePath().normalize()
        require(Files.isDirectory(root)) {
            "Forge Web Script cannot start because the project root does not exist: $root"
        }
        validateExecutablePath(node, "Node.js executable", root)

        val resolved = resolveServerCommand(server, root)
        val command = if (resolved.launchWithNode) {
            GeneralCommandLine(node, resolved.path.toString())
        } else {
            GeneralCommandLine(resolved.path.toString())
        }
        parseArguments(settings.serverArguments).forEach(command::addParameter)
        return command.withWorkDirectory(root.toFile())
    }

    private data class ResolvedServerCommand(val path: Path, val launchWithNode: Boolean)

    /**
     * Locates the configured `forge-web-script-lsp` command/path and resolves it to something that
     * can actually be launched: a concrete JavaScript entry point (launched with the configured Node
     * executable), or, failing that, a directly executable file (launched as-is, relying on its own
     * shebang, e.g. a package-manager shim script).
     */
    private fun resolveServerCommand(server: String, projectRoot: Path): ResolvedServerCommand {
        val hasPathSeparator = server.contains('/') || server.contains('\\')
        val candidate = if (hasPathSeparator) {
            val configured = Path.of(server)
            val path = if (configured.isAbsolute) configured else projectRoot.resolve(configured)
            require(Files.exists(path)) {
                "Forge Web Script could not find the configured forge-web-script-lsp command/path " +
                    "'$server' (resolved to '$path'). Install forge-web-script-lsp or update the plugin settings."
            }
            path
        } else {
            findInAncestorNodeModulesBin(server, projectRoot)
                ?: findOnPath(server)
                ?: error(
                    "Forge Web Script could not find a project-installed '$server'. Run " +
                        "'pnpm add forge-web-script-lsp' (or your package manager's equivalent) so that " +
                        "'node_modules/.bin/$server' exists under $projectRoot, install Node.js 24 or " +
                        "newer, or set an explicit server command/path in Settings | Tools | Forge Web Script.",
                )
        }

        val jsEntryPoint = resolveJsEntryPoint(candidate)
        if (jsEntryPoint != null) return ResolvedServerCommand(jsEntryPoint, launchWithNode = true)

        require(Files.isExecutable(candidate)) {
            "Forge Web Script found '$candidate' but could not resolve a JavaScript entry point and " +
                "the file is not directly executable. Configure an explicit forge-web-script-lsp " +
                "script path in Settings | Tools | Forge Web Script."
        }
        return ResolvedServerCommand(candidate, launchWithNode = false)
    }

    /** Walks up from [startDir] looking for `node_modules/.bin/<command>`, like a shell would. */
    private fun findInAncestorNodeModulesBin(command: String, startDir: Path): Path? {
        var dir: Path? = startDir
        while (dir != null) {
            val candidate = dir.resolve("node_modules").resolve(".bin").resolve(command)
            if (Files.exists(candidate)) return candidate
            dir = dir.parent
        }
        return null
    }

    private fun findOnPath(command: String): Path? {
        val pathEnv = System.getenv("PATH") ?: return null
        for (entry in pathEnv.split(File.pathSeparator)) {
            if (entry.isBlank()) continue
            val candidate = runCatching { Path.of(entry).resolve(command) }.getOrNull() ?: continue
            if (Files.isRegularFile(candidate) && Files.isExecutable(candidate)) return candidate
        }
        return null
    }

    /**
     * Resolves [candidate] to a real JavaScript file: [candidate] itself when it already looks like
     * one, its symlink target, or the target recorded by a package-manager "cmd-shim" wrapper script
     * (the shim pnpm/npm/yarn install into `node_modules/.bin`). Returns `null` when no JavaScript
     * entry point can be determined, in which case [candidate] may still be directly executable.
     */
    private fun resolveJsEntryPoint(candidate: Path): Path? {
        if (isJsFile(candidate)) return candidate

        val symlinkTarget = runCatching {
            if (Files.isSymbolicLink(candidate)) candidate.toRealPath() else null
        }.getOrNull()
        if (symlinkTarget != null && isJsFile(symlinkTarget)) return symlinkTarget

        if (!Files.isRegularFile(candidate)) return null
        val content = try {
            Files.readString(candidate)
        } catch (_: IOException) {
            return null
        }
        val shimTarget = CMD_SHIM_TARGET.find(content)?.groupValues?.get(1)?.trim() ?: return null
        val target = Path.of(shimTarget)
        return if (Files.isRegularFile(target) && isJsFile(target)) target else null
    }

    private fun isJsFile(path: Path): Boolean {
        val extension = path.fileName?.toString().orEmpty().substringAfterLast('.', "")
        return extension in JS_EXTENSIONS
    }

    private fun validateExecutablePath(value: String, description: String, projectRoot: Path) {
        if (!value.contains('/') && !value.contains('\\')) return
        val configuredPath = Path.of(value)
        val path = if (configuredPath.isAbsolute()) configuredPath else projectRoot.resolve(configuredPath)
        require(Files.isRegularFile(path) && Files.isExecutable(path)) {
            "Forge Web Script could not find an executable $description at '$value'. " +
                "Install Node.js 24 or newer and forge-web-script-lsp, or update the plugin settings."
        }
    }

    internal fun parseArguments(value: String): List<String> {
        val result = mutableListOf<String>()
        val current = StringBuilder()
        var quote: Char? = null
        var escaped = false

        for (character in value) {
            when {
                escaped -> {
                    current.append(character)
                    escaped = false
                }
                character == '\\' && quote != '\'' -> escaped = true
                quote != null && character == quote -> quote = null
                quote == null && (character == '\'' || character == '"') -> quote = character
                quote == null && character.isWhitespace() -> {
                    if (current.isNotEmpty()) {
                        result += current.toString()
                        current.clear()
                    }
                }
                else -> current.append(character)
            }
        }
        require(!escaped && quote == null) {
            "Forge Web Script server arguments contain an unterminated quote or escape."
        }
        if (current.isNotEmpty()) result += current.toString()
        return result
    }
}

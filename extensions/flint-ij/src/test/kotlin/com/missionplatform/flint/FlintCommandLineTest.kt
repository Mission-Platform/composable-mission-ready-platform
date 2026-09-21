package com.missionplatform.flint

import java.nio.file.Files
import kotlin.io.path.createDirectories
import kotlin.io.path.pathString
import kotlin.io.path.writeText
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse

class FlintCommandLineTest {
    @Test
    fun resolvesTheProjectInstalledShimToItsRealJsEntryPointAndLaunchesWithConfiguredNode() {
        val root = Files.createTempDirectory("flint-command-test")
        val entryPoint = writeExecutableFile(root.resolve("node_modules/@mission-platform/flint-lsp/dist/main.js"), "#!/usr/bin/env node\n")
        writePnpmShim(root.resolve("node_modules/.bin/flint-lsp"), entryPoint)

        val command = FlintCommandLine.build(
            FlintLaunchSettings(
                nodeExecutable = "/usr/bin/env",
                serverCommand = "flint-lsp",
                serverArguments = "--workspace \"workspace root\" --flag",
            ),
            root.toString(),
        )

        assertEquals(
            "/usr/bin/env ${entryPoint.pathString} --workspace \"workspace root\" --flag",
            command.commandLineString,
        )
        assertEquals(root.toFile(), command.workDirectory)
    }

    @Test
    fun resolvesTheBareCommandByWalkingUpAncestorNodeModulesBinDirectories() {
        val workspaceRoot = Files.createTempDirectory("flint-command-test")
        val projectRoot = workspaceRoot.resolve("packages/example").createDirectories()
        val entryPoint = writeExecutableFile(workspaceRoot.resolve("node_modules/@mission-platform/flint-lsp/dist/main.js"), "#!/usr/bin/env node\n")
        writePnpmShim(workspaceRoot.resolve("node_modules/.bin/flint-lsp"), entryPoint)

        val command = FlintCommandLine.build(FlintLaunchSettings(), projectRoot.toString())

        assertEquals("node", command.exePath)
        assertEquals(listOf(entryPoint.pathString), command.parametersList.list)
        assertEquals(projectRoot.toFile(), command.workDirectory)
    }

    @Test
    fun usesAnExplicitJavaScriptServerPathDirectlyWithConfiguredNode() {
        val root = Files.createTempDirectory("flint-command-test")
        val entryPoint = writeExecutableFile(root.resolve("custom/server.mjs"), "#!/usr/bin/env node\n")

        val command = FlintCommandLine.build(
            FlintLaunchSettings(nodeExecutable = "/usr/bin/env", serverCommand = entryPoint.pathString),
            root.toString(),
        )

        assertEquals("/usr/bin/env", command.exePath)
        assertEquals(listOf(entryPoint.pathString), command.parametersList.list)
    }

    @Test
    fun launchesADirectlyExecutableServerWithoutAResolvableJsEntryPointWithoutPrependingNode() {
        val root = Files.createTempDirectory("flint-command-test")
        val shim = writeExecutableFile(root.resolve("bin/flint-lsp"), "#!/bin/sh\nexec echo not-a-real-server\n")

        val command = FlintCommandLine.build(
            FlintLaunchSettings(nodeExecutable = "/usr/bin/env", serverCommand = shim.pathString),
            root.toString(),
        )

        assertEquals(shim.pathString, command.exePath)
        assertFalse(command.commandLineString.contains("/usr/bin/env"))
    }

    @Test
    fun rejectsAnUnresolvedBareServerCommandWithAnActionableMessage() {
        val root = Files.createTempDirectory("flint-command-test")
        val error = assertFailsWith<IllegalStateException> {
            FlintCommandLine.build(
                FlintLaunchSettings(serverCommand = "does-not-exist-flint-lsp"),
                root.toString(),
            )
        }

        assertContains(error.message.orEmpty(), "could not find a project-installed")
        assertContains(error.message.orEmpty(), "pnpm add flint-lsp")
    }

    @Test
    fun rejectsAMissingExplicitServerPathWithAnActionableMessage() {
        val root = Files.createTempDirectory("flint-command-test")
        val error = assertFailsWith<IllegalArgumentException> {
            FlintCommandLine.build(
                FlintLaunchSettings(serverCommand = root.resolve("missing/server.js").toString()),
                root.toString(),
            )
        }

        assertContains(error.message.orEmpty(), "could not find the configured flint-lsp command/path")
    }

    @Test
    fun rejectsAnExplicitServerPathForAnUntrustedProject() {
        val root = Files.createTempDirectory("flint-command-test")
        val server = writeExecutableFile(root.resolve("custom/server.js"), "#!/usr/bin/env node\n")

        val error = assertFailsWith<IllegalArgumentException> {
            FlintCommandLine.build(
                FlintLaunchSettings(serverCommand = server.pathString),
                root.toString(),
                projectTrusted = false,
            )
        }

        assertContains(error.message.orEmpty(), "untrusted project")
    }

    @Test
    fun doesNotResolveAnUntrustedProjectNodeModulesShim() {
        val root = Files.createTempDirectory("flint-command-test")
        val entryPoint = writeExecutableFile(root.resolve("node_modules/@mission-platform/flint-lsp/dist/main.js"), "#!/usr/bin/env node\n")
        writePnpmShim(root.resolve("node_modules/.bin/flint-lsp"), entryPoint)

        val error = assertFailsWith<IllegalStateException> {
            FlintCommandLine.build(
                FlintLaunchSettings(serverCommand = "flint-lsp"),
                root.toString(),
                projectTrusted = false,
            )
        }

        assertContains(error.message.orEmpty(), "could not find a project-installed")
    }

    @Test
    fun rejectsAnExplicitNodePathForAnUntrustedProject() {
        val root = Files.createTempDirectory("flint-command-test")

        val error = assertFailsWith<IllegalArgumentException> {
            FlintCommandLine.build(
                FlintLaunchSettings(nodeExecutable = root.resolve("node").pathString),
                root.toString(),
                projectTrusted = false,
            )
        }

        assertContains(error.message.orEmpty(), "untrusted project")
    }

    @Test
    fun rejectsMissingConfiguredExecutableWithActionableMessage() {
        val root = Files.createTempDirectory("flint-command-test")
        val error = assertFailsWith<IllegalArgumentException> {
            FlintCommandLine.build(
                FlintLaunchSettings(nodeExecutable = root.resolve("missing-node").toString()),
                root.toString(),
            )
        }

        assertContains(error.message.orEmpty(), "Node.js executable")
        assertContains(error.message.orEmpty(), "Node.js 24")
    }

    @Test
    fun rejectsMalformedArguments() {
        val error = assertFailsWith<IllegalArgumentException> {
            FlintCommandLine.parseArguments("--name 'unterminated")
        }

        assertContains(error.message.orEmpty(), "unterminated")
    }

    private fun writeExecutableFile(path: java.nio.file.Path, content: String): java.nio.file.Path {
        path.parent.createDirectories()
        path.writeText(content)
        path.toFile().setExecutable(true)
        return path
    }

    private fun writePnpmShim(shimPath: java.nio.file.Path, target: java.nio.file.Path) {
        writeExecutableFile(
            shimPath,
            """
            #!/bin/sh
            exec node "${target.pathString}" "$@"
            # cmd-shim-target=${target.pathString}
            """.trimIndent() + "\n",
        )
    }
}

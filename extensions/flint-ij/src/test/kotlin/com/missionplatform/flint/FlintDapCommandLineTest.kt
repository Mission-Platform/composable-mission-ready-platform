package com.missionplatform.flint

import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class FlintDapCommandLineTest {
    @Test
    fun buildsAStdioAdapterCommandWithoutStartingTheLsp() {
        val root = Files.createTempDirectory("flint-dap-test")
        val adapter = Files.createFile(root.resolve("main.js"))
        try {
            val command = FlintCommandLine.buildDapAdapter(
                FlintLaunchSettings(nodeExecutable = "node", runtimePath = "flint-runtime"),
                root.toString(),
                adapter,
            )

            assertEquals("node", command.exePath)
            assertEquals(listOf(adapter.toString()), command.parametersList.list)
            assertTrue(command.commandLineString.contains("main.js"))
            assertTrue(!command.commandLineString.contains("flint-lsp"))
        } finally {
            Files.deleteIfExists(adapter)
            Files.deleteIfExists(root)
        }
    }

    @Test
    fun rejectsAnUnpackagedAdapter() {
        val root = Files.createTempDirectory("flint-dap-test")
        try {
            assertFailsWith<IllegalArgumentException> {
                FlintCommandLine.buildDapAdapter(
                    FlintLaunchSettings(),
                    root.toString(),
                    root.resolve("missing.js"),
                )
            }
        } finally {
            Files.deleteIfExists(root)
        }
    }

    @Test
    fun rejectsAnExplicitNodePathForAnUntrustedProject() {
        val root = Files.createTempDirectory("flint-dap-test")
        val adapter = Files.createFile(root.resolve("main.js"))
        try {
            val error = assertFailsWith<IllegalArgumentException> {
                FlintCommandLine.buildDapAdapter(
                    FlintLaunchSettings(nodeExecutable = root.resolve("node").toString()),
                    root.toString(),
                    adapter,
                    projectTrusted = false,
                )
            }

            assertTrue(error.message.orEmpty().contains("untrusted project"))
        } finally {
            Files.deleteIfExists(adapter)
            Files.deleteIfExists(root)
        }
    }
}
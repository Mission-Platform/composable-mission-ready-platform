package com.missionplatform.fws

import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class FwsDapCommandLineTest {
    @Test
    fun buildsAStdioAdapterCommandWithoutStartingTheLsp() {
        val root = Files.createTempDirectory("fws-dap-test")
        val adapter = Files.createFile(root.resolve("main.js"))
        try {
            val command = FwsCommandLine.buildDapAdapter(
                FwsLaunchSettings(nodeExecutable = "node", runtimePath = "forge-runtime"),
                root.toString(),
                adapter,
            )

            assertEquals("node", command.exePath)
            assertEquals(listOf(adapter.toString()), command.parametersList.list)
            assertTrue(command.commandLineString.contains("main.js"))
            assertTrue(!command.commandLineString.contains("forge-web-script-lsp"))
        } finally {
            Files.deleteIfExists(adapter)
            Files.deleteIfExists(root)
        }
    }

    @Test
    fun rejectsAnUnpackagedAdapter() {
        val root = Files.createTempDirectory("fws-dap-test")
        try {
            assertFailsWith<IllegalArgumentException> {
                FwsCommandLine.buildDapAdapter(
                    FwsLaunchSettings(),
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
        val root = Files.createTempDirectory("fws-dap-test")
        val adapter = Files.createFile(root.resolve("main.js"))
        try {
            val error = assertFailsWith<IllegalArgumentException> {
                FwsCommandLine.buildDapAdapter(
                    FwsLaunchSettings(nodeExecutable = root.resolve("node").toString()),
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
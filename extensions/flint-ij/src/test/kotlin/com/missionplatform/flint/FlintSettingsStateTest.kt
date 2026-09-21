package com.missionplatform.flint

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse

class FlintSettingsStateTest {
    @Test
    fun persistsAllLaunchSettings() {
        val settings = FlintSettingsState()
        settings.loadState(
            FlintSettingsState.State(
                nodeExecutable = "/opt/node/bin/node",
                serverCommand = "/workspace/node_modules/.bin/flint-lsp",
                serverArguments = "--log-level debug",
                trace = "verbose",
                startOnActivation = false,
            ),
        )

        assertEquals("/opt/node/bin/node", settings.nodeExecutable)
        assertEquals("/workspace/node_modules/.bin/flint-lsp", settings.serverCommand)
        assertEquals("--log-level debug", settings.serverArguments)
        assertEquals("verbose", settings.trace)
        assertFalse(settings.startOnActivation)
        assertEquals(
            FlintLaunchSettings(
                nodeExecutable = "/opt/node/bin/node",
                serverCommand = "/workspace/node_modules/.bin/flint-lsp",
                serverArguments = "--log-level debug",
                trace = "verbose",
                startOnActivation = false,
            ),
            FlintCommandLine.from(settings),
            "launchers must resolve all values directly from the packaged Settings state",
        )
    }
}
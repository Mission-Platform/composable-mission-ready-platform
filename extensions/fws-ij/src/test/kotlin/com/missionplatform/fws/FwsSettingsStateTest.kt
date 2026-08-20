package com.missionplatform.fws

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse

class FwsSettingsStateTest {
    @Test
    fun persistsAllLaunchSettings() {
        val settings = FwsSettingsState()
        settings.loadState(
            FwsSettingsState.State(
                nodeExecutable = "/opt/node/bin/node",
                serverCommand = "/workspace/node_modules/.bin/forge-web-script-lsp",
                serverArguments = "--log-level debug",
                trace = "verbose",
                startOnActivation = false,
            ),
        )

        assertEquals("/opt/node/bin/node", settings.nodeExecutable)
        assertEquals("/workspace/node_modules/.bin/forge-web-script-lsp", settings.serverCommand)
        assertEquals("--log-level debug", settings.serverArguments)
        assertEquals("verbose", settings.trace)
        assertFalse(settings.startOnActivation)
        assertEquals(
            FwsLaunchSettings(
                nodeExecutable = "/opt/node/bin/node",
                serverCommand = "/workspace/node_modules/.bin/forge-web-script-lsp",
                serverArguments = "--log-level debug",
                trace = "verbose",
                startOnActivation = false,
            ),
            FwsCommandLine.from(settings),
            "launchers must resolve all values directly from the packaged Settings state",
        )
    }
}
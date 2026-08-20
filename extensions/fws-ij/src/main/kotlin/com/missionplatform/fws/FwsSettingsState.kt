package com.missionplatform.fws

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage

@Service(Service.Level.APP)
@State(name = "FwsSettings", storages = [Storage("fws.xml")])
class FwsSettingsState : PersistentStateComponent<FwsSettingsState.State> {
    data class State(
        var nodeExecutable: String = "node",
        var serverCommand: String = "forge-web-script-lsp",
        var serverArguments: String = "",
        var runtimePath: String = "",
        var runtimeArguments: String = "",
        var trace: String = "off",
        var startOnActivation: Boolean = true,
    )

    private var state = State()

    var nodeExecutable: String
        get() = state.nodeExecutable
        set(value) {
            state.nodeExecutable = value
        }

    var serverCommand: String
        get() = state.serverCommand
        set(value) {
            state.serverCommand = value
        }

    var serverArguments: String
        get() = state.serverArguments
        set(value) {
            state.serverArguments = value
        }

    var runtimePath: String
        get() = state.runtimePath
        set(value) {
            state.runtimePath = value
        }

    var runtimeArguments: String
        get() = state.runtimeArguments
        set(value) {
            state.runtimeArguments = value
        }

    var trace: String
        get() = state.trace
        set(value) {
            state.trace = value
        }

    var startOnActivation: Boolean
        get() = state.startOnActivation
        set(value) {
            state.startOnActivation = value
        }

    override fun getState(): State = state

    override fun loadState(state: State) {
        this.state = state
    }

    companion object {
        fun getInstance(): FwsSettingsState =
            ApplicationManager.getApplication().getService(FwsSettingsState::class.java)
    }
}
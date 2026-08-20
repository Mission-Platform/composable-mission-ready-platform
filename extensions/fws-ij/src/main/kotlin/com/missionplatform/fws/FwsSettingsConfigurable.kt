package com.missionplatform.fws

import com.intellij.openapi.options.Configurable
import java.awt.GridBagConstraints
import java.awt.GridBagLayout
import java.awt.Insets
import javax.swing.JCheckBox
import javax.swing.JComboBox
import javax.swing.JComponent
import javax.swing.JLabel
import javax.swing.JPanel
import javax.swing.JTextField

class FwsSettingsConfigurable : Configurable {
    private var panel: JPanel? = null
    private var nodeExecutable: JTextField? = null
    private var serverCommand: JTextField? = null
    private var serverArguments: JTextField? = null
    private var runtimePath: JTextField? = null
    private var runtimeArguments: JTextField? = null
    private var trace: JComboBox<String>? = null
    private var startOnActivation: JCheckBox? = null

    override fun getDisplayName(): String = "Forge Web Script"

    override fun createComponent(): JComponent {
        val createdPanel = JPanel(GridBagLayout())
        val fields = listOf(
            "Node.js executable:" to JTextField(),
            "Language server command/path:" to JTextField(),
            "Server arguments:" to JTextField(),
            "Forge runtime executable:" to JTextField(),
            "Forge runtime arguments:" to JTextField(),
        )
        fields.forEachIndexed { index, (label, field) ->
            addRow(createdPanel, index, label, field)
            when (index) {
                0 -> nodeExecutable = field
                1 -> serverCommand = field
                2 -> serverArguments = field
                3 -> runtimePath = field
                else -> runtimeArguments = field
            }
        }

        val traceBox = JComboBox(arrayOf("off", "messages", "verbose"))
        addRow(createdPanel, fields.size, "LSP trace:", traceBox)
        trace = traceBox

        val activationBox = JCheckBox("Start the language server when an FWS file is opened")
        val activationConstraints = GridBagConstraints().apply {
            gridx = 1
            gridy = fields.size + 1
            weightx = 1.0
            fill = GridBagConstraints.HORIZONTAL
            anchor = GridBagConstraints.WEST
            insets = Insets(4, 4, 4, 4)
        }
        createdPanel.add(activationBox, activationConstraints)
        startOnActivation = activationBox
        panel = createdPanel
        reset()
        return createdPanel
    }

    override fun isModified(): Boolean {
        val settings = FwsSettingsState.getInstance()
        return nodeExecutable?.text != settings.nodeExecutable ||
            serverCommand?.text != settings.serverCommand ||
            serverArguments?.text != settings.serverArguments ||
            runtimePath?.text != settings.runtimePath ||
            runtimeArguments?.text != settings.runtimeArguments ||
            trace?.selectedItem != settings.trace ||
            startOnActivation?.isSelected != settings.startOnActivation
    }

    override fun apply() {
        val settings = FwsSettingsState.getInstance()
        settings.nodeExecutable = nodeExecutable?.text?.trim().orEmpty()
        settings.serverCommand = serverCommand?.text?.trim().orEmpty()
        settings.serverArguments = serverArguments?.text.orEmpty()
        settings.runtimePath = runtimePath?.text?.trim().orEmpty()
        settings.runtimeArguments = runtimeArguments?.text.orEmpty()
        settings.trace = trace?.selectedItem as? String ?: "off"
        settings.startOnActivation = startOnActivation?.isSelected ?: true
    }

    override fun reset() {
        val settings = FwsSettingsState.getInstance()
        nodeExecutable?.text = settings.nodeExecutable
        serverCommand?.text = settings.serverCommand
        serverArguments?.text = settings.serverArguments
        runtimePath?.text = settings.runtimePath
        runtimeArguments?.text = settings.runtimeArguments
        trace?.selectedItem = settings.trace
        startOnActivation?.isSelected = settings.startOnActivation
    }

    override fun disposeUIResources() {
        panel = null
        nodeExecutable = null
        serverCommand = null
        serverArguments = null
        runtimePath = null
        runtimeArguments = null
        trace = null
        startOnActivation = null
    }

    private fun addRow(panel: JPanel, row: Int, label: String, component: JComponent) {
        val labelConstraints = GridBagConstraints().apply {
            gridx = 0
            gridy = row
            anchor = GridBagConstraints.WEST
            insets = Insets(4, 4, 4, 4)
        }
        panel.add(JLabel(label), labelConstraints)
        val componentConstraints = GridBagConstraints().apply {
            gridx = 1
            gridy = row
            weightx = 1.0
            fill = GridBagConstraints.HORIZONTAL
            insets = Insets(4, 4, 4, 4)
        }
        panel.add(component, componentConstraints)
    }
}
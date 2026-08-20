package com.missionplatform.fws

import com.intellij.openapi.fileTypes.LanguageFileType
import com.redhat.devtools.lsp4ij.LanguageServerFactory
import com.redhat.devtools.lsp4ij.dap.descriptors.DebugAdapterDescriptorFactory
import java.nio.file.Files
import java.nio.file.Path
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import javax.xml.parsers.DocumentBuilderFactory

class PluginDescriptorTest {
    @Test
    fun descriptorMapsFwsFilesToTheSharedServer() {
        val descriptor = Path.of("src/main/resources/META-INF/plugin.xml")
        assertTrue(Files.exists(descriptor), "plugin.xml must be present")

        val document = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(descriptor.toFile())
        assertEquals("com.missionplatform.fws", document.documentElement.getElementsByTagName("id").item(0).textContent)

        val servers = document.getElementsByTagName("server")
        assertEquals(1, servers.length)
        val server = servers.item(0).attributes
        assertEquals("forge-web-script", server.getNamedItem("id").nodeValue)
        val factoryName = server.getNamedItem("factoryClass").nodeValue
        val factoryClass = Class.forName(factoryName)
        assertTrue(
            LanguageServerFactory::class.java.isAssignableFrom(factoryClass),
            "$factoryName must implement ${LanguageServerFactory::class.java.name}",
        )

        val mappings = document.getElementsByTagName("fileNamePatternMapping")
        assertEquals(1, mappings.length)
        val mapping = mappings.item(0).attributes
        assertEquals("*.fws", mapping.getNamedItem("patterns").nodeValue)
        assertEquals("fws", mapping.getNamedItem("languageId").nodeValue)
        val serverId = mapping.getNamedItem("serverId")
        assertNotNull(serverId)
        assertEquals("forge-web-script", serverId.nodeValue)

        val dapServers = document.getElementsByTagName("debugAdapterServer")
        assertEquals(1, dapServers.length)
        val dapServer = dapServers.item(0).attributes
        assertEquals("forge-web-script-dap", dapServer.getNamedItem("id").nodeValue)
        val dapFactoryName = dapServer.getNamedItem("factoryClass").nodeValue
        assertTrue(
            DebugAdapterDescriptorFactory::class.java.isAssignableFrom(Class.forName(dapFactoryName)),
            "$dapFactoryName must implement ${DebugAdapterDescriptorFactory::class.java.name}",
        )

        val fileTypes = document.getElementsByTagName("fileType")
        assertEquals(1, fileTypes.length)
        val fileType = fileTypes.item(0).attributes
        assertEquals("Forge Web Script", fileType.getNamedItem("name").nodeValue)
        assertEquals("fws", fileType.getNamedItem("language").nodeValue)
        assertEquals("fws", fileType.getNamedItem("extensions").nodeValue)
        val fileTypeClass = fileType.getNamedItem("implementationClass").nodeValue
        assertTrue(
            LanguageFileType::class.java.isAssignableFrom(Class.forName(fileTypeClass)),
            "$fileTypeClass must implement ${LanguageFileType::class.java.name}",
        )
        val fileTypeInstance = Class.forName(fileTypeClass).getDeclaredConstructor().newInstance() as LanguageFileType
        assertNotNull(fileTypeInstance.icon, "Forge Web Script file type must provide an icon")
        assertIcon(Path.of("src/main/resources/icons/fws.svg"), "fws.svg", expectedSizePx = 16.0)
        assertIcon(Path.of("src/main/resources/META-INF/pluginIcon.svg"), "pluginIcon.svg")
        assertIcon(Path.of("src/main/resources/META-INF/pluginIcon_dark.svg"), "pluginIcon_dark.svg")

        val dependencies = document.getElementsByTagName("depends")
        assertEquals(
            setOf("com.intellij.modules.platform", "com.intellij.modules.lang", "com.redhat.devtools.lsp4ij"),
            (0 until dependencies.length).map { dependencies.item(it).textContent }.toSet(),
            "the plugin must declare only its platform and LSP4IJ dependencies",
        )
        assertTrue(
            Files.readString(Path.of("gradle.properties")).contains("intellijPlatformPlugin = 0.20.1"),
            "LSP4IJ must use the current compatible release",
        )
        assertFalse(Files.exists(Path.of(".plugins/forge-web-script.kts")), "the project script must be absent")
        assertFalse(
            Files.exists(Path.of("src/main/resources/META-INF/flora.xml")),
            "the optional integration descriptor must be absent",
        )
        assertFalse(
            Files.exists(Path.of("src/main/kotlin/com/missionplatform/fws/FwsProjectSettings.kt")),
            "the project settings bridge must be absent",
        )
        val metadataFiles = Files.list(Path.of("src/main/resources/META-INF")).use { paths ->
            paths.map { it.fileName.toString() }.filter { it == "plugin.xml" || it.startsWith("pluginIcon") }.sorted().toList()
        }
        assertEquals(
            listOf("plugin.xml", "pluginIcon.svg", "pluginIcon_dark.svg"),
            metadataFiles,
            "the plugin descriptor and standard plugin icons are expected",
        )
        DAP_MODULES.forEach { module ->
            assertTrue(
                Files.exists(Path.of("../../packages/forge-web-script-dap/dist/$module")),
                "the shared DAP distribution must contain $module",
            )
        }
        val configurables = document.getElementsByTagName("applicationConfigurable")
        assertEquals(1, configurables.length)
        assertEquals(
            "com.missionplatform.fws.FwsSettingsConfigurable",
            configurables.item(0).attributes.getNamedItem("instance").nodeValue,
        )

        val actions = document.getElementsByTagName("action")
        val showReferencesAction = (0 until actions.length)
            .map { actions.item(it).attributes }
            .firstOrNull { it.getNamedItem("id")?.nodeValue == "forge-web-script.showReferences" }
        assertNotNull(showReferencesAction, "the language server's reference code lens command must be contributed")
        assertEquals(
            "com.redhat.devtools.lsp4ij.commands.editor.ShowReferencesAction",
            showReferencesAction.getNamedItem("class")?.nodeValue,
        )
    }

    @Test
    fun packagedResourcesContainOnlyTheNonFloraPlugin() {
        val classLoader = javaClass.classLoader
        val packagedDescriptor = assertNotNull(
            classLoader.getResource("META-INF/plugin.xml"),
            "plugin.xml must be packaged",
        )
        val packagedDocument = packagedDescriptor.openStream().use { input ->
            DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(input)
        }
        val dependencies = packagedDocument.getElementsByTagName("depends")
        assertEquals(
            setOf("com.intellij.modules.platform", "com.intellij.modules.lang", "com.redhat.devtools.lsp4ij"),
            (0 until dependencies.length).map { dependencies.item(it).textContent }.toSet(),
            "the packaged plugin must not declare Flora or other optional dependencies",
        )
        val ideaVersion = packagedDocument.getElementsByTagName("idea-version").item(0)
        assertNotNull(ideaVersion, "the packaged plugin must declare its minimum build")
        assertNull(ideaVersion.attributes.getNamedItem("until-build"), "packaged metadata must remain open-ended")
        assertNotNull(classLoader.getResource("icons/fws.svg"), "fws.svg must be packaged")
        assertNotNull(classLoader.getResource("META-INF/pluginIcon.svg"), "pluginIcon.svg must be packaged")
        assertNotNull(classLoader.getResource("META-INF/pluginIcon_dark.svg"), "pluginIcon_dark.svg must be packaged")
        DAP_MODULES.forEach { module ->
            assertNotNull(classLoader.getResource("dap/$module"), "DAP module must be packaged: $module")
        }

        assertNull(classLoader.getResource("META-INF/flora.xml"), "Flora metadata must not be packaged")
        assertNull(classLoader.getResource(".plugins/forge-web-script.kts"), "the Flora project script must not be packaged")
    }

    private companion object {
        val DAP_MODULES = listOf("main.js", "index.js", "protocol.js", "server.js")

        fun assertIcon(path: Path, name: String, expectedSizePx: Double = 40.0) {
            assertTrue(Files.exists(path), "$name must be present")
            val svg = Files.readString(path)
            val dimensions = Regex("""\b(width|height)="(\d+(?:\.\d+)?)"""")
                .findAll(svg)
                .associate { it.groupValues[1] to it.groupValues[2].toDouble() }
            assertEquals(expectedSizePx, dimensions["width"], "$name width must be ${expectedSizePx}px")
            assertEquals(expectedSizePx, dimensions["height"], "$name height must be ${expectedSizePx}px")
        }
    }
}
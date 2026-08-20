package com.missionplatform.fws

import java.io.InputStream
import java.io.OutputStream
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.TimeUnit
import kotlin.test.Test
import kotlin.test.assertTrue
import org.junit.jupiter.api.Assumptions.assumeTrue

/**
 * Boots the exact command-construction path used by [FwsLanguageServerDefinition] end to end: it
 * resolves the default, project-installed `forge-web-script-lsp` CLI from the real, pnpm-installed
 * `extensions/fws-vscode` sibling workspace, starts the resulting process, and performs a minimal
 * LSP handshake over stdio. This is the regression test for the "node <bare-command>" launch bug:
 * without a correct resolution strategy the process either fails to start or never answers, and this
 * test fails loudly instead of only checking command-line strings in isolation.
 *
 * The test is skipped (not failed) when the sibling workspace has not been installed with `pnpm
 * install`, or when no Node.js executable can be found, since the IntelliJ/Gradle project is
 * intentionally independent of the pnpm workspace and must still build and run its other tests.
 */
class FwsCommandLineSmokeTest {
    @Test
    fun launchesTheDefaultProjectInstalledServerAndAdvertisesCoreCapabilities() {
        val fwsVscodeRoot = Path.of(System.getProperty("user.dir")).toAbsolutePath().normalize().parent.resolve("fws-vscode")
        val shim = fwsVscodeRoot.resolve("node_modules/.bin/forge-web-script-lsp")
        assumeTrue(
            Files.exists(shim),
            "extensions/fws-vscode/node_modules is not installed (run 'pnpm install' at the repository root); skipping the LSP4IJ smoke test.",
        )

        val command = runCatching { FwsCommandLine.build(FwsLaunchSettings(), fwsVscodeRoot.toString()) }
            .getOrElse {
                assumeTrue(false, "Could not resolve a launchable forge-web-script-lsp command: ${it.message}")
                return
            }
        assertTrue(
            command.parametersList.list.any { it.contains("forge-web-script-lsp") },
            "expected the resolved command to target the forge-web-script-lsp entry point, got: ${command.commandLineString}",
        )

        val process = runCatching { command.createProcess() }
            .getOrElse {
                assumeTrue(false, "Could not start the resolved forge-web-script-lsp process: ${it.message}")
                return
            }
        val client = LspRpcClient(process)
        try {
            client.waitUntilReady(timeoutSeconds = 20)

            val rootUri = fwsVscodeRoot.toUri().toString().trimEnd('/')
            client.send(
                """{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"rootUri":"$rootUri",""" +
                    """"workspaceFolders":[{"uri":"$rootUri","name":"workspace"}],"capabilities":{}}}""",
            )
            val initializeResponse = client.readUntil(timeoutSeconds = 20) { it.contains("\"id\":1") }
            assertTrue(initializeResponse.contains("\"completionProvider\""), "completion capability missing: $initializeResponse")
            assertTrue(initializeResponse.contains("\"hoverProvider\":true"), "hover capability missing: $initializeResponse")
            assertTrue(initializeResponse.contains("\"semanticTokensProvider\""), "semantic tokens capability missing: $initializeResponse")

            client.send("""{"jsonrpc":"2.0","method":"initialized","params":{}}""")
            client.send(
                """{"jsonrpc":"2.0","method":"textDocument/didOpen","params":{"textDocument":""" +
                    """{"uri":"$rootUri/main.fws","languageId":"fws","version":1,"text":"export fn broken("}}}""",
            )
            val diagnostics = client.readUntil(timeoutSeconds = 20) { it.contains("textDocument/publishDiagnostics") }
            assertTrue(diagnostics.contains("FWS-PARSE-017"), "expected a stable FWS-* diagnostic code: $diagnostics")

            client.send(
                """{"jsonrpc":"2.0","id":2,"method":"textDocument/completion","params":{"textDocument":""" +
                    """{"uri":"$rootUri/main.fws"},"position":{"line":0,"character":10}}}""",
            )
            val completion = client.readUntil(timeoutSeconds = 20) { it.contains("\"id\":2") }
            assertTrue(!completion.contains("\"result\":null"), "expected non-null completion results: $completion")

            client.send(
                """{"jsonrpc":"2.0","id":3,"method":"textDocument/hover","params":{"textDocument":""" +
                    """{"uri":"$rootUri/main.fws"},"position":{"line":0,"character":10}}}""",
            )
            client.readUntil(timeoutSeconds = 20) { it.contains("\"id\":3") }

            client.send(
                """{"jsonrpc":"2.0","id":4,"method":"textDocument/semanticTokens/full","params":{"textDocument":""" +
                    """{"uri":"$rootUri/main.fws"}}}""",
            )
            val semanticTokens = client.readUntil(timeoutSeconds = 20) { it.contains("\"id\":4") }
            assertTrue(semanticTokens.contains("\"data\""), "expected semantic tokens data: $semanticTokens")

            client.send("""{"jsonrpc":"2.0","id":5,"method":"shutdown"}""")
            val shutdown = client.readUntil(timeoutSeconds = 20) { it.contains("\"id\":5") }
            assertTrue(shutdown.contains("\"result\":null"), "expected a clean shutdown response: $shutdown")

            client.send("""{"jsonrpc":"2.0","method":"exit"}""")
        } finally {
            client.close()
            process.destroy()
            if (!process.waitFor(5, TimeUnit.SECONDS)) process.destroyForcibly()
        }
    }
}

/** A minimal Content-Length-framed JSON-RPC client used to smoke test a real stdio LSP process. */
private class LspRpcClient(private val process: Process) {
    private val input: InputStream = process.inputStream
    private val output: OutputStream = process.outputStream

    fun waitUntilReady(timeoutSeconds: Long) {
        val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(timeoutSeconds)
        val stderr = process.errorStream
        val buffer = StringBuilder()
        while (System.nanoTime() < deadline) {
            if (!process.isAlive) {
                error("The forge-web-script-lsp process exited before becoming ready. stderr: $buffer")
            }
            if (stderr.available() > 0) {
                val chunk = ByteArray(stderr.available())
                val read = stderr.read(chunk)
                if (read > 0) buffer.append(String(chunk, 0, read, StandardCharsets.UTF_8))
                if (buffer.contains("language server ready")) return
            } else {
                Thread.sleep(20)
            }
        }
        error("Timed out waiting for forge-web-script-lsp readiness. stderr so far: $buffer")
    }

    fun send(json: String) {
        val bytes = json.toByteArray(StandardCharsets.UTF_8)
        output.write("Content-Length: ${bytes.size}\r\n\r\n".toByteArray(StandardCharsets.US_ASCII))
        output.write(bytes)
        output.flush()
    }

    fun readUntil(timeoutSeconds: Long, predicate: (String) -> Boolean): String {
        val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(timeoutSeconds)
        while (true) {
            val message = readMessage(deadline)
            if (predicate(message)) return message
        }
    }

    private fun readMessage(deadline: Long): String {
        var contentLength = -1
        while (true) {
            val line = readLine(deadline)
            if (line.isEmpty()) break
            val match = Regex("Content-Length:\\s*(\\d+)", RegexOption.IGNORE_CASE).find(line)
            if (match != null) contentLength = match.groupValues[1].toInt()
        }
        check(contentLength >= 0) { "The forge-web-script-lsp process sent a message without a Content-Length header." }
        val body = ByteArray(contentLength)
        var read = 0
        while (read < contentLength) {
            val n = readByte(deadline)
            body[read] = n.toByte()
            read++
        }
        return String(body, StandardCharsets.UTF_8)
    }

    private fun readLine(deadline: Long): String {
        val builder = StringBuilder()
        while (true) {
            val byte = readByte(deadline)
            if (byte == '\r'.code) continue
            if (byte == '\n'.code) return builder.toString()
            builder.append(byte.toChar())
        }
    }

    private fun readByte(deadline: Long): Int {
        while (true) {
            if (!process.isAlive && input.available() == 0) {
                error("The forge-web-script-lsp process exited unexpectedly while awaiting a response.")
            }
            if (input.available() > 0) {
                val value = input.read()
                if (value == -1) error("The forge-web-script-lsp process closed stdout unexpectedly.")
                return value
            }
            check(System.nanoTime() < deadline) { "Timed out waiting for a response from forge-web-script-lsp." }
            Thread.sleep(10)
        }
    }

    fun close() {
        runCatching { output.close() }
        runCatching { input.close() }
    }
}

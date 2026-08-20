import org.jetbrains.intellij.platform.gradle.IntelliJPlatformType
import org.gradle.api.tasks.Copy
import org.gradle.language.jvm.tasks.ProcessResources

plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "2.1.20"
    id("org.jetbrains.intellij.platform") version "2.2.1"
}

group = providers.gradleProperty("group").get()
version = providers.gradleProperty("version").get()

val repositoryRoot = project.projectDir.parentFile.parentFile
val dapDistribution = repositoryRoot.resolve("packages/forge-web-script-dap/dist")
val stagedDapDirectory = layout.buildDirectory.dir("generated/resources/dap")

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

kotlin {
    jvmToolchain(providers.gradleProperty("javaVersion").get().toInt())
}

dependencies {
    intellijPlatform {
        create(providers.gradleProperty("intellijPlatformType").get(), providers.gradleProperty("intellijPlatformVersion").get())
        plugin("com.redhat.devtools.lsp4ij", providers.gradleProperty("intellijPlatformPlugin").get())
    }
    testImplementation(kotlin("test"))
}

tasks {
    val stageForgeWebScriptDap by registering(Copy::class) {
        from(dapDistribution)
        into(stagedDapDirectory)
        include("**/*.js", "**/*.json")
    }

    named<ProcessResources>("processResources") {
        dependsOn(stageForgeWebScriptDap)
        from(stagedDapDirectory) {
            into("dap")
        }
    }

    test {
        useJUnitPlatform()
    }
}

intellijPlatform {
    pluginConfiguration {
        ideaVersion {
            sinceBuild = "243"
            untilBuild = provider { null }
        }
    }
    pluginVerification {
        ides {
            ide(
                IntelliJPlatformType.IntellijIdeaCommunity,
                providers.gradleProperty("intellijPlatformVersion").get(),
            )
            ide(
                IntelliJPlatformType.WebStorm,
                providers.gradleProperty("webStormVerificationVersion").get(),
            )
        }
    }
}
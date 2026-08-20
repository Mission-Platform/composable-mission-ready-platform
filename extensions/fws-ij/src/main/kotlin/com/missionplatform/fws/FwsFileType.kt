package com.missionplatform.fws

import com.intellij.openapi.fileTypes.LanguageFileType
import com.intellij.openapi.util.IconLoader
import javax.swing.Icon

class FwsFileType : LanguageFileType(FwsLanguage) {
    override fun getName(): String = "Forge Web Script"

    override fun getDescription(): String = "Forge Web Script source file"

    override fun getDefaultExtension(): String = "fws"

    override fun getIcon(): Icon = IconLoader.getIcon("/icons/fws.svg", FwsFileType::class.java)
}
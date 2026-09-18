package com.missionplatform.flint

import com.intellij.openapi.fileTypes.LanguageFileType
import com.intellij.openapi.util.IconLoader
import javax.swing.Icon

class FlintFileType : LanguageFileType(FlintLanguage) {
    override fun getName(): String = "Flint"

    override fun getDescription(): String = "Flint source file"

    override fun getDefaultExtension(): String = "flint"

    override fun getIcon(): Icon = IconLoader.getIcon("/icons/flint.svg", FlintFileType::class.java)
}
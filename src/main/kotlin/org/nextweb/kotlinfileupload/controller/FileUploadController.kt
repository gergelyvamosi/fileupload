package org.nextweb.kotlinfileupload.controller

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import java.io.IOException
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.util.stream.Collectors

@RestController
@RequestMapping("/api/upload")
class FileUploadController {

    private val uploadDirectory: Path = Paths.get("uploads") // Define your upload directory

    init {
        Files.createDirectories(uploadDirectory) // Ensure the directory exists
    }

    @PostMapping("/multiple")
    fun uploadMultipleFiles(@RequestParam("files") files: Array<MultipartFile>): ResponseEntity<List<String>> {
        val uploadedFiles = files.mapNotNull { file ->
            if (!file.isEmpty) {
                try {
                    val filePath = uploadDirectory.resolve(file.originalFilename!!)
                    Files.copy(file.inputStream, filePath)
                    println("filename: ${file.originalFilename}, filepath: ${filePath}")
                    file.originalFilename
                } catch (e: IOException) {
                    // Handle file saving error
                    null
                }
            } else {
                null
            }
        }.toList()

        return ResponseEntity(uploadedFiles, HttpStatus.OK)
    }
}
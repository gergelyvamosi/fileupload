package org.nextweb.kotlinfileupload

import org.springframework.context.annotation.ComponentScan
import org.springframework.context.annotation.Configuration

@Configuration
@ComponentScan("org.nextweb.kotlinfileupload.controller") // Scan these packages
class FileUploadConfiguration
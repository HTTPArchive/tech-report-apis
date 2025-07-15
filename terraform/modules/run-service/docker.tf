# Calculate hash of source files to determine if rebuild is needed
locals {
  source_files = fileset(path.root, "${var.source_directory}/*")
  source_hash  = substr(sha1(join("", [for f in local.source_files : filesha1(f)])), 0, 8)
}

# Build Docker image
resource "docker_image" "function_image" {
  name = "${var.region}-docker.pkg.dev/${var.project}/tech-report-api/${var.function_name}:${local.source_hash}"

  build {
    context    = var.source_directory
    dockerfile = "Dockerfile"
    platform   = "linux/amd64"
  }
}

resource "docker_registry_image" "registry_image" {
  name = docker_image.function_image.name
}
